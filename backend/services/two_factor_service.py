"""
Two-Factor Authentication service for email-based 2FA.
Provides secure 2FA implementation with email delivery.
"""

import os
import secrets
import hashlib
import hmac
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple, List

import bcrypt
from sqlalchemy import text

from utils.logging_config import get_logger
from services.email_service import email_service
from utils.postgres_auth import get_postgres_auth

logger = get_logger(__name__)


class TwoFactorError(Exception):
    """Two-factor authentication specific error."""
    pass


class TwoFactorService:
    """Email-based Two-Factor Authentication service."""

    def __init__(self, db_manager):
        self.db = db_manager
        self.auth_manager = get_postgres_auth()
        
        # 2FA configuration
        self.code_length = int(os.getenv('TWO_FACTOR_CODE_LENGTH', '6'))
        self.code_ttl_minutes = int(os.getenv('TWO_FACTOR_CODE_TTL_MINUTES', '10'))
        self.max_attempts = int(os.getenv('TWO_FACTOR_MAX_ATTEMPTS', '3'))
        self.lockout_minutes = int(os.getenv('TWO_FACTOR_LOCKOUT_MINUTES', '15'))
        
        # Signing key for code verification
        self.signing_key = os.getenv('TWO_FACTOR_SIGNING_KEY', '').encode()
        if not self.signing_key or len(self.signing_key) < 32:
            raise ValueError("TWO_FACTOR_SIGNING_KEY must be at least 32 characters")
            
        logger.info(f"TwoFactorService initialized with {self.code_ttl_minutes}min TTL")

    def is_enabled_for_user(self, user_id: str) -> bool:
        """Check if 2FA is enabled for a user."""
        try:
            with self.db.connection_manager.session_scope() as session:
                result = session.execute(
                    text("SELECT two_factor_enabled FROM users WHERE id = :user_id"),
                    {'user_id': user_id}
                ).fetchone()
                
                return bool(result and result[0])
        except Exception as e:
            logger.error(f"Error checking 2FA status for user {user_id}: {e}")
            return False

    def enable_2fa_for_user(self, user_id: str, user_email: str) -> Dict[str, Any]:
        """Enable 2FA for a user and send setup confirmation email."""
        try:
            # Generate a secret for this user (used for code generation)
            secret = secrets.token_hex(32)
            
            with self.db.connection_manager.session_scope() as session:
                # Enable 2FA and store secret
                session.execute(
                    text("""
                        UPDATE users 
                        SET two_factor_enabled = TRUE, 
                            two_factor_secret = :secret,
                            "updatedAt" = NOW()
                        WHERE id = :user_id
                    """),
                    {'user_id': user_id, 'secret': secret}
                )
                
                # Get user name for email
                user_data = session.execute(
                    text("SELECT name, email FROM users WHERE id = :user_id"),
                    {'user_id': user_id}
                ).fetchone()
                
                if not user_data:
                    raise TwoFactorError("User not found")
                
                user_name = user_data[0] or "User"
                
            # Send setup confirmation email
            try:
                self._send_2fa_setup_email(user_email, user_name)
                logger.info(f"2FA enabled for user {user_id[:8]}...")
            except Exception as e:
                logger.warning(f"Failed to send 2FA setup email: {e}")
            
            # Log the security event
            self.auth_manager._log_auth_event(
                user_id, 
                '2fa_enabled', 
                True,
                {'method': 'email'},
                None
            )
            
            return {
                'success': True,
                'message': '2FA has been enabled for your account',
                'backup_codes': self._generate_backup_codes(user_id)  # For future use
            }
            
        except Exception as e:
            logger.error(f"Error enabling 2FA for user {user_id}: {e}")
            self.auth_manager._log_auth_event(
                user_id, 
                '2fa_enable_failed', 
                False,
                {'error': str(e)},
                None
            )
            raise TwoFactorError(f"Failed to enable 2FA: {str(e)}")

    def disable_2fa_for_user(self, user_id: str, user_email: str) -> Dict[str, Any]:
        """Disable 2FA for a user."""
        try:
            with self.db.connection_manager.session_scope() as session:
                # Disable 2FA and clear secret
                session.execute(
                    text("""
                        UPDATE users 
                        SET two_factor_enabled = FALSE, 
                            two_factor_secret = NULL,
                            "updatedAt" = NOW()
                        WHERE id = :user_id
                    """),
                    {'user_id': user_id}
                )
                
                # Get user name for email
                user_data = session.execute(
                    text("SELECT name FROM users WHERE id = :user_id"),
                    {'user_id': user_id}
                ).fetchone()
                
                user_name = user_data[0] if user_data else "User"
                
            # Send disabled notification email
            try:
                self._send_2fa_disabled_email(user_email, user_name)
            except Exception as e:
                logger.warning(f"Failed to send 2FA disabled email: {e}")
            
            # Log the security event
            self.auth_manager._log_auth_event(
                user_id, 
                '2fa_disabled', 
                True,
                {'method': 'email'},
                None
            )
            
            logger.info(f"2FA disabled for user {user_id[:8]}...")
            
            return {
                'success': True,
                'message': '2FA has been disabled for your account'
            }
            
        except Exception as e:
            logger.error(f"Error disabling 2FA for user {user_id}: {e}")
            raise TwoFactorError(f"Failed to disable 2FA: {str(e)}")

    def send_2fa_code(self, user_id: str, user_email: str, ip_address: str = None) -> Dict[str, Any]:
        """Generate and send 2FA code via email."""
        try:
            # Check if 2FA is enabled
            if not self.is_enabled_for_user(user_id):
                raise TwoFactorError("2FA is not enabled for this user")
            
            # Check rate limiting
            if not self._check_2fa_rate_limit(user_id, ip_address):
                raise TwoFactorError("Too many 2FA code requests. Please wait before trying again.")
            
            # Generate 2FA code
            code = self._generate_2fa_code()
            code_hash = self._hash_2fa_code(code, user_id)
            expires_at = datetime.utcnow() + timedelta(minutes=self.code_ttl_minutes)
            
            with self.db.connection_manager.session_scope() as session:
                # Store the code hash (invalidate any existing codes)
                session.execute(
                    text("""
                        INSERT INTO two_factor_codes (id, user_id, code_hash, expires_at, attempts, ip_address, created_at)
                        VALUES (:id, :user_id, :code_hash, :expires_at, 0, :ip_address, NOW())
                        ON CONFLICT (user_id) 
                        DO UPDATE SET 
                            code_hash = :code_hash,
                            expires_at = :expires_at,
                            attempts = 0,
                            ip_address = :ip_address,
                            created_at = NOW()
                    """),
                    {
                        'id': secrets.token_hex(16),
                        'user_id': user_id,
                        'code_hash': code_hash,
                        'expires_at': expires_at,
                        'ip_address': ip_address
                    }
                )
                
                # Get user name for email
                user_data = session.execute(
                    text("SELECT name FROM users WHERE id = :user_id"),
                    {'user_id': user_id}
                ).fetchone()
                
                user_name = user_data[0] if user_data else "User"
            
            # Send 2FA code email
            success = self._send_2fa_code_email(user_email, user_name, code)
            
            if success:
                logger.info(f"2FA code sent to user {user_id[:8]}...")
                
                # Log the event
                self.auth_manager._log_auth_event(
                    user_id, 
                    '2fa_code_sent', 
                    True,
                    {'method': 'email', 'ip_address': ip_address},
                    ip_address
                )
                
                return {
                    'success': True,
                    'message': 'Verification code sent to your email',
                    'expires_in': self.code_ttl_minutes * 60
                }
            else:
                raise TwoFactorError("Failed to send verification code")
                
        except Exception as e:
            logger.error(f"Error sending 2FA code to user {user_id}: {e}")
            
            # Log the failure
            self.auth_manager._log_auth_event(
                user_id, 
                '2fa_code_send_failed', 
                False,
                {'error': str(e), 'ip_address': ip_address},
                ip_address
            )
            
            if isinstance(e, TwoFactorError):
                raise
            raise TwoFactorError(f"Failed to send verification code: {str(e)}")

    def verify_2fa_code(self, user_id: str, code: str, ip_address: str = None) -> Dict[str, Any]:
        """Verify 2FA code for a user."""
        try:
            # Check if 2FA is enabled
            if not self.is_enabled_for_user(user_id):
                raise TwoFactorError("2FA is not enabled for this user")
            
            with self.db.connection_manager.session_scope() as session:
                # Get the stored code hash
                result = session.execute(
                    text("""
                        SELECT id, code_hash, expires_at, attempts 
                        FROM two_factor_codes 
                        WHERE user_id = :user_id 
                        AND expires_at > NOW()
                        FOR UPDATE
                    """),
                    {'user_id': user_id}
                ).fetchone()
                
                if not result:
                    raise TwoFactorError("No valid verification code found. Please request a new code.")
                
                code_id, stored_hash, expires_at, attempts = result
                
                # Check if too many attempts
                if attempts >= self.max_attempts:
                    raise TwoFactorError("Too many failed attempts. Please request a new verification code.")
                
                # Verify the code
                code_hash = self._hash_2fa_code(code, user_id)
                
                if not hmac.compare_digest(code_hash, stored_hash):
                    # Increment attempts
                    session.execute(
                        text("UPDATE two_factor_codes SET attempts = attempts + 1 WHERE id = :code_id"),
                        {'code_id': code_id}
                    )
                    
                    # Log failed attempt
                    self.auth_manager._log_auth_event(
                        user_id, 
                        '2fa_code_verify_failed', 
                        False,
                        {'reason': 'invalid_code', 'attempts': attempts + 1, 'ip_address': ip_address},
                        ip_address
                    )
                    
                    remaining_attempts = self.max_attempts - (attempts + 1)
                    if remaining_attempts > 0:
                        raise TwoFactorError(f"Invalid verification code. {remaining_attempts} attempts remaining.")
                    else:
                        raise TwoFactorError("Invalid verification code. Maximum attempts exceeded. Please request a new code.")
                
                # Code is valid - consume it
                session.execute(
                    text("DELETE FROM two_factor_codes WHERE id = :code_id"),
                    {'code_id': code_id}
                )
                
                # Log successful verification
                self.auth_manager._log_auth_event(
                    user_id, 
                    '2fa_code_verified', 
                    True,
                    {'method': 'email', 'ip_address': ip_address},
                    ip_address
                )
                
                logger.info(f"2FA code verified for user {user_id[:8]}...")
                
                return {
                    'success': True,
                    'message': 'Verification code confirmed',
                    'verified_at': datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            logger.error(f"Error verifying 2FA code for user {user_id}: {e}")
            
            if isinstance(e, TwoFactorError):
                raise
            raise TwoFactorError(f"Failed to verify code: {str(e)}")

    def _generate_2fa_code(self) -> str:
        """Generate a random numeric 2FA code."""
        # Generate a cryptographically secure random code
        code_int = secrets.randbelow(10 ** self.code_length)
        return str(code_int).zfill(self.code_length)

    def _hash_2fa_code(self, code: str, user_id: str) -> str:
        """Hash 2FA code with user-specific salt."""
        # Create HMAC with user_id as additional context
        message = f"{code}:{user_id}:{int(time.time() // 300)}"  # 5-minute time window
        return hmac.new(self.signing_key, message.encode(), hashlib.sha256).hexdigest()

    def _check_2fa_rate_limit(self, user_id: str, ip_address: str = None) -> bool:
        """Check rate limiting for 2FA code requests."""
        try:
            with self.db.connection_manager.session_scope() as session:
                # Check user-based rate limit (5 codes per hour)
                user_count = session.execute(
                    text("""
                        SELECT COUNT(*) FROM two_factor_codes
                        WHERE user_id = :user_id
                        AND created_at > NOW() - INTERVAL '1 hour'
                    """),
                    {'user_id': user_id}
                ).scalar()
                
                if int(user_count or 0) >= 5:
                    return False
                
                # Check IP-based rate limit (20 codes per hour)
                if ip_address:
                    ip_count = session.execute(
                        text("""
                            SELECT COUNT(*) FROM two_factor_codes
                            WHERE ip_address = :ip_address
                            AND created_at > NOW() - INTERVAL '1 hour'
                        """),
                        {'ip_address': ip_address}
                    ).scalar()
                    
                    if int(ip_count or 0) >= 20:
                        return False
                
                return True
                
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            return True  # Allow on error to avoid blocking legitimate users

    def _generate_backup_codes(self, user_id: str) -> List[str]:
        """Generate backup codes for 2FA recovery (future implementation)."""
        # This would generate recovery codes that can be used if email is unavailable
        # For now, return empty list as it's not implemented
        return []

    def _send_2fa_setup_email(self, email: str, user_name: str) -> bool:
        """Send 2FA setup confirmation email."""
        subject = "Two-Factor Authentication Enabled - JewGo"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h2 style="color: #28a745; margin-top: 0;">🔒 Two-Factor Authentication Enabled</h2>
                <p>Hello {user_name},</p>
                <p>Two-factor authentication has been successfully enabled for your JewGo account.</p>
                
                <div style="background-color: #e9ecef; padding: 15px; border-radius: 4px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">What this means:</h3>
                    <ul>
                        <li>Your account is now more secure</li>
                        <li>You'll receive a verification code via email when signing in</li>
                        <li>This adds an extra layer of protection to your account</li>
                    </ul>
                </div>
                
                <p>If you didn't enable 2FA, please contact support immediately.</p>
                
                <p style="color: #666; margin-top: 30px;">
                    <strong>Security Tip:</strong> Keep your email account secure as it's now part of your 2FA process.
                </p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Two-Factor Authentication Enabled - JewGo
        
        Hello {user_name},
        
        Two-factor authentication has been successfully enabled for your JewGo account.
        
        What this means:
        - Your account is now more secure
        - You'll receive a verification code via email when signing in
        - This adds an extra layer of protection to your account
        
        If you didn't enable 2FA, please contact support immediately.
        
        Security Tip: Keep your email account secure as it's now part of your 2FA process.
        """
        
        return email_service.send_email(
            to_email=email,
            subject=subject,
            html_body=html_body,
            text_body=text_body
        )

    def _send_2fa_disabled_email(self, email: str, user_name: str) -> bool:
        """Send 2FA disabled notification email."""
        subject = "Two-Factor Authentication Disabled - JewGo"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; border: 1px solid #ffeaa7;">
                <h2 style="color: #856404; margin-top: 0;">⚠️ Two-Factor Authentication Disabled</h2>
                <p>Hello {user_name},</p>
                <p>Two-factor authentication has been disabled for your JewGo account.</p>
                
                <div style="background-color: #f8d7da; padding: 15px; border-radius: 4px; margin: 20px 0; border: 1px solid #f5c6cb;">
                    <p style="margin: 0; color: #721c24;">
                        <strong>Security Notice:</strong> Your account is now less secure. We recommend re-enabling 2FA for better protection.
                    </p>
                </div>
                
                <p>If you didn't disable 2FA, please contact support immediately and change your password.</p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Two-Factor Authentication Disabled - JewGo
        
        Hello {user_name},
        
        Two-factor authentication has been disabled for your JewGo account.
        
        Security Notice: Your account is now less secure. We recommend re-enabling 2FA for better protection.
        
        If you didn't disable 2FA, please contact support immediately and change your password.
        """
        
        return email_service.send_email(
            to_email=email,
            subject=subject,
            html_body=html_body,
            text_body=text_body
        )

    def _send_2fa_code_email(self, email: str, user_name: str, code: str) -> bool:
        """Send 2FA verification code email."""
        subject = f"Your JewGo Verification Code: {code}"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333; margin-top: 0;">🔐 Your Verification Code</h2>
                <p>Hello {user_name},</p>
                <p>Here's your verification code for signing in to JewGo:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <div style="background-color: #007bff; color: white; padding: 15px 25px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 5px; display: inline-block;">
                        {code}
                    </div>
                </div>
                
                <p>This code will expire in {self.code_ttl_minutes} minutes.</p>
                
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; border: 1px solid #ffeaa7;">
                    <p style="margin: 0; color: #856404;">
                        <strong>Security Note:</strong> Never share this code with anyone. JewGo will never ask for your verification code.
                    </p>
                </div>
                
                <p>If you didn't request this code, please ignore this email or contact support if you're concerned about your account security.</p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Your JewGo Verification Code: {code}
        
        Hello {user_name},
        
        Here's your verification code for signing in to JewGo:
        
        {code}
        
        This code will expire in {self.code_ttl_minutes} minutes.
        
        Security Note: Never share this code with anyone. JewGo will never ask for your verification code.
        
        If you didn't request this code, please ignore this email or contact support if you're concerned about your account security.
        """
        
        return email_service.send_email(
            to_email=email,
            subject=subject,
            html_body=html_body,
            text_body=text_body
        )


# Helper function to get TwoFactorService instance
def get_two_factor_service():
    """Get TwoFactorService instance with database manager."""
    from flask import current_app
    db_manager = current_app.config.get('DB_MANAGER')
    if not db_manager:
        raise RuntimeError("Database manager not configured")
    return TwoFactorService(db_manager)
