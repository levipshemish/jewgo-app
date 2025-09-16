"""
Session Family Manager - Manages token families and rotation with replay hardening.

This module provides session family management with one-time use refresh tokens,
replay attack detection, and family-wide revocation capabilities.
"""

import os
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, Optional, List, Tuple
from sqlalchemy import text
from utils.logging_config import get_logger
from cache.redis_manager_v5 import get_redis_manager_v5
from database.connection_manager import get_connection_manager

logger = get_logger(__name__)


class SessionFamilyManager:
    """Manages session families with replay hardening and rotation."""
    
    def __init__(self, redis_manager=None, connection_manager=None):
        """
        Initialize SessionFamilyManager.
        
        Args:
            redis_manager: Redis manager instance (optional)
            connection_manager: Database connection manager (optional)
        """
        self.redis_manager = redis_manager or get_redis_manager_v5()
        self.connection_manager = connection_manager or get_connection_manager()
        self.refresh_mutex_ttl = int(os.getenv('REFRESH_MUTEX_TTL_SECONDS', '10'))
        
        logger.info("SessionFamilyManager initialized")
    
    def create_session_family(self, user_id: str, device_info: Dict[str, Any]) -> str:
        """
        Create new session family with device binding.
        
        Args:
            user_id: User ID
            device_info: Device information (user_agent, ip_address, etc.)
            
        Returns:
            Family ID
        """
        try:
            family_id = secrets.token_hex(16)
            session_id = secrets.token_hex(16)
            
            # Extract device information
            user_agent = device_info.get('user_agent', '')
            ip_address = device_info.get('ip_address', '')
            device_hash = self._generate_device_hash(user_agent, ip_address)
            
            # Get IP CIDR for tracking
            ip_cidr = self._get_ip_cidr(ip_address)
            
            with self.connection_manager.session_scope() as session:
                # Insert new session family
                session.execute(
                    text("""
                        INSERT INTO auth_sessions (
                            id, user_id, family_id, current_jti, refresh_token_hash,
                            device_hash, last_ip_cidr, user_agent, ip_address,
                            auth_time, created_at, last_used, expires_at
                        ) VALUES (
                            :session_id, :user_id, :family_id, NULL, NULL,
                            :device_hash, :ip_cidr, :user_agent, :ip_address,
                            NOW(), NOW(), NOW(), NOW() + INTERVAL '30 days'
                        )
                    """),
                    {
                        'session_id': session_id,
                        'user_id': user_id,
                        'family_id': family_id,
                        'device_hash': device_hash,
                        'ip_cidr': ip_cidr,
                        'user_agent': user_agent[:500],  # Truncate to prevent overflow
                        'ip_address': ip_address
                    }
                )
                
                logger.info(f"Session family created: {family_id} for user {user_id}")
                return family_id
                
        except Exception as e:
            logger.error(f"Error creating session family: {e}")
            raise
    
    def rotate_session(self, family_id: str, current_jti: str, new_jti: str, 
                      refresh_token_hash: str) -> Tuple[bool, Optional[str]]:
        """
        Rotate session within family with replay detection.
        
        Args:
            family_id: Session family ID
            current_jti: Current JWT ID being used
            new_jti: New JWT ID to set
            refresh_token_hash: Hash of the refresh token
            
        Returns:
            Tuple of (success, error_message)
        """
        mutex_key = f"refresh_mutex:{family_id}"
        
        try:
            # Acquire refresh mutex using Redis SET NX with TTL
            mutex_acquired = self.redis_manager.set_if_not_exists(
                mutex_key, 
                "locked", 
                ttl=self.refresh_mutex_ttl,
                prefix='auth'
            )
            
            if not mutex_acquired:
                logger.warning(f"Refresh mutex already held for family {family_id}")
                return False, "Concurrent refresh detected - please retry"
            
            try:
                with self.connection_manager.session_scope() as session:
                    # Get current session state
                    result = session.execute(
                        text("""
                            SELECT current_jti, revoked_at, reused_jti_of
                            FROM auth_sessions 
                            WHERE family_id = :family_id
                            AND revoked_at IS NULL
                        """),
                        {'family_id': family_id}
                    ).fetchone()
                    
                    if not result:
                        return False, "Session family not found or already revoked"
                    
                    stored_jti = result.current_jti
                    revoked_at = result.revoked_at
                    reused_jti_of = result.reused_jti_of
                    
                    # Check for replay attack
                    if stored_jti and stored_jti != current_jti:
                        # This is a replay attack - revoke the entire family
                        logger.warning(f"Replay attack detected for family {family_id}: "
                                     f"expected {stored_jti}, got {current_jti}")
                        
                        self._revoke_family_internal(session, family_id, 
                                                   "replay_attack", current_jti)
                        
                        return False, "Token replay detected - session family revoked"
                    
                    # Check if this JTI was already used
                    if current_jti:
                        reuse_check = session.execute(
                            text("""
                                SELECT id FROM auth_sessions 
                                WHERE reused_jti_of = :jti
                                OR current_jti = :jti
                            """),
                            {'jti': current_jti}
                        ).fetchone()
                        
                        if reuse_check:
                            logger.warning(f"JTI reuse detected for family {family_id}: {current_jti}")
                            self._revoke_family_internal(session, family_id, 
                                                       "jti_reuse", current_jti)
                            return False, "Token reuse detected - session family revoked"
                    
                    # Perform rotation
                    session.execute(
                        text("""
                            UPDATE auth_sessions SET
                                current_jti = :new_jti,
                                refresh_token_hash = :token_hash,
                                rotated_from = :old_jti,
                                last_used = NOW()
                            WHERE family_id = :family_id
                            AND revoked_at IS NULL
                        """),
                        {
                            'family_id': family_id,
                            'new_jti': new_jti,
                            'token_hash': refresh_token_hash,
                            'old_jti': current_jti
                        }
                    )
                    
                    # Cache the new JTI for fast lookup
                    self.redis_manager.set(
                        f"jti:{new_jti}",
                        family_id,
                        ttl=3600,  # 1 hour cache
                        prefix='auth'
                    )
                    
                    logger.info(f"Session rotated successfully for family {family_id}")
                    return True, None
                    
            finally:
                # Always release the mutex
                self.redis_manager.delete(mutex_key, prefix='auth')
                
        except Exception as e:
            logger.error(f"Error rotating session for family {family_id}: {e}")
            return False, f"Session rotation failed: {str(e)}"
    
    def revoke_family(self, family_id: str, reason: str = "user_logout") -> bool:
        """
        Revoke entire session family.
        
        Args:
            family_id: Session family ID to revoke
            reason: Reason for revocation
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with self.connection_manager.session_scope() as session:
                return self._revoke_family_internal(session, family_id, reason)
                
        except Exception as e:
            logger.error(f"Error revoking family {family_id}: {e}")
            return False
    
    def _revoke_family_internal(self, session, family_id: str, reason: str, 
                               reused_jti: Optional[str] = None) -> bool:
        """
        Internal method to revoke family within existing transaction.
        
        Args:
            session: Database session
            family_id: Family ID to revoke
            reason: Revocation reason
            reused_jti: JTI that was reused (optional)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Mark family as revoked
            session.execute(
                text("""
                    UPDATE auth_sessions SET
                        revoked_at = NOW(),
                        revocation_reason = :reason,
                        reused_jti_of = :reused_jti
                    WHERE family_id = :family_id
                    AND revoked_at IS NULL
                """),
                {
                    'family_id': family_id,
                    'reason': reason,
                    'reused_jti': reused_jti
                }
            )
            
            # Cache revocation for fast lookup
            self.redis_manager.set(
                f"revoked_family:{family_id}",
                reason,
                ttl=86400,  # 24 hours cache
                prefix='auth'
            )
            
            logger.info(f"Family {family_id} revoked: {reason}")
            return True
            
        except Exception as e:
            logger.error(f"Error in _revoke_family_internal: {e}")
            return False
    
    def is_family_revoked(self, family_id: str) -> bool:
        """
        Check if session family is revoked.
        
        Args:
            family_id: Family ID to check
            
        Returns:
            True if revoked, False otherwise
        """
        try:
            # Check cache first
            cached_revocation = self.redis_manager.get(
                f"revoked_family:{family_id}",
                prefix='auth'
            )
            
            if cached_revocation:
                return True
            
            # Check database
            with self.connection_manager.session_scope() as session:
                result = session.execute(
                    text("""
                        SELECT revoked_at FROM auth_sessions 
                        WHERE family_id = :family_id
                        LIMIT 1
                    """),
                    {'family_id': family_id}
                ).fetchone()
                
                if result and result.revoked_at:
                    # Cache the revocation
                    self.redis_manager.set(
                        f"revoked_family:{family_id}",
                        "revoked",
                        ttl=86400,
                        prefix='auth'
                    )
                    return True
                
                return False
                
        except Exception as e:
            logger.error(f"Error checking family revocation {family_id}: {e}")
            return True  # Fail safe - assume revoked on error
    
    def is_jti_revoked(self, jti: str) -> bool:
        """
        Check if specific JTI is revoked.
        
        Args:
            jti: JWT ID to check
            
        Returns:
            True if revoked, False otherwise
        """
        try:
            # Check cache first
            cached_family = self.redis_manager.get(f"jti:{jti}", prefix='auth')
            if cached_family:
                return self.is_family_revoked(cached_family)
            
            # Check database
            with self.connection_manager.session_scope() as session:
                result = session.execute(
                    text("""
                        SELECT family_id, revoked_at FROM auth_sessions 
                        WHERE current_jti = :jti OR reused_jti_of = :jti
                        LIMIT 1
                    """),
                    {'jti': jti}
                ).fetchone()
                
                if result:
                    if result.revoked_at:
                        return True
                    return self.is_family_revoked(result.family_id)
                
                return False
                
        except Exception as e:
            logger.error(f"Error checking JTI revocation {jti}: {e}")
            return True  # Fail safe
    
    def list_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """
        List active sessions for user account management.
        
        Args:
            user_id: User ID
            
        Returns:
            List of session information dictionaries
        """
        try:
            with self.connection_manager.session_scope() as session:
                results = session.execute(
                    text("""
                        SELECT 
                            family_id,
                            device_hash,
                            last_ip_cidr,
                            user_agent,
                            auth_time,
                            created_at,
                            last_used,
                            expires_at
                        FROM auth_sessions 
                        WHERE user_id = :user_id 
                        AND revoked_at IS NULL
                        AND expires_at > NOW()
                        ORDER BY last_used DESC
                    """),
                    {'user_id': user_id}
                ).mappings().all()
                
                sessions = []
                for row in results:
                    session_info = {
                        'family_id': row['family_id'],
                        'device_hash': row['device_hash'],
                        'ip_cidr': row['last_ip_cidr'],
                        'user_agent': row['user_agent'],
                        'auth_time': row['auth_time'].isoformat() if row['auth_time'] else None,
                        'created_at': row['created_at'].isoformat() if row['created_at'] else None,
                        'last_used': row['last_used'].isoformat() if row['last_used'] else None,
                        'expires_at': row['expires_at'].isoformat() if row['expires_at'] else None,
                        'device_type': self._parse_device_type(row['user_agent']),
                        'location': self._parse_location(row['last_ip_cidr'])
                    }
                    sessions.append(session_info)
                
                return sessions
                
        except Exception as e:
            logger.error(f"Error listing user sessions {user_id}: {e}")
            return []
    
    def revoke_user_session(self, user_id: str, family_id: str) -> bool:
        """
        Revoke specific user session.
        
        Args:
            user_id: User ID (for authorization)
            family_id: Family ID to revoke
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with self.connection_manager.session_scope() as session:
                # Verify session belongs to user
                result = session.execute(
                    text("""
                        SELECT id FROM auth_sessions 
                        WHERE family_id = :family_id 
                        AND user_id = :user_id
                        AND revoked_at IS NULL
                    """),
                    {'family_id': family_id, 'user_id': user_id}
                ).fetchone()
                
                if not result:
                    logger.warning(f"Session {family_id} not found for user {user_id}")
                    return False
                
                return self._revoke_family_internal(session, family_id, "user_revoked")
                
        except Exception as e:
            logger.error(f"Error revoking user session {family_id}: {e}")
            return False
    
    def revoke_all_user_sessions(self, user_id: str, except_family_id: Optional[str] = None) -> int:
        """
        Revoke all user sessions except optionally one.
        
        Args:
            user_id: User ID
            except_family_id: Family ID to keep active (optional)
            
        Returns:
            Number of sessions revoked
        """
        try:
            with self.connection_manager.session_scope() as session:
                # Get all active sessions for user
                query = """
                    SELECT family_id FROM auth_sessions 
                    WHERE user_id = :user_id 
                    AND revoked_at IS NULL
                """
                params = {'user_id': user_id}
                
                if except_family_id:
                    query += " AND family_id != :except_family_id"
                    params['except_family_id'] = except_family_id
                
                results = session.execute(text(query), params).fetchall()
                
                revoked_count = 0
                for row in results:
                    if self._revoke_family_internal(session, row.family_id, "logout_all"):
                        revoked_count += 1
                
                logger.info(f"Revoked {revoked_count} sessions for user {user_id}")
                return revoked_count
                
        except Exception as e:
            logger.error(f"Error revoking all user sessions {user_id}: {e}")
            return 0
    
    def cleanup_expired_sessions(self) -> int:
        """
        Clean up expired sessions from database.
        
        Returns:
            Number of sessions cleaned up
        """
        try:
            with self.connection_manager.session_scope() as session:
                result = session.execute(
                    text("""
                        DELETE FROM auth_sessions 
                        WHERE expires_at < NOW() - INTERVAL '7 days'
                        OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '7 days')
                    """)
                )
                
                cleaned_count = result.rowcount
                logger.info(f"Cleaned up {cleaned_count} expired sessions")
                return cleaned_count
                
        except Exception as e:
            logger.error(f"Error cleaning up expired sessions: {e}")
            return 0
    
    def _generate_device_hash(self, user_agent: str, ip_address: str) -> str:
        """Generate device hash from user agent and IP."""
        import hashlib
        
        # Create a stable hash from user agent and IP network
        ip_network = self._get_ip_cidr(ip_address)
        device_string = f"{user_agent}:{ip_network}"
        
        return hashlib.sha256(device_string.encode()).hexdigest()[:32]
    
    def _get_ip_cidr(self, ip_address: str) -> str:
        """Get IP CIDR for tracking (mask last octet for privacy)."""
        try:
            import ipaddress
            
            ip = ipaddress.ip_address(ip_address)
            if ip.version == 4:
                # IPv4: mask last octet (e.g., 192.168.1.0/24)
                network = ipaddress.ip_network(f"{ip_address}/24", strict=False)
                return str(network)
            else:
                # IPv6: mask last 64 bits
                network = ipaddress.ip_network(f"{ip_address}/64", strict=False)
                return str(network)
                
        except Exception:
            return "unknown"
    
    def _parse_device_type(self, user_agent: str) -> str:
        """Parse device type from user agent."""
        if not user_agent:
            return "unknown"
        
        user_agent_lower = user_agent.lower()
        
        if any(mobile in user_agent_lower for mobile in ['mobile', 'android', 'iphone', 'ipad']):
            return "mobile"
        elif any(tablet in user_agent_lower for tablet in ['tablet', 'ipad']):
            return "tablet"
        else:
            return "desktop"
    
    def _parse_location(self, ip_cidr: str) -> str:
        """Parse approximate location from IP CIDR (placeholder)."""
        # In a real implementation, this would use a GeoIP service
        if ip_cidr.startswith("192.168.") or ip_cidr.startswith("10.") or ip_cidr.startswith("172."):
            return "Local Network"
        else:
            return "External"
    
    def health_check(self) -> Dict[str, Any]:
        """
        Perform health check for session family manager.
        
        Returns:
            Health status dictionary
        """
        try:
            # Test Redis connection
            redis_healthy = self.redis_manager.health_check()['status'] == 'healthy'
            
            # Test database connection
            with self.connection_manager.session_scope() as session:
                session.execute(text("SELECT 1")).fetchone()
                db_healthy = True
            
            # Test mutex functionality
            test_key = f"health_check_mutex_{secrets.token_hex(8)}"
            mutex_healthy = self.redis_manager.set_if_not_exists(
                test_key, "test", ttl=1, prefix='auth'
            )
            if mutex_healthy:
                self.redis_manager.delete(test_key, prefix='auth')
            
            return {
                'status': 'healthy' if all([redis_healthy, db_healthy, mutex_healthy]) else 'unhealthy',
                'redis': redis_healthy,
                'database': db_healthy,
                'mutex': mutex_healthy,
                'refresh_mutex_ttl': self.refresh_mutex_ttl,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"SessionFamilyManager health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }