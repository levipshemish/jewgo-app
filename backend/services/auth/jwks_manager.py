"""
JWKS Manager - JSON Web Key Set management with key rotation.

This module provides JWKS management with RS256/ES256 algorithms,
key rotation capabilities, and secure key storage.
"""

import os
import secrets
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional, List, Tuple
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa, ec
from cryptography.hazmat.backends import default_backend
import jwt
from utils.logging_config import get_logger
from cache.redis_manager_v5 import get_redis_manager_v5

logger = get_logger(__name__)


class JWKSManager:
    """Manages JSON Web Key Sets with rotation and secure storage."""
    
    def __init__(self, redis_manager=None):
        """
        Initialize JWKSManager.
        
        Args:
            redis_manager: Redis manager instance (optional)
        """
        self.redis_manager = redis_manager or get_redis_manager_v5()
        self.algorithm = os.getenv('JWT_ALGORITHM', 'RS256')
        self.key_size = int(os.getenv('JWT_KEY_SIZE', '2048'))
        self.jwks_cache_ttl = int(os.getenv('JWKS_CACHE_TTL', '300'))  # 5 minutes
        self.key_rotation_days = int(os.getenv('KEY_ROTATION_DAYS', '90'))  # 90 days
        self.issuer = os.getenv('JWT_ISSUER', 'jewgo.app')
        
        # Validate algorithm
        if self.algorithm not in ['RS256', 'ES256']:
            raise ValueError(f"Unsupported algorithm: {self.algorithm}. Use RS256 or ES256.")
        
        logger.info(f"JWKSManager initialized with {self.algorithm} algorithm")
    
    def generate_key_pair(self) -> Tuple[str, str, str]:
        """
        Generate a new key pair for JWT signing.
        
        Returns:
            Tuple of (kid, private_key_pem, public_key_pem)
        """
        try:
            kid = self._generate_kid()
            
            if self.algorithm == 'RS256':
                # Generate RSA key pair
                private_key = rsa.generate_private_key(
                    public_exponent=65537,
                    key_size=self.key_size,
                    backend=default_backend()
                )
                public_key = private_key.public_key()
                
            elif self.algorithm == 'ES256':
                # Generate ECDSA key pair (P-256 curve for ES256)
                private_key = ec.generate_private_key(
                    ec.SECP256R1(),
                    backend=default_backend()
                )
                public_key = private_key.public_key()
            
            # Serialize keys to PEM format
            private_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ).decode('utf-8')
            
            public_pem = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ).decode('utf-8')
            
            logger.info(f"Generated new {self.algorithm} key pair with kid: {kid}")
            return kid, private_pem, public_pem
            
        except Exception as e:
            logger.error(f"Error generating key pair: {e}")
            raise
    
    def store_key_pair(self, kid: str, private_key_pem: str, public_key_pem: str, 
                      is_current: bool = False) -> bool:
        """
        Store key pair securely.
        
        Args:
            kid: Key ID
            private_key_pem: Private key in PEM format
            public_key_pem: Public key in PEM format
            is_current: Whether this is the current active key
            
        Returns:
            True if successful, False otherwise
        """
        try:
            key_data = {
                'kid': kid,
                'algorithm': self.algorithm,
                'private_key': private_key_pem,
                'public_key': public_key_pem,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'is_current': is_current,
                'status': 'active'
            }
            
            # Store in Redis with encryption (in production, use KMS/HSM)
            key_storage_key = f"jwks:key:{kid}"
            self.redis_manager.set(
                key_storage_key,
                key_data,
                ttl=86400 * self.key_rotation_days * 2,  # Store for 2x rotation period
                prefix='auth'
            )
            
            # Update current key pointer if needed
            if is_current:
                self.redis_manager.set(
                    'jwks:current_kid',
                    kid,
                    ttl=86400 * self.key_rotation_days * 2,
                    prefix='auth'
                )
            
            # Add to key list
            self._add_to_key_list(kid)
            
            # Invalidate JWKS cache
            self._invalidate_jwks_cache()
            
            logger.info(f"Stored key pair {kid} (current: {is_current})")
            return True
            
        except Exception as e:
            logger.error(f"Error storing key pair {kid}: {e}")
            return False
    
    def get_current_key(self) -> Optional[Dict[str, Any]]:
        """
        Get the current active signing key.
        
        Returns:
            Key data dictionary or None if not found
        """
        try:
            current_kid = self.redis_manager.get('jwks:current_kid', prefix='auth')
            if not current_kid:
                return None
            
            return self.get_key_by_kid(current_kid)
            
        except Exception as e:
            logger.error(f"Error getting current key: {e}")
            return None
    
    def get_key_by_kid(self, kid: str) -> Optional[Dict[str, Any]]:
        """
        Get key data by Key ID.
        
        Args:
            kid: Key ID
            
        Returns:
            Key data dictionary or None if not found
        """
        try:
            key_storage_key = f"jwks:key:{kid}"
            key_data = self.redis_manager.get(key_storage_key, prefix='auth')
            
            if key_data and key_data.get('status') == 'active':
                return key_data
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting key {kid}: {e}")
            return None
    
    def get_public_jwks(self) -> Dict[str, Any]:
        """
        Get public JWKS for /.well-known/jwks.json endpoint.
        
        Returns:
            JWKS dictionary
        """
        try:
            # Check cache first
            cached_jwks = self.redis_manager.get('jwks:public', prefix='auth')
            if cached_jwks:
                return cached_jwks
            
            # Build JWKS from stored keys
            jwks = {
                'keys': []
            }
            
            key_list = self._get_key_list()
            for kid in key_list:
                key_data = self.get_key_by_kid(kid)
                if key_data and key_data.get('status') == 'active':
                    public_jwk = self._create_public_jwk(key_data)
                    if public_jwk:
                        jwks['keys'].append(public_jwk)
            
            # Cache the JWKS
            self.redis_manager.set(
                'jwks:public',
                jwks,
                ttl=self.jwks_cache_ttl,
                prefix='auth'
            )
            
            logger.debug(f"Generated JWKS with {len(jwks['keys'])} keys")
            return jwks
            
        except Exception as e:
            logger.error(f"Error generating public JWKS: {e}")
            return {'keys': []}
    
    def rotate_keys(self) -> Tuple[bool, str]:
        """
        Rotate signing keys by generating new key pair and marking old as retired.
        
        Returns:
            Tuple of (success, message)
        """
        try:
            # Generate new key pair
            new_kid, private_pem, public_pem = self.generate_key_pair()
            
            # Get current key to retire
            current_key = self.get_current_key()
            
            # Store new key as current
            success = self.store_key_pair(new_kid, private_pem, public_pem, is_current=True)
            if not success:
                return False, "Failed to store new key pair"
            
            # Mark old key as retired (but keep it for grace period)
            if current_key:
                old_kid = current_key['kid']
                self._retire_key(old_kid)
                logger.info(f"Retired old key {old_kid}")
            
            # Clean up very old keys
            self._cleanup_old_keys()
            
            logger.info(f"Key rotation completed: new key {new_kid}")
            return True, f"Key rotation successful: new key {new_kid}"
            
        except Exception as e:
            logger.error(f"Key rotation failed: {e}")
            return False, f"Key rotation failed: {str(e)}"
    
    def emergency_revoke_key(self, kid: str, reason: str = "emergency_revocation") -> bool:
        """
        Emergency revocation of a specific key.
        
        Args:
            kid: Key ID to revoke
            reason: Reason for revocation
            
        Returns:
            True if successful, False otherwise
        """
        try:
            key_data = self.get_key_by_kid(kid)
            if not key_data:
                logger.warning(f"Key {kid} not found for revocation")
                return False
            
            # Mark key as revoked
            key_data['status'] = 'revoked'
            key_data['revoked_at'] = datetime.now(timezone.utc).isoformat()
            key_data['revocation_reason'] = reason
            
            # Update stored key
            key_storage_key = f"jwks:key:{kid}"
            self.redis_manager.set(
                key_storage_key,
                key_data,
                ttl=86400 * 30,  # Keep revoked keys for 30 days
                prefix='auth'
            )
            
            # If this was the current key, we need a new one
            current_kid = self.redis_manager.get('jwks:current_kid', prefix='auth')
            if current_kid == kid:
                logger.warning(f"Current key {kid} revoked - generating new key")
                success, message = self.rotate_keys()
                if not success:
                    logger.error(f"Failed to generate new key after revocation: {message}")
                    return False
            
            # Invalidate JWKS cache
            self._invalidate_jwks_cache()
            
            logger.warning(f"Emergency revocation of key {kid}: {reason}")
            return True
            
        except Exception as e:
            logger.error(f"Error revoking key {kid}: {e}")
            return False
    
    def sign_jwt(self, payload: Dict[str, Any]) -> Optional[str]:
        """
        Sign JWT with current key.
        
        Args:
            payload: JWT payload
            
        Returns:
            Signed JWT string or None if failed
        """
        try:
            current_key = self.get_current_key()
            if not current_key:
                logger.error("No current signing key available")
                return None
            
            # Add key ID and algorithm to header
            headers = {
                'kid': current_key['kid'],
                'alg': self.algorithm
            }
            
            # Add issuer to payload if not present
            if 'iss' not in payload:
                payload['iss'] = self.issuer
            
            # Sign JWT
            token = jwt.encode(
                payload,
                current_key['private_key'],
                algorithm=self.algorithm,
                headers=headers
            )
            
            return token
            
        except Exception as e:
            logger.error(f"Error signing JWT: {e}")
            return None
    
    def verify_jwt(self, token: str, audience: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Verify JWT with appropriate key.
        
        Args:
            token: JWT token to verify
            audience: Expected audience (optional)
            
        Returns:
            Decoded payload or None if verification failed
        """
        try:
            # Decode header to get kid
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get('kid')
            
            if not kid:
                logger.warning("JWT missing kid in header")
                return None
            
            # Get key for verification
            key_data = self.get_key_by_kid(kid)
            if not key_data:
                logger.warning(f"Unknown kid: {kid}")
                return None
            
            if key_data.get('status') == 'revoked':
                logger.warning(f"Attempted use of revoked key: {kid}")
                return None
            
            # Verify JWT
            options = {
                'verify_signature': True,
                'verify_exp': True,
                'verify_iat': True,
                'verify_iss': True,
                'require_exp': True,
                'require_iat': True,
                'require_iss': True
            }
            
            if audience:
                options['verify_aud'] = True
                options['require_aud'] = True
            
            payload = jwt.decode(
                token,
                key_data['public_key'],
                algorithms=[self.algorithm],
                issuer=self.issuer,
                audience=audience,
                options=options
            )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.debug("JWT token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.debug(f"Invalid JWT token: {e}")
            return None
        except Exception as e:
            logger.error(f"JWT verification error: {e}")
            return None
    
    def _generate_kid(self) -> str:
        """Generate a unique Key ID."""
        timestamp = int(time.time())
        random_part = secrets.token_hex(8)
        return f"{self.algorithm.lower()}_{timestamp}_{random_part}"
    
    def _create_public_jwk(self, key_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Create public JWK from key data.
        
        Args:
            key_data: Key data dictionary
            
        Returns:
            JWK dictionary or None if failed
        """
        try:
            public_key_pem = key_data['public_key']
            kid = key_data['kid']
            algorithm = key_data['algorithm']
            
            # Load public key
            public_key = serialization.load_pem_public_key(
                public_key_pem.encode('utf-8'),
                backend=default_backend()
            )
            
            if algorithm == 'RS256':
                # RSA public key
                public_numbers = public_key.public_numbers()
                
                jwk = {
                    'kty': 'RSA',
                    'use': 'sig',
                    'alg': 'RS256',
                    'kid': kid,
                    'n': self._int_to_base64url(public_numbers.n),
                    'e': self._int_to_base64url(public_numbers.e)
                }
                
            elif algorithm == 'ES256':
                # ECDSA public key
                public_numbers = public_key.public_numbers()
                
                jwk = {
                    'kty': 'EC',
                    'use': 'sig',
                    'alg': 'ES256',
                    'kid': kid,
                    'crv': 'P-256',
                    'x': self._int_to_base64url(public_numbers.x),
                    'y': self._int_to_base64url(public_numbers.y)
                }
            
            return jwk
            
        except Exception as e:
            logger.error(f"Error creating public JWK for {kid}: {e}")
            return None
    
    def _int_to_base64url(self, value: int) -> str:
        """Convert integer to base64url encoding."""
        import base64
        
        # Convert to bytes
        byte_length = (value.bit_length() + 7) // 8
        value_bytes = value.to_bytes(byte_length, byteorder='big')
        
        # Base64url encode
        return base64.urlsafe_b64encode(value_bytes).decode('ascii').rstrip('=')
    
    def _add_to_key_list(self, kid: str) -> None:
        """Add key ID to the key list."""
        try:
            key_list = self._get_key_list()
            if kid not in key_list:
                key_list.append(kid)
                self.redis_manager.set(
                    'jwks:key_list',
                    key_list,
                    ttl=86400 * self.key_rotation_days * 2,
                    prefix='auth'
                )
        except Exception as e:
            logger.error(f"Error adding {kid} to key list: {e}")
    
    def _get_key_list(self) -> List[str]:
        """Get list of key IDs."""
        try:
            key_list = self.redis_manager.get('jwks:key_list', prefix='auth')
            return key_list if key_list else []
        except Exception as e:
            logger.error(f"Error getting key list: {e}")
            return []
    
    def _retire_key(self, kid: str) -> None:
        """Mark key as retired but keep it for grace period."""
        try:
            key_data = self.get_key_by_kid(kid)
            if key_data:
                key_data['status'] = 'retired'
                key_data['retired_at'] = datetime.now(timezone.utc).isoformat()
                key_data['is_current'] = False
                
                key_storage_key = f"jwks:key:{kid}"
                self.redis_manager.set(
                    key_storage_key,
                    key_data,
                    ttl=86400 * 30,  # Keep retired keys for 30 days
                    prefix='auth'
                )
        except Exception as e:
            logger.error(f"Error retiring key {kid}: {e}")
    
    def _cleanup_old_keys(self) -> None:
        """Clean up very old keys."""
        try:
            key_list = self._get_key_list()
            current_time = datetime.now(timezone.utc)
            keys_to_remove = []
            
            for kid in key_list:
                key_data = self.get_key_by_kid(kid)
                if not key_data:
                    keys_to_remove.append(kid)
                    continue
                
                # Remove keys older than 2x rotation period
                created_at = datetime.fromisoformat(key_data['created_at'])
                age_days = (current_time - created_at).days
                
                if age_days > (self.key_rotation_days * 2):
                    keys_to_remove.append(kid)
                    # Delete the key data
                    key_storage_key = f"jwks:key:{kid}"
                    self.redis_manager.delete(key_storage_key, prefix='auth')
                    logger.info(f"Cleaned up old key {kid} (age: {age_days} days)")
            
            # Update key list
            if keys_to_remove:
                updated_key_list = [k for k in key_list if k not in keys_to_remove]
                self.redis_manager.set(
                    'jwks:key_list',
                    updated_key_list,
                    ttl=86400 * self.key_rotation_days * 2,
                    prefix='auth'
                )
                
        except Exception as e:
            logger.error(f"Error cleaning up old keys: {e}")
    
    def _invalidate_jwks_cache(self) -> None:
        """Invalidate cached JWKS."""
        try:
            self.redis_manager.delete('jwks:public', prefix='auth')
            logger.debug("JWKS cache invalidated")
        except Exception as e:
            logger.error(f"Error invalidating JWKS cache: {e}")
    
    def initialize_keys(self) -> bool:
        """
        Initialize JWKS with first key pair if none exist.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            current_key = self.get_current_key()
            if current_key:
                logger.info("JWKS already initialized")
                return True
            
            # Generate initial key pair
            kid, private_pem, public_pem = self.generate_key_pair()
            success = self.store_key_pair(kid, private_pem, public_pem, is_current=True)
            
            if success:
                logger.info(f"JWKS initialized with key {kid}")
                return True
            else:
                logger.error("Failed to initialize JWKS")
                return False
                
        except Exception as e:
            logger.error(f"Error initializing JWKS: {e}")
            return False
    
    def health_check(self) -> Dict[str, Any]:
        """
        Perform health check for JWKS manager.
        
        Returns:
            Health status dictionary
        """
        try:
            # Check if we have a current key
            current_key = self.get_current_key()
            has_current_key = current_key is not None
            
            # Check JWKS generation
            jwks = self.get_public_jwks()
            jwks_healthy = len(jwks.get('keys', [])) > 0
            
            # Test signing and verification
            test_payload = {
                'test': True,
                'iat': int(time.time()),
                'exp': int(time.time()) + 300
            }
            
            test_token = self.sign_jwt(test_payload)
            sign_healthy = test_token is not None
            
            verify_healthy = False
            if test_token:
                verified_payload = self.verify_jwt(test_token)
                verify_healthy = verified_payload is not None
            
            # Check Redis connection
            redis_healthy = self.redis_manager.health_check()['status'] == 'healthy'
            
            overall_healthy = all([
                has_current_key,
                jwks_healthy,
                sign_healthy,
                verify_healthy,
                redis_healthy
            ])
            
            return {
                'status': 'healthy' if overall_healthy else 'unhealthy',
                'current_key': has_current_key,
                'jwks_generation': jwks_healthy,
                'signing': sign_healthy,
                'verification': verify_healthy,
                'redis': redis_healthy,
                'algorithm': self.algorithm,
                'key_count': len(jwks.get('keys', [])),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"JWKS health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }