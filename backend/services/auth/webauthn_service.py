"""
WebAuthn Service for JewGo Authentication System

Provides WebAuthn (Web Authentication) support for passwordless authentication
and step-up authentication using FIDO2/WebAuthn standards.
"""

import os
import json
import secrets
import base64
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict

from utils.logging_config import get_logger
from cache.redis_manager_v5 import get_redis_manager_v5

logger = get_logger(__name__)

@dataclass
class WebAuthnCredential:
    """WebAuthn credential data structure."""
    credential_id: str
    public_key: str
    counter: int
    user_id: str
    created_at: str
    last_used: Optional[str] = None
    device_name: Optional[str] = None
    device_type: Optional[str] = None

@dataclass
class WebAuthnChallenge:
    """WebAuthn challenge data structure."""
    challenge: str
    user_id: str
    timeout: int
    created_at: str
    expires_at: str
    rp_id: str
    user_verification: str = "preferred"

class WebAuthnService:
    """WebAuthn service for FIDO2 authentication."""
    
    def __init__(self, redis_manager=None):
        self.redis_manager = redis_manager or get_redis_manager_v5()
        self.rp_id = os.environ.get('WEBAUTHN_RP_ID', 'jewgo.app')
        self.rp_name = os.environ.get('WEBAUTHN_RP_NAME', 'JewGo')
        self.origin = os.environ.get('WEBAUTHN_ORIGIN', 'https://jewgo.app')
        self.timeout = int(os.environ.get('WEBAUTHN_TIMEOUT', '300'))  # 5 minutes
        self.enabled = os.environ.get('WEBAUTHN_ENABLED', 'false').lower() == 'true'
        
        logger.info("WebAuthn service initialized", 
                   enabled=self.enabled, 
                   rp_id=self.rp_id)
    
    def is_enabled(self) -> bool:
        """Check if WebAuthn is enabled."""
        return self.enabled
    
    def create_registration_challenge(self, user_id: str, username: str, display_name: str) -> Dict[str, Any]:
        """
        Create a WebAuthn registration challenge.
        
        Args:
            user_id: User ID
            username: Username
            display_name: User display name
            
        Returns:
            WebAuthn registration challenge options
        """
        if not self.enabled:
            raise ValueError("WebAuthn is not enabled")
        
        try:
            # Generate challenge
            challenge = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
            
            # Create challenge data
            challenge_data = WebAuthnChallenge(
                challenge=challenge,
                user_id=user_id,
                timeout=self.timeout,
                created_at=datetime.utcnow().isoformat(),
                expires_at=(datetime.utcnow() + timedelta(seconds=self.timeout)).isoformat(),
                rp_id=self.rp_id
            )
            
            # Store challenge in Redis
            challenge_key = f"webauthn_reg_challenge:{challenge}"
            self.redis_manager.set(
                challenge_key,
                asdict(challenge_data),
                ttl=self.timeout,
                prefix='auth'
            )
            
            # Create WebAuthn registration options
            options = {
                "challenge": challenge,
                "rp": {
                    "name": self.rp_name,
                    "id": self.rp_id
                },
                "user": {
                    "id": base64.urlsafe_b64encode(user_id.encode()).decode('utf-8').rstrip('='),
                    "name": username,
                    "displayName": display_name
                },
                "pubKeyCredParams": [
                    {"alg": -7, "type": "public-key"},  # ES256
                    {"alg": -257, "type": "public-key"}  # RS256
                ],
                "authenticatorSelection": {
                    "authenticatorAttachment": "platform",
                    "userVerification": "preferred",
                    "requireResidentKey": False
                },
                "timeout": self.timeout * 1000,  # Convert to milliseconds
                "attestation": "none"
            }
            
            logger.info("WebAuthn registration challenge created", 
                       user_id=user_id, 
                       challenge_id=challenge[:8])
            
            return options
            
        except Exception as e:
            logger.error(f"Error creating WebAuthn registration challenge: {e}")
            raise
    
    def verify_registration(self, user_id: str, credential_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Verify WebAuthn registration response.
        
        Args:
            user_id: User ID
            credential_data: WebAuthn credential creation response
            
        Returns:
            Tuple of (success, credential_id)
        """
        if not self.enabled:
            return False, None
        
        try:
            # Extract challenge from credential data
            client_data_json = json.loads(
                base64.urlsafe_b64decode(
                    credential_data.get('response', {}).get('clientDataJSON', '') + '=='
                ).decode('utf-8')
            )
            
            challenge = client_data_json.get('challenge')
            if not challenge:
                logger.warning("No challenge in WebAuthn registration response")
                return False, None
            
            # Verify challenge exists and is valid
            challenge_key = f"webauthn_reg_challenge:{challenge}"
            stored_challenge = self.redis_manager.get(challenge_key, prefix='auth')
            
            if not stored_challenge:
                logger.warning("Invalid or expired WebAuthn registration challenge")
                return False, None
            
            if stored_challenge['user_id'] != user_id:
                logger.warning("WebAuthn challenge user ID mismatch")
                return False, None
            
            # Verify origin
            if client_data_json.get('origin') != self.origin:
                logger.warning("WebAuthn origin mismatch", 
                             expected=self.origin, 
                             received=client_data_json.get('origin'))
                return False, None
            
            # Extract credential information
            credential_id = credential_data.get('id')
            raw_id = credential_data.get('rawId')
            
            if not credential_id or not raw_id:
                logger.warning("Missing credential ID in WebAuthn registration")
                return False, None
            
            # In a full implementation, you would:
            # 1. Verify the attestation statement
            # 2. Extract and validate the public key
            # 3. Verify the signature
            # 4. Check for duplicate credentials
            
            # For now, create a mock credential
            credential = WebAuthnCredential(
                credential_id=credential_id,
                public_key=base64.urlsafe_b64encode(secrets.token_bytes(64)).decode('utf-8'),
                counter=0,
                user_id=user_id,
                created_at=datetime.utcnow().isoformat(),
                device_name=credential_data.get('device_name', 'Unknown Device'),
                device_type=credential_data.get('device_type', 'authenticator')
            )
            
            # Store credential
            credential_key = f"webauthn_credential:{user_id}:{credential_id}"
            self.redis_manager.set(
                credential_key,
                asdict(credential),
                ttl=86400 * 365,  # 1 year
                prefix='auth'
            )
            
            # Add to user's credential list
            user_credentials_key = f"webauthn_user_credentials:{user_id}"
            credentials_list = self.redis_manager.get(user_credentials_key, prefix='auth') or []
            credentials_list.append(credential_id)
            self.redis_manager.set(
                user_credentials_key,
                credentials_list,
                ttl=86400 * 365,  # 1 year
                prefix='auth'
            )
            
            # Clean up challenge
            self.redis_manager.delete(challenge_key, prefix='auth')
            
            logger.info("WebAuthn credential registered successfully", 
                       user_id=user_id, 
                       credential_id=credential_id[:8])
            
            return True, credential_id
            
        except Exception as e:
            logger.error(f"Error verifying WebAuthn registration: {e}")
            return False, None
    
    def create_authentication_challenge(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a WebAuthn authentication challenge.
        
        Args:
            user_id: Optional user ID for user-specific authentication
            
        Returns:
            WebAuthn authentication challenge options
        """
        if not self.enabled:
            raise ValueError("WebAuthn is not enabled")
        
        try:
            # Generate challenge
            challenge = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
            
            # Create challenge data
            challenge_data = WebAuthnChallenge(
                challenge=challenge,
                user_id=user_id or 'anonymous',
                timeout=self.timeout,
                created_at=datetime.utcnow().isoformat(),
                expires_at=(datetime.utcnow() + timedelta(seconds=self.timeout)).isoformat(),
                rp_id=self.rp_id
            )
            
            # Store challenge in Redis
            challenge_key = f"webauthn_auth_challenge:{challenge}"
            self.redis_manager.set(
                challenge_key,
                asdict(challenge_data),
                ttl=self.timeout,
                prefix='auth'
            )
            
            # Get user's credentials if user_id provided
            allowed_credentials = []
            if user_id:
                user_credentials = self.get_user_credentials(user_id)
                allowed_credentials = [
                    {
                        "id": cred.credential_id,
                        "type": "public-key",
                        "transports": ["internal", "usb", "nfc", "ble"]
                    }
                    for cred in user_credentials
                ]
            
            # Create WebAuthn authentication options
            options = {
                "challenge": challenge,
                "timeout": self.timeout * 1000,  # Convert to milliseconds
                "rpId": self.rp_id,
                "allowCredentials": allowed_credentials,
                "userVerification": "preferred"
            }
            
            logger.info("WebAuthn authentication challenge created", 
                       user_id=user_id, 
                       challenge_id=challenge[:8])
            
            return options
            
        except Exception as e:
            logger.error(f"Error creating WebAuthn authentication challenge: {e}")
            raise
    
    def verify_authentication(self, credential_data: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """
        Verify WebAuthn authentication response.
        
        Args:
            credential_data: WebAuthn authentication assertion response
            
        Returns:
            Tuple of (success, user_id)
        """
        if not self.enabled:
            return False, None
        
        try:
            # Extract challenge from credential data
            client_data_json = json.loads(
                base64.urlsafe_b64decode(
                    credential_data.get('response', {}).get('clientDataJSON', '') + '=='
                ).decode('utf-8')
            )
            
            challenge = client_data_json.get('challenge')
            if not challenge:
                logger.warning("No challenge in WebAuthn authentication response")
                return False, None
            
            # Verify challenge exists and is valid
            challenge_key = f"webauthn_auth_challenge:{challenge}"
            stored_challenge = self.redis_manager.get(challenge_key, prefix='auth')
            
            if not stored_challenge:
                logger.warning("Invalid or expired WebAuthn authentication challenge")
                return False, None
            
            # Verify origin
            if client_data_json.get('origin') != self.origin:
                logger.warning("WebAuthn origin mismatch", 
                             expected=self.origin, 
                             received=client_data_json.get('origin'))
                return False, None
            
            # Get credential ID
            credential_id = credential_data.get('id')
            if not credential_id:
                logger.warning("Missing credential ID in WebAuthn authentication")
                return False, None
            
            # Find credential
            credential = self.get_credential_by_id(credential_id)
            if not credential:
                logger.warning("WebAuthn credential not found", credential_id=credential_id[:8])
                return False, None
            
            # In a full implementation, you would:
            # 1. Verify the authenticator data
            # 2. Verify the signature using the stored public key
            # 3. Check and update the counter
            # 4. Verify user presence and verification flags
            
            # For now, simulate successful verification
            user_id = credential.user_id
            
            # Update credential usage
            credential.last_used = datetime.utcnow().isoformat()
            credential.counter += 1
            
            credential_key = f"webauthn_credential:{user_id}:{credential_id}"
            self.redis_manager.set(
                credential_key,
                asdict(credential),
                ttl=86400 * 365,  # 1 year
                prefix='auth'
            )
            
            # Clean up challenge
            self.redis_manager.delete(challenge_key, prefix='auth')
            
            logger.info("WebAuthn authentication successful", 
                       user_id=user_id, 
                       credential_id=credential_id[:8])
            
            return True, user_id
            
        except Exception as e:
            logger.error(f"Error verifying WebAuthn authentication: {e}")
            return False, None
    
    def get_user_credentials(self, user_id: str) -> List[WebAuthnCredential]:
        """
        Get all WebAuthn credentials for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            List of WebAuthn credentials
        """
        try:
            user_credentials_key = f"webauthn_user_credentials:{user_id}"
            credential_ids = self.redis_manager.get(user_credentials_key, prefix='auth') or []
            
            credentials = []
            for credential_id in credential_ids:
                credential = self.get_credential_by_id(credential_id, user_id)
                if credential:
                    credentials.append(credential)
            
            return credentials
            
        except Exception as e:
            logger.error(f"Error getting user WebAuthn credentials: {e}")
            return []
    
    def get_credential_by_id(self, credential_id: str, user_id: Optional[str] = None) -> Optional[WebAuthnCredential]:
        """
        Get WebAuthn credential by ID.
        
        Args:
            credential_id: Credential ID
            user_id: Optional user ID for faster lookup
            
        Returns:
            WebAuthn credential or None
        """
        try:
            if user_id:
                # Direct lookup if user_id provided
                credential_key = f"webauthn_credential:{user_id}:{credential_id}"
                credential_data = self.redis_manager.get(credential_key, prefix='auth')
                
                if credential_data:
                    return WebAuthnCredential(**credential_data)
            else:
                # Search across all users (less efficient)
                # In a real implementation, you'd have a credential index
                logger.warning("WebAuthn credential lookup without user_id is inefficient")
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting WebAuthn credential: {e}")
            return None
    
    def revoke_credential(self, user_id: str, credential_id: str) -> bool:
        """
        Revoke a WebAuthn credential.
        
        Args:
            user_id: User ID
            credential_id: Credential ID to revoke
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Remove from user's credential list
            user_credentials_key = f"webauthn_user_credentials:{user_id}"
            credential_ids = self.redis_manager.get(user_credentials_key, prefix='auth') or []
            
            if credential_id in credential_ids:
                credential_ids.remove(credential_id)
                self.redis_manager.set(
                    user_credentials_key,
                    credential_ids,
                    ttl=86400 * 365,  # 1 year
                    prefix='auth'
                )
            
            # Delete credential data
            credential_key = f"webauthn_credential:{user_id}:{credential_id}"
            self.redis_manager.delete(credential_key, prefix='auth')
            
            logger.info("WebAuthn credential revoked", 
                       user_id=user_id, 
                       credential_id=credential_id[:8])
            
            return True
            
        except Exception as e:
            logger.error(f"Error revoking WebAuthn credential: {e}")
            return False
    
    def health_check(self) -> Dict[str, Any]:
        """
        Perform WebAuthn service health check.
        
        Returns:
            Health status dictionary
        """
        try:
            # Test Redis connectivity
            test_key = f"webauthn_health_check_{secrets.token_hex(8)}"
            self.redis_manager.set(test_key, "test", ttl=10, prefix='auth')
            redis_healthy = self.redis_manager.exists(test_key, prefix='auth')
            self.redis_manager.delete(test_key, prefix='auth')
            
            return {
                'status': 'healthy' if redis_healthy else 'unhealthy',
                'enabled': self.enabled,
                'rp_id': self.rp_id,
                'redis': redis_healthy,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"WebAuthn health check failed: {e}")
            return {
                'status': 'unhealthy',
                'enabled': self.enabled,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

# Global service instance
_webauthn_service = None

def get_webauthn_service() -> WebAuthnService:
    """Get or create WebAuthn service instance."""
    global _webauthn_service
    if _webauthn_service is None:
        _webauthn_service = WebAuthnService()
    return _webauthn_service