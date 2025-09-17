"""
Magic Link authentication service.
Production-ready with race condition protection and rate limits.
"""

import os
import secrets
import hashlib
import hmac
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple

import bcrypt
from sqlalchemy import text

from utils.logging_config import get_logger
from utils.postgres_auth import get_postgres_auth
from services.email_service import email_service

logger = get_logger(__name__)


class MagicLinkError(Exception):
    """Magic link specific error."""
    pass


class MagicLinkService:
    """Magic link authentication service."""

    def __init__(self, db_manager):
        self.db = db_manager
        self.auth_manager = get_postgres_auth()

        # Magic link signing key - REQUIRED, no fallbacks
        self.signing_key = os.getenv('MAGIC_LINK_SIGNING_KEY', '').encode()
        if not self.signing_key or len(self.signing_key) < 32:
            raise ValueError("MAGIC_LINK_SIGNING_KEY must be at least 32 characters")

        self.ttl_minutes = int(os.getenv('MAGIC_LINK_TTL_MIN', '20'))
        self.base_url = os.getenv('MAGIC_LINK_BASE_URL', 'http://localhost:3000/auth/magic')

        logger.info(f"MagicLinkService initialized with {self.ttl_minutes}min TTL")

    def create_and_send_magic_link(self, email: str, return_to: str = '/', ip_address: str | None = None) -> bool:
        """Create magic link and send via email."""
        email = (email or '').lower().strip()

        if '@' not in email or '.' not in email:
            raise MagicLinkError("Invalid email format")

        if not self._check_rate_limit(email, ip_address):
            raise MagicLinkError("Too many magic link requests. Please wait before trying again.")

        try:
            with self.db.connection_manager.session_scope() as session:
                # Find or create user
                user = session.execute(
                    text("SELECT id, name, email_verified FROM users WHERE email = :email"),
                    {'email': email},
                ).fetchone()

                user_name = "User"
                if not user:
                    # Create unverified user
                    user_id = secrets.token_hex(16)
                    user_name = email.split('@')[0]

                    session.execute(
                        text(
                            """
                            INSERT INTO users (id, name, email, email_verified, is_guest, "createdAt", "updatedAt")
                            VALUES (:user_id, :name, :email, FALSE, FALSE, NOW(), NOW())
                            """
                        ),
                        {
                            'user_id': user_id,
                            'name': user_name,
                            'email': email,
                        },
                    )

                    # Add default user role
                    session.execute(
                        text(
                            """
                            INSERT INTO user_roles (user_id, role, level, granted_at, is_active)
                            VALUES (:user_id, 'user', 1, NOW(), TRUE)
                            """
                        ),
                        {'user_id': user_id},
                    )

                    logger.info(
                        f"Created unverified user for magic link: {email[:3]}***@{email.split('@')[1]}"
                    )
                else:
                    user_name = user[1] or email.split('@')[0]

                # Generate magic link token
                link_id, token, token_hash = self._generate_magic_token(email)

                # Store in database
                session.execute(
                    text(
                        """
                        INSERT INTO magic_links_v5 (id, email, token_hash, expires_at, ip_address, user_agent)
                        VALUES (:id, :email, :token_hash, :expires_at, :ip_address, :user_agent)
                        """
                    ),
                    {
                        'id': link_id,
                        'email': email,
                        'token_hash': token_hash,
                        'expires_at': datetime.utcnow() + timedelta(minutes=self.ttl_minutes),
                        'ip_address': ip_address,
                        'user_agent': None,
                    },
                )

                # Send email
                magic_url = f"{self.base_url}?token={token}&email={email}&rt={return_to or '/'}"
                success = self._send_magic_link_email(email, magic_url, user_name)

                if success:
                    logger.info(
                        f"Magic link sent successfully to {email[:3]}***@{email.split('@')[1]}"
                    )
                    return True
                else:
                    logger.error(
                        f"Failed to send magic link email to {email[:3]}***@{email.split('@')[1]}"
                    )
                    return False

        except Exception as e:
            logger.error(f"Magic link creation failed: {e}")
            raise MagicLinkError(f"Failed to create magic link: {str(e)}")

    def consume_magic_link(self, token: str, email: str) -> Dict[str, Any]:
        """Consume magic link and return user data - race condition safe."""
        email = (email or '').lower().strip()

        try:
            # Parse and verify token first (before any DB changes)
            if not token or '.' not in token:
                raise MagicLinkError("Invalid magic link format")

            signature, payload = token.split('.', 1)
            parts = payload.split('|')
            if len(parts) != 3:
                raise MagicLinkError("Invalid magic link format")

            token_email, timestamp, token_link_id = parts

            if token_email != email:
                raise MagicLinkError("Invalid magic link")

            # Verify HMAC signature
            expected_signature = hmac.new(self.signing_key, payload.encode(), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(signature, expected_signature):
                raise MagicLinkError("Invalid magic link token")

            with self.db.connection_manager.session_scope() as session:
                # Race-safe: lookup by exact link_id with FOR UPDATE
                result = session.execute(
                    text(
                        """
                        SELECT id, token_hash, email FROM magic_links_v5
                        WHERE id = :link_id
                          AND email = :email
                          AND expires_at > NOW()
                          AND (used_at IS NULL OR is_used = FALSE)
                        FOR UPDATE
                        """
                    ),
                    {'link_id': token_link_id, 'email': email},
                ).fetchone()

                if not result:
                    raise MagicLinkError("Invalid or expired magic link")

                link_id, stored_hash, db_email = result

                # Verify token hash
                if not bcrypt.checkpw(token.encode(), stored_hash.encode()):
                    raise MagicLinkError("Invalid magic link token")

                # Atomic consume - only if not already consumed
                consumed = session.execute(
                    text(
                        """
                        UPDATE magic_links_v5
                        SET used_at = NOW(), is_used = TRUE
                        WHERE id = :link_id AND (used_at IS NULL OR is_used = FALSE)
                        RETURNING id
                        """
                    ),
                    {'link_id': link_id},
                ).fetchone()

                if not consumed:
                    raise MagicLinkError("Magic link already used")

                # Invalidate other pending links for this email (security)
                session.execute(
                    text(
                        """
                        UPDATE magic_links_v5
                        SET consumed_at = NOW()
                        WHERE email = :email AND consumed_at IS NULL AND id != :link_id
                        """
                    ),
                    {'email': email, 'link_id': link_id},
                )

                # Mark email as verified and get user data
                session.execute(
                    text("UPDATE users SET email_verified = TRUE WHERE email = :email"),
                    {'email': email},
                )

                # Get complete user data
                user_data = session.execute(
                    text(
                        """
                        SELECT u.id, u.name, u.email, u.email_verified,
                               COALESCE(
                                   JSON_AGG(
                                       JSON_BUILD_OBJECT(
                                           'role', ur.role,
                                           'level', ur.level,
                                           'granted_at', ur.granted_at
                                       )
                                   ) FILTER (WHERE ur.is_active = TRUE),
                                   '[]'::json
                               ) AS roles
                        FROM users u
                        LEFT JOIN user_roles ur ON u.id = ur.user_id
                        WHERE u.email = :email
                        GROUP BY u.id, u.name, u.email, u.email_verified
                        """
                    ),
                    {'email': email},
                ).fetchone()

                if not user_data:
                    raise MagicLinkError("User not found after magic link verification")

                logger.info(f"Magic link consumed successfully for {email[:3]}***@{email.split('@')[1]}")

                return {
                    'id': user_data[0],
                    'name': user_data[1],
                    'email': user_data[2],
                    'email_verified': user_data[3],
                    'roles': user_data[4],
                }

        except Exception as e:
            # Audit log magic link failures
            try:
                self.auth_manager._log_auth_event(
                    None,
                    'magic_link_failed',
                    False,
                    {'email': (email[:3] + '***@' + email.split('@')[1]) if '@' in email else email, 'error': str(e)[:100]},
                    None,
                )
            except Exception:
                pass

            logger.error(f"Magic link consumption failed: {e}")
            if isinstance(e, MagicLinkError):
                raise
            raise MagicLinkError(f"Failed to consume magic link: {str(e)}")

    def _generate_magic_token(self, email: str) -> Tuple[str, str, str]:
        """Generate magic link token and hash."""
        import uuid

        link_id = str(uuid.uuid4())
        timestamp = str(int(time.time()))

        payload = f"{email}|{timestamp}|{link_id}"
        signature = hmac.new(self.signing_key, payload.encode(), hashlib.sha256).hexdigest()
        token = f"{signature}.{payload}"
        token_hash = bcrypt.hashpw(token.encode(), bcrypt.gensalt()).decode()

        return link_id, token, token_hash

    def _check_rate_limit(self, email: str, ip_address: str | None = None) -> bool:
        """Check rate limiting for magic link requests."""
        try:
            with self.db.connection_manager.session_scope() as session:
                # Check email-based rate limit (5 per hour)
                email_count = session.execute(
                    text(
                        """
                        SELECT COUNT(*) FROM magic_links_v5
                        WHERE email = :email
                          AND created_at > NOW() - INTERVAL '1 hour'
                        """
                    ),
                    {'email': email},
                ).scalar()

                if int(email_count or 0) >= 5:
                    return False

                # Check IP-based rate limit (20 per hour)
                if ip_address:
                    ip_count = session.execute(
                        text(
                            """
                            SELECT COUNT(*) FROM magic_links_v5
                            WHERE ip_address = :ip_address
                              AND created_at > NOW() - INTERVAL '1 hour'
                            """
                        ),
                        {'ip_address': ip_address},
                    ).scalar()

                    if int(ip_count or 0) >= 20:
                        return False

                return True

        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            return True

    def _send_magic_link_email(self, email: str, magic_url: str, user_name: str) -> bool:
        """Send magic link email."""
        subject = "Your Magic Link - JewGo"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333; margin-top: 0;">🔗 Your Magic Link</h2>
                <p>Hello {user_name},</p>
                <p>Click the button below to sign in to your JewGo account:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{magic_url}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Sign In to JewGo</a>
                </div>
                <p>Or copy and paste this link: {magic_url}</p>
                <p style="color: #666; margin-top: 30px;">
                    <strong>Security Note:</strong> This link expires in {self.ttl_minutes} minutes and can only be used once.
                </p>
            </div>
        </body>
        </html>
        """

        text_body = f"""
        Your Magic Link - JewGo

        Hello {user_name},

        Click this link to sign in: {magic_url}

        This link expires in {self.ttl_minutes} minutes.
        """

        return email_service.send_email(
            to_email=email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
        )

