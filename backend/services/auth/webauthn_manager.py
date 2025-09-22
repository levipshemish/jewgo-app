"""
WebAuthn Manager
================

This module provides WebAuthn (FIDO2) authentication support for enhanced security,
including passkeys and hardware security keys.
"""

import os
import json
import secrets
import hashlib
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
from sqlalchemy import text
from utils.logging_config import get_logger
from database.connection_manager import get_connection_manager
from cache.redis_manager_v5 import get_redis_manager_v5

logger = get_logger(__name__)


@dataclass
class WebAuthnCredential:
    """WebAuthn credential data class."""
    credential_id: str
    user_id: str
    public_key: str
    counter: int
    transports: List[str]
    created_at: datetime
    last_used: Optional[datetime] = None
    is_active: bool = True


@dataclass
class WebAuthnChallenge:
    """WebAuthn challenge data class."""
    challenge: str
    user_id: str
    credential_ids: List[str]
    timeout: int
    created_at: datetime


class WebAuthnManager:
    """WebAuthn authentication manager."""
    
    def __init__(self, db_manager=None, redis_manager=None):
        self.db_manager = db_manager or get_connection_manager()
        self.redis_manager = redis_manager or get_redis_manager_v5()
        
        # Configuration
        self.enabled = os.getenv("WEBAUTHN_ENABLED", "false").lower() == "true"
        self.rp_id = os.getenv("WEBAUTHN_RP_ID", "jewgo.app")
        self.rp_name = os.getenv("WEBAUTHN_RP_NAME", "JewGo")
        self.origin = os.getenv("WEBAUTHN_ORIGIN", "https://jewgo.app")
        self.timeout = int(os.getenv("WEBAUTHN_TIMEOUT", "300"))  # 5 minutes
        
        # Challenge storage
        self.challenge_ttl = self.timeout
        
        logger.info(f"WebAuthnManager initialized (enabled: {self.enabled})")
    
    def is_enabled(self) -> bool:
        """Check if WebAuthn is enabled."""
        return self.enabled
    
    def create_registration_challenge(self, user_id: str, user_name: str, user_display_name: str) -> Dict[str, Any]:
        """
        Create a WebAuthn registration challenge.
        
        Args:
            user_id: User ID
            user_name: Username (usually email)
            user_display_name: Display name
            
        Returns:
            Registration challenge data
        """
        if not self.enabled:
            raise ValueError("WebAuthn is not enabled")
        
        try:
            # Generate challenge
            challenge = secrets.token_urlsafe(32)
            
            # Create user ID hash
            user_id_bytes = user_id.encode('utf-8')
            user_id_hash = hashlib.sha256(user_id_bytes).digest()
            
            # Store challenge
            challenge_data = {
                "challenge": challenge,
                "user_id": user_id,
                "type": "registration",
                "created_at": datetime.utcnow().isoformat()
            }
            
            self.redis_manager.set(
                f"webauthn_challenge:{challenge}",
                challenge_data,
                ttl=self.challenge_ttl,
                prefix="auth"
            )
            
            # Create registration options
            options = {
                "challenge": challenge,
                "rp": {
                    "id": self.rp_id,
                    "name": self.rp_name
                },
                "user": {
                    "id": user_id_hash.hex(),
                    "name": user_name,
                    "displayName": user_display_name
                },
                "pubKeyCredParams": [
                    {"type": "public-key", "alg": -7},  # ES256
                    {"type": "public-key", "alg": -257}  # RS256
                ],
                "timeout": self.timeout * 1000,  # Convert to milliseconds
                "attestation": "none",
                "excludeCredentials": self._get_existing_credentials(user_id)
            }
            
            logger.info(f"Created WebAuthn registration challenge for user {user_id}")
            return options
            
        except Exception as e:
            logger.error(f"Error creating WebAuthn registration challenge: {e}")
            raise
    
    def create_authentication_challenge(self, user_id: str) -> Dict[str, Any]:
        """
        Create a WebAuthn authentication challenge.
        
        Args:
            user_id: User ID
            
        Returns:
            Authentication challenge data
        """
        if not self.enabled:
            raise ValueError("WebAuthn is not enabled")
        
        try:
            # Get user's credentials
            credentials = self.get_user_credentials(user_id)
            if not credentials:
                raise ValueError("No WebAuthn credentials found for user")
            
            # Generate challenge
            challenge = secrets.token_urlsafe(32)
            
            # Store challenge
            challenge_data = {
                "challenge": challenge,
                "user_id": user_id,
                "type": "authentication",
                "created_at": datetime.utcnow().isoformat()
            }
            
            self.redis_manager.set(
                f"webauthn_challenge:{challenge}",
                challenge_data,
                ttl=self.challenge_ttl,
                prefix="auth"
            )
            
            # Create authentication options
            options = {
                "challenge": challenge,
                "timeout": self.timeout * 1000,
                "rpId": self.rp_id,
                "allowCredentials": [
                    {
                        "type": "public-key",
                        "id": cred.credential_id,
                        "transports": cred.transports
                    }
                    for cred in credentials
                ],
                "userVerification": "required"
            }
            
            logger.info(f"Created WebAuthn authentication challenge for user {user_id}")
            return options
            
        except Exception as e:
            logger.error(f"Error creating WebAuthn authentication challenge: {e}")
            raise
    
    def verify_registration(self, challenge: str, credential_data: Dict[str, Any]) -> bool:
        """
        Verify WebAuthn registration response.
        
        Args:
            challenge: Original challenge
            credential_data: Credential data from client
            
        Returns:
            True if verification successful, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            # Get stored challenge
            stored_challenge = self.redis_manager.get(f"webauthn_challenge:{challenge}", prefix="auth")
            if not stored_challenge:
                logger.warning("WebAuthn registration challenge not found or expired")
                return False
            
            if stored_challenge.get("type") != "registration":
                logger.warning("Invalid challenge type for registration")
                return False
            
            user_id = stored_challenge["user_id"]
            
            # In a real implementation, you would:
            # 1. Verify the attestation signature
            # 2. Validate the credential data
            # 3. Check for replay attacks
            # 4. Store the credential
            
            # For now, we'll do basic validation
            if not self._validate_credential_data(credential_data):
                logger.warning("Invalid credential data in WebAuthn registration")
                return False
            
            # Store credential
            credential_id = credential_data.get("id")
            public_key = credential_data.get("response", {}).get("publicKey", "")
            transports = credential_data.get("transports", [])
            
            success = self._store_credential(user_id, credential_id, public_key, transports)
            
            if success:
                # Clean up challenge
                self.redis_manager.delete(f"webauthn_challenge:{challenge}", prefix="auth")
                logger.info(f"WebAuthn credential registered for user {user_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error verifying WebAuthn registration: {e}")
            return False
    
    def verify_authentication(self, challenge: str, credential_data: Dict[str, Any]) -> Optional[str]:
        """
        Verify WebAuthn authentication response.
        
        Args:
            challenge: Original challenge
            credential_data: Credential data from client
            
        Returns:
            User ID if verification successful, None otherwise
        """
        if not self.enabled:
            return None
        
        try:
            # Get stored challenge
            stored_challenge = self.redis_manager.get(f"webauthn_challenge:{challenge}", prefix="auth")
            if not stored_challenge:
                logger.warning("WebAuthn authentication challenge not found or expired")
                return None
            
            if stored_challenge.get("type") != "authentication":
                logger.warning("Invalid challenge type for authentication")
                return None
            
            user_id = stored_challenge["user_id"]
            credential_id = credential_data.get("id")
            
            # Get stored credential
            credential = self.get_credential_by_id(credential_id)
            if not credential or credential.user_id != user_id:
                logger.warning("Invalid credential for WebAuthn authentication")
                return None
            
            # In a real implementation, you would:
            # 1. Verify the assertion signature
            # 2. Check the counter
            # 3. Validate the challenge
            # 4. Update the counter
            
            # For now, we'll do basic validation
            if not self._validate_assertion_data(credential_data):
                logger.warning("Invalid assertion data in WebAuthn authentication")
                return None
            
            # Update credential usage
            self._update_credential_usage(credential_id)
            
            # Clean up challenge
            self.redis_manager.delete(f"webauthn_challenge:{challenge}", prefix="auth")
            
            logger.info(f"WebAuthn authentication successful for user {user_id}")
            return user_id
            
        except Exception as e:
            logger.error(f"Error verifying WebAuthn authentication: {e}")
            return None
    
    def get_user_credentials(self, user_id: str) -> List[WebAuthnCredential]:
        """Get all WebAuthn credentials for a user."""
        try:
            with self.db_manager.session_scope() as session:
                results = session.execute(
                    text("""
                        SELECT credential_id, user_id, public_key, counter, 
                               transports, created_at, last_used
                        FROM webauthn_credentials
                        WHERE user_id = :user_id AND is_active = TRUE
                        ORDER BY created_at DESC
                    """),
                    {"user_id": user_id}
                ).fetchall()
                
                credentials = []
                for result in results:
                    credential = WebAuthnCredential(
                        credential_id=result.credential_id,
                        user_id=result.user_id,
                        public_key=result.public_key,
                        counter=result.counter,
                        transports=json.loads(result.transports) if result.transports else [],
                        created_at=result.created_at,
                        last_used=result.last_used,
                        is_active=True
                    )
                    credentials.append(credential)
                
                return credentials
                
        except Exception as e:
            logger.error(f"Error getting WebAuthn credentials for user {user_id}: {e}")
            return []
    
    def revoke_credential(self, credential_id: str, user_id: str) -> bool:
        """Revoke a WebAuthn credential."""
        try:
            with self.db_manager.session_scope() as session:
                result = session.execute(
                    text("""
                        UPDATE webauthn_credentials 
                        SET is_active = FALSE, revoked_at = NOW()
                        WHERE credential_id = :credential_id AND user_id = :user_id
                    """),
                    {"credential_id": credential_id, "user_id": user_id}
                )
                
                if result.rowcount > 0:
                    logger.info(f"Revoked WebAuthn credential {credential_id} for user {user_id}")
                    return True
                
                return False
                
        except Exception as e:
            logger.error(f"Error revoking WebAuthn credential {credential_id}: {e}")
            return False
    
    def _get_existing_credentials(self, user_id: str) -> List[Dict[str, Any]]:
        """Get existing credentials for exclusion list."""
        credentials = self.get_user_credentials(user_id)
        return [
            {
                "type": "public-key",
                "id": cred.credential_id,
                "transports": cred.transports
            }
            for cred in credentials
        ]
    
    def _validate_credential_data(self, credential_data: Dict[str, Any]) -> bool:
        """Validate credential data structure."""
        required_fields = ["id", "type", "response"]
        return all(field in credential_data for field in required_fields)
    
    def _validate_assertion_data(self, credential_data: Dict[str, Any]) -> bool:
        """Validate assertion data structure."""
        required_fields = ["id", "type", "response"]
        return all(field in credential_data for field in required_fields)
    
    def _store_credential(self, user_id: str, credential_id: str, public_key: str, transports: List[str]) -> bool:
        """Store WebAuthn credential in database."""
        try:
            with self.db_manager.session_scope() as session:
                session.execute(
                    text("""
                        INSERT INTO webauthn_credentials (
                            credential_id, user_id, public_key, counter, 
                            transports, created_at, is_active
                        ) VALUES (
                            :credential_id, :user_id, :public_key, :counter,
                            :transports, NOW(), TRUE
                        )
                    """),
                    {
                        "credential_id": credential_id,
                        "user_id": user_id,
                        "public_key": public_key,
                        "counter": 0,
                        "transports": json.dumps(transports)
                    }
                )
                
                return True
                
        except Exception as e:
            logger.error(f"Error storing WebAuthn credential: {e}")
            return False
    
    def _update_credential_usage(self, credential_id: str):
        """Update credential usage timestamp and counter."""
        try:
            with self.db_manager.session_scope() as session:
                session.execute(
                    text("""
                        UPDATE webauthn_credentials 
                        SET last_used = NOW(), counter = counter + 1
                        WHERE credential_id = :credential_id
                    """),
                    {"credential_id": credential_id}
                )
                
        except Exception as e:
            logger.error(f"Error updating WebAuthn credential usage: {e}")
    
    def get_credential_by_id(self, credential_id: str) -> Optional[WebAuthnCredential]:
        """Get credential by ID."""
        try:
            with self.db_manager.session_scope() as session:
                result = session.execute(
                    text("""
                        SELECT credential_id, user_id, public_key, counter, 
                               transports, created_at, last_used
                        FROM webauthn_credentials
                        WHERE credential_id = :credential_id AND is_active = TRUE
                    """),
                    {"credential_id": credential_id}
                ).fetchone()
                
                if result:
                    return WebAuthnCredential(
                        credential_id=result.credential_id,
                        user_id=result.user_id,
                        public_key=result.public_key,
                        counter=result.counter,
                        transports=json.loads(result.transports) if result.transports else [],
                        created_at=result.created_at,
                        last_used=result.last_used,
                        is_active=True
                    )
                
                return None
                
        except Exception as e:
            logger.error(f"Error getting WebAuthn credential by ID: {e}")
            return None


# Global WebAuthn manager instance
webauthn_manager = WebAuthnManager()


def get_webauthn_manager() -> WebAuthnManager:
    """Get the global WebAuthn manager instance."""
    return webauthn_manager