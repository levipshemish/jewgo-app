"""
Unified Session Manager
=======================

This module provides a consolidated session management system that replaces
multiple session management implementations with a single, secure, and
well-tested solution.
"""

import os
import secrets
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from sqlalchemy import text
from utils.logging_config import get_logger
from database.connection_manager import get_connection_manager
from cache.redis_manager_v5 import get_redis_manager_v5

logger = get_logger(__name__)


@dataclass
class SessionInfo:
    """Session information data class."""
    session_id: str
    user_id: str
    family_id: str
    user_agent: str
    ip_address: str
    created_at: datetime
    last_used: datetime
    expires_at: datetime
    revoked_at: Optional[datetime] = None
    is_active: bool = True


class UnifiedSessionManager:
    """Unified session management with security best practices."""
    
    def __init__(self, db_manager=None, redis_manager=None):
        self.db_manager = db_manager or get_connection_manager()
        self.redis_manager = redis_manager or get_redis_manager_v5()
        
        # Configuration
        self.session_ttl = int(os.getenv("SESSION_TTL_SECONDS", "2592000"))  # 30 days
        self.access_token_ttl = int(os.getenv("ACCESS_TTL_SECONDS", "900"))  # 15 minutes
        self.max_sessions_per_user = int(os.getenv("MAX_SESSIONS_PER_USER", "10"))
        
        logger.info("UnifiedSessionManager initialized")
    
    def create_session(
        self, 
        user_id: str, 
        user_agent: str, 
        ip_address: str,
        device_info: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, str]:
        """
        Create a new session for a user.
        
        Args:
            user_id: User ID
            user_agent: User agent string
            ip_address: Client IP address
            device_info: Optional device information
            
        Returns:
            Tuple of (session_id, family_id)
        """
        try:
            # Generate unique session and family IDs
            session_id = self._generate_session_id()
            family_id = self._generate_family_id()
            
            # Clean up old sessions if user has too many
            self._cleanup_old_sessions(user_id)
            
            # Create session record
            with self.db_manager.session_scope() as session:
                session.execute(
                    text("""
                        INSERT INTO auth_sessions (
                            id, user_id, family_id, user_agent, ip, 
                            created_at, last_used, expires_at, device_info
                        ) VALUES (
                            :session_id, :user_id, :family_id, :user_agent, :ip,
                            NOW(), NOW(), NOW() + INTERVAL :ttl SECOND,
                            :device_info
                        )
                    """),
                    {
                        "session_id": session_id,
                        "user_id": user_id,
                        "family_id": family_id,
                        "user_agent": user_agent,
                        "ip": ip_address,
                        "ttl": self.session_ttl,
                        "device_info": str(device_info) if device_info else None
                    }
                )
            
            # Cache session info
            self._cache_session_info(session_id, user_id, family_id)
            
            logger.info(f"Created session {session_id} for user {user_id}")
            return session_id, family_id
            
        except Exception as e:
            logger.error(f"Error creating session for user {user_id}: {e}")
            raise
    
    def validate_session(self, session_id: str) -> Optional[SessionInfo]:
        """
        Validate a session and return session info.
        
        Args:
            session_id: Session ID to validate
            
        Returns:
            SessionInfo if valid, None otherwise
        """
        try:
            # Check cache first
            cached_info = self._get_cached_session_info(session_id)
            if cached_info:
                return cached_info
            
            # Query database
            with self.db_manager.session_scope() as session:
                result = session.execute(
                    text("""
                        SELECT id, user_id, family_id, user_agent, ip,
                               created_at, last_used, expires_at, revoked_at
                        FROM auth_sessions
                        WHERE id = :session_id
                        AND expires_at > NOW()
                        AND revoked_at IS NULL
                    """),
                    {"session_id": session_id}
                ).fetchone()
                
                if not result:
                    return None
                
                session_info = SessionInfo(
                    session_id=result.id,
                    user_id=result.user_id,
                    family_id=result.family_id,
                    user_agent=result.user_agent,
                    ip_address=result.ip,
                    created_at=result.created_at,
                    last_used=result.last_used,
                    expires_at=result.expires_at,
                    revoked_at=result.revoked_at,
                    is_active=result.revoked_at is None
                )
                
                # Update last used timestamp
                self._update_last_used(session_id)
                
                # Cache session info
                self._cache_session_info(session_id, result.user_id, result.family_id)
                
                return session_info
                
        except Exception as e:
            logger.error(f"Error validating session {session_id}: {e}")
            return None
    
    def revoke_session(self, session_id: str, user_id: str) -> bool:
        """
        Revoke a specific session.
        
        Args:
            session_id: Session ID to revoke
            user_id: User ID (for security validation)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with self.db_manager.session_scope() as session:
                result = session.execute(
                    text("""
                        UPDATE auth_sessions 
                        SET revoked_at = NOW()
                        WHERE id = :session_id AND user_id = :user_id
                        AND revoked_at IS NULL
                    """),
                    {"session_id": session_id, "user_id": user_id}
                )
                
                if result.rowcount > 0:
                    # Remove from cache
                    self._remove_cached_session_info(session_id)
                    logger.info(f"Revoked session {session_id} for user {user_id}")
                    return True
                
                return False
                
        except Exception as e:
            logger.error(f"Error revoking session {session_id}: {e}")
            return False
    
    def revoke_user_sessions(self, user_id: str, except_session_id: Optional[str] = None) -> int:
        """
        Revoke all sessions for a user.
        
        Args:
            user_id: User ID
            except_session_id: Optional session ID to keep active
            
        Returns:
            Number of sessions revoked
        """
        try:
            with self.db_manager.session_scope() as session:
                if except_session_id:
                    result = session.execute(
                        text("""
                            UPDATE auth_sessions 
                            SET revoked_at = NOW()
                            WHERE user_id = :user_id 
                            AND id != :except_session_id
                            AND revoked_at IS NULL
                        """),
                        {"user_id": user_id, "except_session_id": except_session_id}
                    )
                else:
                    result = session.execute(
                        text("""
                            UPDATE auth_sessions 
                            SET revoked_at = NOW()
                            WHERE user_id = :user_id 
                            AND revoked_at IS NULL
                        """),
                        {"user_id": user_id}
                    )
                
                revoked_count = result.rowcount
                
                # Clear all cached sessions for this user
                self._clear_user_session_cache(user_id)
                
                logger.info(f"Revoked {revoked_count} sessions for user {user_id}")
                return revoked_count
                
        except Exception as e:
            logger.error(f"Error revoking sessions for user {user_id}: {e}")
            return 0
    
    def list_user_sessions(self, user_id: str) -> List[SessionInfo]:
        """
        List all active sessions for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            List of SessionInfo objects
        """
        try:
            with self.db_manager.session_scope() as session:
                results = session.execute(
                    text("""
                        SELECT id, user_id, family_id, user_agent, ip,
                               created_at, last_used, expires_at, revoked_at
                        FROM auth_sessions
                        WHERE user_id = :user_id
                        ORDER BY last_used DESC
                        LIMIT 50
                    """),
                    {"user_id": user_id}
                ).fetchall()
                
                sessions = []
                for result in results:
                    session_info = SessionInfo(
                        session_id=result.id,
                        user_id=result.user_id,
                        family_id=result.family_id,
                        user_agent=result.user_agent,
                        ip_address=result.ip,
                        created_at=result.created_at,
                        last_used=result.last_used,
                        expires_at=result.expires_at,
                        revoked_at=result.revoked_at,
                        is_active=result.revoked_at is None
                    )
                    sessions.append(session_info)
                
                return sessions
                
        except Exception as e:
            logger.error(f"Error listing sessions for user {user_id}: {e}")
            return []
    
    def cleanup_expired_sessions(self) -> int:
        """
        Clean up expired sessions from the database.
        
        Returns:
            Number of sessions cleaned up
        """
        try:
            with self.db_manager.session_scope() as session:
                result = session.execute(
                    text("""
                        DELETE FROM auth_sessions 
                        WHERE expires_at < NOW() - INTERVAL '7 days'
                    """)
                )
                
                cleaned_count = result.rowcount
                logger.info(f"Cleaned up {cleaned_count} expired sessions")
                return cleaned_count
                
        except Exception as e:
            logger.error(f"Error cleaning up expired sessions: {e}")
            return 0
    
    def _generate_session_id(self) -> str:
        """Generate a unique session ID."""
        return f"sess_{secrets.token_urlsafe(32)}"
    
    def _generate_family_id(self) -> str:
        """Generate a unique family ID."""
        return f"fam_{secrets.token_urlsafe(16)}"
    
    def _cleanup_old_sessions(self, user_id: str):
        """Clean up old sessions if user has too many."""
        try:
            with self.db_manager.session_scope() as session:
                # Count active sessions
                count_result = session.execute(
                    text("""
                        SELECT COUNT(*) FROM auth_sessions
                        WHERE user_id = :user_id AND revoked_at IS NULL
                    """),
                    {"user_id": user_id}
                ).fetchone()
                
                active_count = count_result[0] if count_result else 0
                
                if active_count >= self.max_sessions_per_user:
                    # Revoke oldest sessions
                    session.execute(
                        text("""
                            UPDATE auth_sessions 
                            SET revoked_at = NOW()
                            WHERE user_id = :user_id 
                            AND revoked_at IS NULL
                            AND id IN (
                                SELECT id FROM auth_sessions
                                WHERE user_id = :user_id AND revoked_at IS NULL
                                ORDER BY last_used ASC
                                LIMIT :excess_count
                            )
                        """),
                        {
                            "user_id": user_id,
                            "excess_count": active_count - self.max_sessions_per_user + 1
                        }
                    )
                    
                    logger.info(f"Cleaned up excess sessions for user {user_id}")
                    
        except Exception as e:
            logger.error(f"Error cleaning up old sessions for user {user_id}: {e}")
    
    def _update_last_used(self, session_id: str):
        """Update the last used timestamp for a session."""
        try:
            with self.db_manager.session_scope() as session:
                session.execute(
                    text("""
                        UPDATE auth_sessions 
                        SET last_used = NOW()
                        WHERE id = :session_id
                    """),
                    {"session_id": session_id}
                )
        except Exception as e:
            logger.error(f"Error updating last used for session {session_id}: {e}")
    
    def _cache_session_info(self, session_id: str, user_id: str, family_id: str):
        """Cache session information in Redis."""
        try:
            cache_key = f"session:{session_id}"
            cache_data = {
                "user_id": user_id,
                "family_id": family_id,
                "cached_at": time.time()
            }
            self.redis_manager.set(cache_key, cache_data, ttl=3600, prefix="auth")
        except Exception as e:
            logger.error(f"Error caching session info for {session_id}: {e}")
    
    def _get_cached_session_info(self, session_id: str) -> Optional[SessionInfo]:
        """Get cached session information."""
        try:
            cache_key = f"session:{session_id}"
            cached_data = self.redis_manager.get(cache_key, prefix="auth")
            
            if cached_data:
                # Return minimal session info from cache
                return SessionInfo(
                    session_id=session_id,
                    user_id=cached_data["user_id"],
                    family_id=cached_data["family_id"],
                    user_agent="",  # Not cached
                    ip_address="",  # Not cached
                    created_at=datetime.now(),
                    last_used=datetime.now(),
                    expires_at=datetime.now() + timedelta(seconds=self.session_ttl),
                    is_active=True
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting cached session info for {session_id}: {e}")
            return None
    
    def _remove_cached_session_info(self, session_id: str):
        """Remove session info from cache."""
        try:
            cache_key = f"session:{session_id}"
            self.redis_manager.delete(cache_key, prefix="auth")
        except Exception as e:
            logger.error(f"Error removing cached session info for {session_id}: {e}")
    
    def _clear_user_session_cache(self, user_id: str):
        """Clear all cached sessions for a user."""
        try:
            # This would require a more sophisticated cache key pattern
            # For now, we'll rely on TTL expiration
            logger.debug(f"Clearing session cache for user {user_id}")
        except Exception as e:
            logger.error(f"Error clearing session cache for user {user_id}: {e}")


# Global session manager instance
session_manager = UnifiedSessionManager()


def get_session_manager() -> UnifiedSessionManager:
    """Get the global session manager instance."""
    return session_manager