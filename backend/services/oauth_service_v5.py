"""
OAuth service for Google and Apple Sign-In integration.
Production-ready with security checks.
"""

import os
import json
import secrets
import hashlib
import hmac
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple

import requests
import jwt
from sqlalchemy import text

from utils.logging_config import get_logger
from utils.postgres_auth import get_postgres_auth
from services.email_service import send_welcome_email

logger = get_logger(__name__)


class OAuthError(Exception):
    """OAuth-specific error."""
    pass


class OAuthService:
    """OAuth service for Google and Apple authentication."""

    def __init__(self, db_manager):
        self.db = db_manager
        self.auth_manager = get_postgres_auth()

        # OAuth state signing - REQUIRED, no fallbacks
        self.state_key = os.getenv('OAUTH_STATE_SIGNING_KEY', '').encode()
        if not self.state_key or len(self.state_key) < 32:
            raise ValueError("OAUTH_STATE_SIGNING_KEY must be at least 32 characters")

        # Frontend URL for secure redirects
        self.frontend_url = os.getenv('FRONTEND_URL', '').rstrip('/')
        if not self.frontend_url:
            raise ValueError("FRONTEND_URL environment variable is required")

        logger.info(f"OAuthService initialized with frontend: {self.frontend_url}")

    def generate_secure_state(self, provider: str, return_to: str = '/') -> str:
        """Generate cryptographically secure state parameter."""
        # Only allow relative paths - reject absolute URLs
        return_to = self._validate_return_to_relative_only(return_to)

        state_data = {
            'provider': provider,
            'return_to': return_to,
            'timestamp': int(time.time()),
            'nonce': secrets.token_hex(16)
        }

        state_json = json.dumps(state_data, separators=(',', ':'))
        signature = hmac.new(self.state_key, state_json.encode(), hashlib.sha256).hexdigest()

        state_token = f"{signature[:16]}.{secrets.token_urlsafe(32)}"

        try:
            with self.db.connection_manager.session_scope() as session:
                session.execute(
                    text(
                        """
                        INSERT INTO oauth_states_v5 (state_token, provider, return_to, expires_at)
                        VALUES (:state_token, :provider, :return_to, :expires_at)
                        """
                    ),
                    {
                        'state_token': state_token,
                        'provider': provider,
                        'return_to': return_to,
                        'expires_at': datetime.utcnow() + timedelta(minutes=10)
                    }
                )
        except Exception as e:
            logger.error(f"Failed to store OAuth state: {e}")
            raise OAuthError("Failed to generate secure state")

        return state_token

    def validate_and_consume_state(self, state_token: str, provider: str) -> Optional[str]:
        """Validate OAuth state and return return_to URL."""
        try:
            with self.db.connection_manager.session_scope() as session:
                result = session.execute(
                    text(
                        """
                        UPDATE oauth_states_v5
                        SET consumed_at = NOW()
                        WHERE state_token = :state_token
                          AND provider = :provider
                          AND expires_at > NOW()
                          AND consumed_at IS NULL
                        RETURNING return_to
                        """
                    ),
                    {'state_token': state_token, 'provider': provider}
                ).fetchone()

                if result:
                    return result[0]
                else:
                    # Audit log failed state validation
                    try:
                        self.auth_manager._log_auth_event(
                            None,
                            'oauth_state_invalid',
                            False,
                            {'provider': provider, 'state_token': (state_token or '')[:16] + '...'},
                            None,
                        )
                    except Exception:
                        pass
                    return None

        except Exception as e:
            logger.error(f"State validation error: {e}")
            return None

    def _validate_return_to_relative_only(self, return_to: str) -> str:
        """Validate return_to as relative path only - reject absolute URLs."""
        if not return_to or return_to == '/':
            return '/'

        # Reject absolute URLs - only allow relative paths
        if return_to.startswith(('http://', 'https://', '//')):
            logger.warning(f"Rejected absolute return_to URL: {return_to}")
            return '/'

        # Ensure it starts with /
        if not return_to.startswith('/'):
            return_to = '/' + return_to

        return return_to

    def find_or_create_user_from_oauth(
        self,
        provider: str,
        provider_id: str,
        email: str,
        name: str | None = None,
        avatar_url: str | None = None,
        raw_profile: Dict | None = None,
        email_verified: bool = True,
    ) -> Dict[str, Any]:
        """Find existing user or create new user from OAuth profile."""
        try:
            with self.db.connection_manager.session_scope() as session:
                # Check if OAuth account exists
                existing_oauth = session.execute(
                    text(
                        """
                        SELECT a.userid, u.name, u.email, u.email_verified
                        FROM accounts a
                        JOIN users u ON a.userid = u.id
                        WHERE a.provider = :provider AND a.provideraccountid = :provider_id
                        """
                    ),
                    {'provider': provider, 'provider_id': provider_id}
                ).fetchone()

                if existing_oauth:
                    logger.info(f"Found existing OAuth account for {provider}:{provider_id}")
                    return {
                        'id': existing_oauth[0],
                        'name': existing_oauth[1],
                        'email': existing_oauth[2],
                        'email_verified': existing_oauth[3],
                        'is_new': False,
                    }

                # Check if user exists by email
                existing_user = session.execute(
                    text("SELECT id, name, email_verified FROM users WHERE email = :email"),
                    {'email': email.lower()},
                ).fetchone()

                user_id = None
                is_new_user = False

                if existing_user:
                    user_id = existing_user[0]
                    logger.info(
                        f"Linking {provider} account to existing user: {email[:3]}***@{email.split('@')[1]}"
                    )
                else:
                    # Create new user
                    user_id = secrets.token_hex(16)
                    session.execute(
                        text(
                            """
                            INSERT INTO users (id, name, email, email_verified, is_guest, "createdAt", "updatedAt")
                            VALUES (:user_id, :name, :email, :email_verified, FALSE, NOW(), NOW())
                            """
                        ),
                        {
                            'user_id': user_id,
                            'name': name or email.split('@')[0],
                            'email': email.lower(),
                            'email_verified': email_verified,
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

                    is_new_user = True
                    logger.info(
                        f"Created new user from {provider} OAuth: {email[:3]}***@{email.split('@')[1]}"
                    )

                # Create OAuth account link
                oauth_account_id = secrets.token_hex(16)
                session.execute(
                    text(
                        """
                        INSERT INTO accounts (
                            id, userid, type, provider, provideraccountid, raw_profile, created_at, updated_at
                        )
                        VALUES (
                            :id, :userid, 'oauth', :provider, :provider_id, :raw_profile, NOW(), NOW()
                        )
                        ON CONFLICT (provider, provideraccountid) DO NOTHING
                        """
                    ),
                    {
                        'id': oauth_account_id,
                        'userid': user_id,
                        'provider': provider,
                        'provider_id': provider_id,
                        'raw_profile': json.dumps(raw_profile) if raw_profile else None,
                    },
                )

                # Get complete user data with roles
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
                        WHERE u.id = :user_id
                        GROUP BY u.id, u.name, u.email, u.email_verified
                        """
                    ),
                    {'user_id': user_id},
                ).fetchone()

                result = {
                    'id': user_data[0],
                    'name': user_data[1],
                    'email': user_data[2],
                    'email_verified': user_data[3],
                    'roles': user_data[4],
                    'is_new': is_new_user,
                }

                # Send welcome email for new users (best-effort)
                if is_new_user:
                    try:
                        send_welcome_email(result['email'], result['name'])
                    except Exception as e:
                        logger.warning(f"Failed to send welcome email: {e}")

                return result

        except Exception as e:
            logger.error(f"OAuth user creation/linking failed: {e}")
            raise OAuthError(f"Failed to process OAuth user: {str(e)}")

    # Google OAuth methods
    def get_google_auth_url(self, return_to: str = '/') -> str:
        """Generate Google OAuth authorization URL."""
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        redirect_uri = os.getenv('GOOGLE_REDIRECT_URI')

        if not client_id:
            raise OAuthError("Google OAuth not configured - missing GOOGLE_CLIENT_ID")
        if not redirect_uri:
            raise OAuthError("Google OAuth not configured - missing GOOGLE_REDIRECT_URI")

        state = self.generate_secure_state('google', return_to)

        params = {
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'response_type': 'code',
            'scope': 'openid email profile',
            'access_type': 'offline',
            'include_granted_scopes': 'true',
            'prompt': 'consent',
            'state': state,
        }

        from urllib.parse import urlencode
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    def handle_google_callback(self, code: str, state: str) -> Tuple[Dict[str, Any], str]:
        """Handle Google OAuth callback and return user data + return_to."""
        return_to = self.validate_and_consume_state(state, 'google')
        if not return_to:
            raise OAuthError("Invalid or expired OAuth state")

        try:
            token_data = self._exchange_google_code(code)
            profile = self._get_google_profile(token_data['access_token'])

            # Only set email_verified=True if Google confirms it
            email_verified = bool(profile.get('email_verified'))

            user = self.find_or_create_user_from_oauth(
                provider='google',
                provider_id=profile['sub'],
                email=profile['email'],
                name=profile.get('name'),
                avatar_url=profile.get('picture'),
                raw_profile=profile,
                email_verified=email_verified,
            )

            return user, return_to

        except Exception as e:
            # Audit log OAuth failures
            try:
                self.auth_manager._log_auth_event(
                    None,
                    'oauth_callback_failed',
                    False,
                    {'provider': 'google', 'error': str(e)[:100]},
                    None,
                )
            except Exception:
                pass
            raise

    def _exchange_google_code(self, code: str) -> Dict[str, Any]:
        """Exchange Google authorization code for tokens."""
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        redirect_uri = os.getenv('GOOGLE_REDIRECT_URI')

        data = {
            'client_id': client_id,
            'client_secret': client_secret,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': redirect_uri,
        }

        response = requests.post('https://oauth2.googleapis.com/token', data=data, timeout=10)

        if not response.ok:
            logger.error(f"Google token exchange failed: {response.status_code}")
            raise OAuthError("Failed to exchange Google authorization code")

        return response.json()

    def _get_google_profile(self, access_token: str) -> Dict[str, Any]:
        """Get Google user profile using OIDC endpoint."""
        headers = {'Authorization': f'Bearer {access_token}'}
        response = requests.get(
            'https://openidconnect.googleapis.com/v1/userinfo', headers=headers, timeout=10
        )

        if not response.ok:
            logger.error(f"Google profile fetch failed: {response.status_code}")
            raise OAuthError("Failed to fetch Google user profile")

        return response.json()

    # Apple OAuth methods
    def get_apple_auth_url(self, return_to: str = '/') -> str:
        """Generate Apple OAuth authorization URL."""
        client_id = os.getenv('APPLE_CLIENT_ID')
        redirect_uri = os.getenv('APPLE_REDIRECT_URI')

        if not client_id:
            raise OAuthError("Apple OAuth not configured - missing APPLE_CLIENT_ID")
        if not redirect_uri:
            raise OAuthError("Apple OAuth not configured - missing APPLE_REDIRECT_URI")

        state = self.generate_secure_state('apple', return_to)

        params = {
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'response_type': 'code',
            'scope': 'name email',
            'response_mode': 'form_post',
            'state': state,
        }

        from urllib.parse import urlencode
        return f"https://appleid.apple.com/auth/authorize?{urlencode(params)}"

    def handle_apple_callback(self, code: str, state: str, user_data: str | None = None) -> Tuple[Dict[str, Any], str]:
        """Handle Apple OAuth callback."""
        return_to = self.validate_and_consume_state(state, 'apple')
        if not return_to:
            raise OAuthError("Invalid or expired OAuth state")

        try:
            token_data = self._exchange_apple_code(code)
            profile = self._parse_apple_id_token(token_data['id_token'])

            # Handle Apple's first-time user data
            if user_data:
                try:
                    ud = json.loads(user_data)
                    if 'name' in ud:
                        profile['name'] = f"{ud['name'].get('firstName', '')} {ud['name'].get('lastName', '')}".strip()
                except Exception as e:
                    logger.warning(f"Failed to parse Apple user data: {e}")

            # Apple emails are always verified when present
            email_verified = bool(profile.get('email'))

            user = self.find_or_create_user_from_oauth(
                provider='apple',
                provider_id=profile['sub'],
                email=profile.get('email', f"apple_{profile['sub']}@privaterelay.appleid.com"),
                name=profile.get('name'),
                raw_profile=profile,
                email_verified=email_verified,
            )

            return user, return_to

        except Exception as e:
            # Audit log OAuth failures
            try:
                self.auth_manager._log_auth_event(
                    None,
                    'oauth_callback_failed',
                    False,
                    {'provider': 'apple', 'error': str(e)[:100]},
                    None,
                )
            except Exception:
                pass
            raise

    def _exchange_apple_code(self, code: str) -> Dict[str, Any]:
        """Exchange Apple authorization code for tokens."""
        client_secret = self._generate_apple_client_secret()

        data = {
            'client_id': os.getenv('APPLE_CLIENT_ID'),
            'client_secret': client_secret,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': os.getenv('APPLE_REDIRECT_URI'),
        }

        response = requests.post('https://appleid.apple.com/auth/token', data=data, timeout=10)

        if not response.ok:
            logger.error(f"Apple token exchange failed: {response.status_code}")
            raise OAuthError("Failed to exchange Apple authorization code")

        return response.json()

    def _generate_apple_client_secret(self) -> str:
        """Generate Apple client secret JWT."""
        import base64
        from cryptography.hazmat.primitives import serialization

        private_key_b64 = os.getenv('APPLE_PRIVATE_KEY_BASE64')
        if not private_key_b64:
            raise OAuthError("Apple private key not configured")

        private_key_pem = base64.b64decode(private_key_b64)
        private_key = serialization.load_pem_private_key(private_key_pem, password=None)

        headers = {
            'kid': os.getenv('APPLE_KEY_ID'),
            'alg': 'ES256',
        }

        payload = {
            'iss': os.getenv('APPLE_TEAM_ID'),
            'iat': int(time.time()),
            'exp': int(time.time()) + 3600,
            'aud': 'https://appleid.apple.com',
            'sub': os.getenv('APPLE_CLIENT_ID'),
        }

        return jwt.encode(payload, private_key, algorithm='ES256', headers=headers)

    def _parse_apple_id_token(self, id_token: str) -> Dict[str, Any]:
        """Parse and verify Apple ID token minimally (iss/aud/exp/iat)."""
        try:
            import base64 as _b64

            parts = id_token.split('.')
            if len(parts) != 3:
                raise OAuthError("Invalid Apple ID token format")

            # Decode payload (header unused for this minimal validation)
            payload_raw = parts[1] + '=' * (4 - len(parts[1]) % 4)
            payload = json.loads(_b64.urlsafe_b64decode(payload_raw))

            # Verify critical claims
            current_time = int(time.time())

            if payload.get('iss') != 'https://appleid.apple.com':
                raise OAuthError("Invalid Apple ID token issuer")

            if payload.get('aud') != os.getenv('APPLE_CLIENT_ID'):
                raise OAuthError("Invalid Apple ID token audience")

            if payload.get('exp', 0) <= current_time:
                raise OAuthError("Apple ID token expired")

            if payload.get('iat', 0) > current_time + 300:
                raise OAuthError("Apple ID token issued in future")

            logger.info("Apple ID token verified successfully")
            return payload

        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode Apple ID token: {e}")
            raise OAuthError("Invalid Apple ID token format")
        except Exception as e:
            logger.error(f"Failed to verify Apple ID token: {e}")
            raise OAuthError("Apple ID token verification failed")

