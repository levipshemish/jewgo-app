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
from services.email_service import send_oauth_welcome_email

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

    def generate_secure_state(self, provider: str, return_to: str = '/', extra_data: Optional[Dict[str, Any]] = None) -> str:
        """Generate cryptographically secure state parameter."""
        # Only allow relative paths - reject absolute URLs
        return_to = self._validate_return_to_relative_only(return_to)

        state_data = {
            'provider': provider,
            'return_to': return_to,
            'timestamp': int(time.time()),
            'nonce': secrets.token_hex(16)
        }
        
        # Add extra data if provided
        if extra_data:
            state_data.update(extra_data)

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
                        'expires_at': datetime.utcnow() + timedelta(minutes=30)
                    }
                )
        except Exception as e:
            logger.error(f"Failed to store OAuth state: {e}")
            raise OAuthError("Failed to generate secure state")

        return state_token

    def validate_and_consume_state(self, state_token: str, provider: str) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
        """Validate OAuth state and return return_to URL and extra data."""
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
                        RETURNING return_to, extra_data
                        """
                    ),
                    {'state_token': state_token, 'provider': provider}
                ).fetchone()

                if result:
                    extra_data = result[1] if result[1] else {}
                    return result[0], extra_data
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
                    return None, None

        except Exception as e:
            logger.error(f"State validation error: {e}")
            return None, None

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
                # Check if OAuth user exists directly in users table
                existing_oauth = session.execute(
                    text(
                        """
                        SELECT id, name, email, email_verified
                        FROM users
                        WHERE oauth_provider = :provider AND oauth_provider_id = :provider_id
                        """
                    ),
                    {'provider': provider, 'provider_id': provider_id}
                ).fetchone()

                if existing_oauth:
                    logger.info(f"Found existing OAuth user for {provider}:{provider_id}")
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
                    
                    # Update existing user with OAuth information including profile image and name
                    session.execute(
                        text(
                            """
                            UPDATE users 
                            SET oauth_provider = :provider,
                                oauth_provider_id = :provider_id,
                                oauth_raw_profile = :raw_profile,
                                image = :avatar_url,
                                name = COALESCE(:name, name),  -- Update name if provided, keep existing if not
                                email_verified = :email_verified,  -- Update verification status from OAuth
                                "updatedAt" = NOW()
                            WHERE id = :user_id
                            """
                        ),
                        {
                            'user_id': user_id,
                            'provider': provider,
                            'provider_id': provider_id,
                            'raw_profile': json.dumps(raw_profile) if raw_profile else None,
                            'avatar_url': avatar_url,  # Update profile image URL
                            'name': name,  # Update name from OAuth provider
                            'email_verified': email_verified,  # Update verification status
                        },
                    )
                else:
                    # Create new user with OAuth information including profile image
                    user_id = secrets.token_hex(16)
                    session.execute(
                        text(
                            """
                            INSERT INTO users (
                                id, name, email, email_verified, "isSuperAdmin", image,
                                oauth_provider, oauth_provider_id, oauth_raw_profile,
                                "createdAt", "updatedAt"
                            )
                            VALUES (
                                :user_id, :name, :email, :email_verified, FALSE, :avatar_url,
                                :provider, :provider_id, :raw_profile,
                                NOW(), NOW()
                            )
                            """
                        ),
                        {
                            'user_id': user_id,
                            'name': name or email.split('@')[0],  # Use full name from OAuth or email prefix
                            'email': email.lower(),
                            'email_verified': email_verified,
                            'avatar_url': avatar_url,  # Add profile image URL
                            'provider': provider,
                            'provider_id': provider_id,
                            'raw_profile': json.dumps(raw_profile) if raw_profile else None,
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

                # Send OAuth welcome email for new users (best-effort)
                if is_new_user:
                    try:
                        send_oauth_welcome_email(result['email'], result['name'], provider.title())
                        logger.info(f"Sent OAuth welcome email to {result['email'][:3]}***@{result['email'].split('@')[1]}")
                    except Exception as e:
                        logger.warning(f"Failed to send OAuth welcome email: {e}")

                return result

        except Exception as e:
            logger.error(f"OAuth user creation/linking failed: {e}")
            raise OAuthError(f"Failed to process OAuth user: {str(e)}")

    def link_oauth_to_existing_user(
        self,
        user_id: str,
        provider: str,
        provider_id: str,
        email: str,
        name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        raw_profile: Optional[Dict[str, Any]] = None,
        email_verified: bool = False,
    ) -> Dict[str, Any]:
        """Link OAuth account to an existing user."""
        try:
            with self.db.session_scope() as session:
                # Verify the user exists
                existing_user = session.execute(
                    text("SELECT id, email, oauth_provider FROM users WHERE id = :user_id"),
                    {'user_id': user_id}
                ).fetchone()
                
                if not existing_user:
                    raise OAuthError(f"User {user_id} not found for OAuth linking")
                
                # Check if user already has OAuth linked
                if existing_user.oauth_provider:
                    raise OAuthError(f"User already has {existing_user.oauth_provider} account linked")
                
                # Check if this OAuth account is already linked to another user
                oauth_conflict = session.execute(
                    text("""
                        SELECT id, email FROM users 
                        WHERE oauth_provider = :provider AND oauth_provider_id = :provider_id
                    """),
                    {'provider': provider, 'provider_id': provider_id}
                ).fetchone()
                
                if oauth_conflict:
                    raise OAuthError(f"This {provider} account is already linked to another user")
                
                # Check if OAuth email matches user email
                if existing_user.email.lower() != email.lower():
                    logger.warning(f"OAuth email {email} doesn't match user email {existing_user.email} for linking")
                    # Allow linking but log the discrepancy
                
                # Update user with OAuth information
                session.execute(
                    text("""
                        UPDATE users 
                        SET oauth_provider = :provider,
                            oauth_provider_id = :provider_id,
                            oauth_raw_profile = :raw_profile,
                            image = COALESCE(:avatar_url, image),  -- Update image if provided
                            name = COALESCE(:name, name),  -- Update name if provided
                            email_verified = CASE 
                                WHEN :email_verified = TRUE THEN TRUE 
                                ELSE email_verified 
                            END,  -- Only upgrade verification, never downgrade
                            "updatedAt" = NOW()
                        WHERE id = :user_id
                    """),
                    {
                        'user_id': user_id,
                        'provider': provider,
                        'provider_id': provider_id,
                        'raw_profile': json.dumps(raw_profile) if raw_profile else None,
                        'avatar_url': avatar_url,
                        'name': name,
                        'email_verified': email_verified
                    }
                )
                
                logger.info(f"Successfully linked {provider} account to user {user_id}")
                
                return {
                    'id': user_id,
                    'name': name or existing_user.email.split('@')[0],
                    'email': existing_user.email,
                    'email_verified': email_verified or False,
                    'is_new': False,
                    'is_linked': True,
                    'image': avatar_url
                }
                
        except Exception as e:
            logger.error(f"Failed to link OAuth account to user {user_id}: {e}")
            raise OAuthError(f"Failed to link OAuth account: {str(e)}")

    # Google OAuth methods
    def get_google_auth_url(self, return_to: str = '/', link_user_id: Optional[str] = None) -> str:
        """Generate Google OAuth authorization URL."""
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        redirect_uri = os.getenv('GOOGLE_REDIRECT_URI')

        if not client_id:
            raise OAuthError("Google OAuth not configured - missing GOOGLE_CLIENT_ID")
        if not redirect_uri:
            raise OAuthError("Google OAuth not configured - missing GOOGLE_REDIRECT_URI")

        # Include link_user_id in state if provided
        extra_data = {'link_user_id': link_user_id} if link_user_id else None
        state = self.generate_secure_state('google', return_to, extra_data)

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
        """Handle Google OAuth callback and return user data + return_to with detailed logging."""
        callback_id = f"oauth_svc_{int(time.time())}_{hash(code) % 10000}"
        
        logger.info(f"[{callback_id}] Starting Google OAuth callback processing", extra={
            'callback_id': callback_id,
            'code_length': len(code),
            'state_length': len(state),
            'code_prefix': code[:20],
            'state_prefix': state[:20]
        })
        
        # Step 1: Validate state
        logger.info(f"[{callback_id}] Validating OAuth state")
        try:
            return_to, extra_data = self.validate_and_consume_state(state, 'google')
            if not return_to:
                logger.error(f"[{callback_id}] Invalid or expired OAuth state")
                raise OAuthError("Invalid or expired OAuth state")
            
            link_user_id = extra_data.get('link_user_id') if extra_data else None
            logger.info(f"[{callback_id}] OAuth state validated successfully", extra={
                'callback_id': callback_id,
                'return_to': return_to,
                'link_user_id': link_user_id
            })
        except Exception as e:
            logger.error(f"[{callback_id}] State validation failed: {e}", exc_info=True)
            raise

        try:
            # Step 2: Exchange code for tokens
            logger.info(f"[{callback_id}] Exchanging authorization code for tokens")
            try:
                token_data = self._exchange_google_code(code)
                logger.info(f"[{callback_id}] Token exchange successful", extra={
                    'callback_id': callback_id,
                    'token_type': token_data.get('token_type'),
                    'has_access_token': bool(token_data.get('access_token')),
                    'has_refresh_token': bool(token_data.get('refresh_token')),
                    'expires_in': token_data.get('expires_in')
                })
            except Exception as e:
                logger.error(f"[{callback_id}] Token exchange failed: {e}", extra={
                    'callback_id': callback_id,
                    'exception_type': type(e).__name__
                }, exc_info=True)
                raise
            
            # Step 3: Get user profile from Google
            logger.info(f"[{callback_id}] Fetching user profile from Google")
            try:
                profile = self._get_google_profile(token_data['access_token'])
                logger.info(f"[{callback_id}] Profile fetched successfully", extra={
                    'callback_id': callback_id,
                    'profile_sub': profile.get('sub'),
                    'profile_email': profile.get('email'),
                    'profile_verified': profile.get('email_verified'),
                    'profile_name': profile.get('name')
                })
            except Exception as e:
                logger.error(f"[{callback_id}] Profile fetch failed: {e}", extra={
                    'callback_id': callback_id,
                    'exception_type': type(e).__name__
                }, exc_info=True)
                raise

            # Step 4: Find or create user (or link to existing user)
            logger.info(f"[{callback_id}] Finding or creating user account")
            try:
                # Only set email_verified=True if Google confirms it
                email_verified = bool(profile.get('email_verified'))

                if link_user_id:
                    # Account linking mode - link OAuth to existing user
                    logger.info(f"[{callback_id}] Linking OAuth account to existing user {link_user_id}")
                    user = self.link_oauth_to_existing_user(
                        user_id=link_user_id,
                        provider='google',
                        provider_id=profile['sub'],
                        email=profile['email'],
                        name=profile.get('name'),
                        avatar_url=profile.get('picture'),
                        raw_profile=profile,
                        email_verified=email_verified,
                    )
                else:
                    # Normal OAuth sign-in/sign-up
                    user = self.find_or_create_user_from_oauth(
                        provider='google',
                        provider_id=profile['sub'],
                        email=profile['email'],
                        name=profile.get('name'),
                        avatar_url=profile.get('picture'),
                        raw_profile=profile,
                        email_verified=email_verified,
                    )
                
                logger.info(f"[{callback_id}] User account processed successfully", extra={
                    'callback_id': callback_id,
                    'user_id': user.get('id'),
                    'is_new_user': user.get('is_new', False),
                    'is_linking': bool(link_user_id),
                    'email_verified': email_verified
                })
            except Exception as e:
                logger.error(f"[{callback_id}] User account processing failed: {e}", extra={
                    'callback_id': callback_id,
                    'exception_type': type(e).__name__,
                    'profile_email': profile.get('email'),
                    'link_user_id': link_user_id
                }, exc_info=True)
                raise

            logger.info(f"[{callback_id}] Google OAuth callback processing completed successfully")
            return user, return_to

        except Exception as e:
            # Audit log OAuth failures with enhanced context
            logger.error(f"[{callback_id}] OAuth callback failed, recording audit log", extra={
                'callback_id': callback_id,
                'error_type': type(e).__name__,
                'error_message': str(e)
            })
            try:
                self.auth_manager._log_auth_event(
                    None,
                    'oauth_callback_failed',
                    False,
                    {
                        'provider': 'google', 
                        'error': str(e)[:100],
                        'callback_id': callback_id,
                        'error_type': type(e).__name__
                    },
                    None,
                )
            except Exception as audit_e:
                logger.warning(f"[{callback_id}] Failed to log OAuth failure: {audit_e}")
            raise

    def _exchange_google_code(self, code: str) -> Dict[str, Any]:
        """Exchange Google authorization code for tokens with detailed logging."""
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        redirect_uri = os.getenv('GOOGLE_REDIRECT_URI')

        logger.info("Google token exchange configuration", extra={
            'has_client_id': bool(client_id),
            'client_id_prefix': client_id[:20] if client_id else None,
            'has_client_secret': bool(client_secret),
            'redirect_uri': redirect_uri,
            'code_prefix': code[:20]
        })

        if not client_id or not client_secret or not redirect_uri:
            logger.error("Missing Google OAuth configuration", extra={
                'missing_client_id': not client_id,
                'missing_client_secret': not client_secret,
                'missing_redirect_uri': not redirect_uri
            })
            raise OAuthError("Google OAuth configuration incomplete")

        data = {
            'client_id': client_id,
            'client_secret': client_secret,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': redirect_uri,
        }

        logger.info("Sending token exchange request to Google", extra={
            'url': 'https://oauth2.googleapis.com/token',
            'grant_type': data['grant_type'],
            'redirect_uri': data['redirect_uri']
        })

        try:
            response = requests.post('https://oauth2.googleapis.com/token', data=data, timeout=10)
            
            logger.info("Google token exchange response received", extra={
                'status_code': response.status_code,
                'response_headers': dict(response.headers),
                'response_size': len(response.content)
            })

            if not response.ok:
                error_details = {}
                try:
                    error_details = response.json()
                except:
                    error_details = {'raw_response': response.text[:500]}
                
                logger.error("Google token exchange failed", extra={
                    'status_code': response.status_code,
                    'error_details': error_details,
                    'response_text': response.text[:200]
                })
                raise OAuthError(f"Google token exchange failed: {response.status_code} - {error_details.get('error', 'Unknown error')}")

            token_response = response.json()
            logger.info("Google token exchange successful", extra={
                'token_type': token_response.get('token_type'),
                'expires_in': token_response.get('expires_in'),
                'scope': token_response.get('scope')
            })
            
            return token_response
            
        except requests.RequestException as e:
            logger.error(f"Google token exchange network error: {e}", exc_info=True)
            raise OAuthError(f"Network error during token exchange: {e}")

    def _get_google_profile(self, access_token: str) -> Dict[str, Any]:
        """Get Google user profile using OIDC endpoint with detailed logging."""
        logger.info("Fetching Google user profile", extra={
            'access_token_length': len(access_token),
            'access_token_prefix': access_token[:20],
            'endpoint': 'https://openidconnect.googleapis.com/v1/userinfo'
        })
        
        headers = {'Authorization': f'Bearer {access_token}'}
        
        try:
            response = requests.get(
                'https://openidconnect.googleapis.com/v1/userinfo', 
                headers=headers, 
                timeout=10
            )
            
            logger.info("Google profile response received", extra={
                'status_code': response.status_code,
                'response_headers': dict(response.headers),
                'response_size': len(response.content)
            })

            if not response.ok:
                error_details = {}
                try:
                    error_details = response.json()
                except:
                    error_details = {'raw_response': response.text[:500]}
                
                logger.error("Google profile fetch failed", extra={
                    'status_code': response.status_code,
                    'error_details': error_details,
                    'response_text': response.text[:200]
                })
                raise OAuthError(f"Google profile fetch failed: {response.status_code} - {error_details.get('error', 'Unknown error')}")

            profile_data = response.json()
            logger.info("Google profile fetched successfully", extra={
                'profile_keys': list(profile_data.keys()),
                'has_sub': bool(profile_data.get('sub')),
                'has_email': bool(profile_data.get('email')),
                'email_verified': profile_data.get('email_verified'),
                'has_name': bool(profile_data.get('name'))
            })
            
            return profile_data
            
        except requests.RequestException as e:
            logger.error(f"Google profile fetch network error: {e}", exc_info=True)
            raise OAuthError(f"Network error during profile fetch: {e}")

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

