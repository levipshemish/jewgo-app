"""
Profile Service for managing user profiles and usernames.
Handles profile creation, username validation, and OAuth account linking.
"""

import os
import re
import secrets
from datetime import datetime
from typing import Optional, Dict, Any, List

from sqlalchemy import text

from utils.logging_config import get_logger
from database.unified_connection_manager import get_db_connection

logger = get_logger(__name__)


class ProfileError(Exception):
    """Profile-specific error."""
    pass


class ProfileService:
    """Service for managing user profiles and usernames."""

    def __init__(self):
        self.db = get_db_connection()
        
        # Username validation rules
        self.username_min_length = int(os.getenv('USERNAME_MIN_LENGTH', '3'))
        self.username_max_length = int(os.getenv('USERNAME_MAX_LENGTH', '30'))
        self.username_pattern = re.compile(r'^[a-zA-Z0-9_-]+$')
        
        logger.info(f"ProfileService initialized with username length {self.username_min_length}-{self.username_max_length}")

    def create_profile(self, user_id: str, username: str, display_name: str, **kwargs) -> Dict[str, Any]:
        """Create a new user profile."""
        try:
            # Validate username
            if not self.is_username_valid(username):
                raise ProfileError("Username format is invalid")
            
            if not self.is_username_available(username):
                raise ProfileError("Username is already taken")
            
            with self.db.session_scope() as session:
                # Check if profile already exists
                existing = session.execute(
                    text("SELECT id FROM profiles WHERE id = :user_id"),
                    {'user_id': user_id}
                ).fetchone()
                
                if existing:
                    raise ProfileError("Profile already exists for this user")
                
                # Create profile
                session.execute(
                    text("""
                        INSERT INTO profiles (
                            id, username, display_name, bio, location, website, 
                            phone, avatar_url, preferences, created_at, updated_at
                        )
                        VALUES (
                            :user_id, :username, :display_name, :bio, :location, :website,
                            :phone, :avatar_url, :preferences, NOW(), NOW()
                        )
                    """),
                    {
                        'user_id': user_id,
                        'username': username.lower(),
                        'display_name': display_name,
                        'bio': kwargs.get('bio'),
                        'location': kwargs.get('location'),
                        'website': kwargs.get('website'),
                        'phone': kwargs.get('phone'),
                        'avatar_url': kwargs.get('avatar_url'),
                        'preferences': kwargs.get('preferences')
                    }
                )
                
                logger.info(f"Created profile for user {user_id} with username {username}")
                return self.get_profile(user_id)
                
        except Exception as e:
            logger.error(f"Error creating profile for user {user_id}: {e}", exc_info=True)
            raise ProfileError(f"Failed to create profile: {str(e)}")

    def get_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile by user ID."""
        try:
            with self.db.session_scope() as session:
                result = session.execute(
                    text("""
                        SELECT p.*, u.name, u.email, u.image, u.oauth_provider
                        FROM profiles p
                        JOIN users u ON p.id = u.id
                        WHERE p.id = :user_id
                    """),
                    {'user_id': user_id}
                ).fetchone()
                
                if not result:
                    return None
                
                return {
                    'user_id': result.id,
                    'username': result.username,
                    'display_name': result.display_name,
                    'name': result.name,
                    'email': result.email,
                    'bio': result.bio,
                    'location': result.location,
                    'website': result.website,
                    'phone': result.phone,
                    'avatar_url': result.avatar_url or result.image,  # Prefer profile avatar, fallback to user image
                    'preferences': result.preferences,
                    'oauth_provider': result.oauth_provider,
                    'created_at': result.created_at.isoformat() if result.created_at else None,
                    'updated_at': result.updated_at.isoformat() if result.updated_at else None,
                }
        except Exception as e:
            logger.error(f"Error getting profile for user {user_id}: {e}", exc_info=True)
            return None

    def update_profile(self, user_id: str, updates: Dict[str, Any]) -> bool:
        """Update user profile."""
        try:
            # Validate username if being updated
            if 'username' in updates:
                if not self.is_username_valid(updates['username']):
                    raise ProfileError("Username format is invalid")
                
                # Check availability (excluding current user)
                if not self.is_username_available(updates['username'], exclude_user_id=user_id):
                    raise ProfileError("Username is already taken")
                
                updates['username'] = updates['username'].lower()
            
            # Build update query dynamically
            set_clauses = []
            params = {'user_id': user_id}
            
            allowed_fields = ['username', 'display_name', 'bio', 'location', 'website', 'phone', 'avatar_url', 'preferences']
            for field in allowed_fields:
                if field in updates:
                    set_clauses.append(f"{field} = :{field}")
                    params[field] = updates[field]
            
            if not set_clauses:
                return True  # Nothing to update
            
            set_clauses.append('"updated_at" = NOW()')
            
            with self.db.session_scope() as session:
                result = session.execute(
                    text(f"UPDATE profiles SET {', '.join(set_clauses)} WHERE id = :user_id"),
                    params
                )
                
                success = result.rowcount > 0
                if success:
                    logger.info(f"Updated profile for user {user_id}")
                else:
                    logger.warning(f"No profile found to update for user {user_id}")
                
                return success
                
        except Exception as e:
            logger.error(f"Error updating profile for user {user_id}: {e}", exc_info=True)
            raise ProfileError(f"Failed to update profile: {str(e)}")

    def is_username_valid(self, username: str) -> bool:
        """Validate username format and length."""
        if not username:
            return False
        
        if len(username) < self.username_min_length or len(username) > self.username_max_length:
            return False
        
        if not self.username_pattern.match(username):
            return False
        
        # Additional checks
        if username.lower() in ['admin', 'root', 'system', 'api', 'www', 'mail', 'ftp']:
            return False
        
        return True

    def is_username_available(self, username: str, exclude_user_id: Optional[str] = None) -> bool:
        """Check if username is available."""
        try:
            with self.db.session_scope() as session:
                query = "SELECT id FROM profiles WHERE LOWER(username) = LOWER(:username)"
                params = {'username': username}
                
                if exclude_user_id:
                    query += " AND id != :exclude_user_id"
                    params['exclude_user_id'] = exclude_user_id
                
                result = session.execute(text(query), params).fetchone()
                return result is None
        except Exception as e:
            logger.error(f"Error checking username availability: {e}", exc_info=True)
            return False

    def suggest_usernames(self, base_name: str, count: int = 5) -> List[str]:
        """Suggest available usernames based on a base name."""
        suggestions = []
        base_clean = re.sub(r'[^a-zA-Z0-9]', '', base_name.lower())
        
        if not base_clean:
            base_clean = 'user'
        
        # Try base name first
        if self.is_username_valid(base_clean) and self.is_username_available(base_clean):
            suggestions.append(base_clean)
        
        # Try variations
        for i in range(1, count + 10):  # Generate more than needed
            if len(suggestions) >= count:
                break
            
            # Different patterns
            variations = [
                f"{base_clean}{i}",
                f"{base_clean}_{i}",
                f"{base_clean}{secrets.token_hex(2)}",
                f"{base_clean}_{secrets.token_hex(2)}",
            ]
            
            for variation in variations:
                if len(suggestions) >= count:
                    break
                
                if (len(variation) <= self.username_max_length and 
                    self.is_username_valid(variation) and 
                    self.is_username_available(variation) and
                    variation not in suggestions):
                    suggestions.append(variation)
        
        return suggestions[:count]

    def link_oauth_account(self, user_id: str, provider: str, provider_id: str, profile_data: Dict[str, Any]) -> bool:
        """Link an OAuth account to an existing user."""
        try:
            with self.db.session_scope() as session:
                # Update user with OAuth information
                session.execute(
                    text("""
                        UPDATE users 
                        SET oauth_provider = :provider,
                            oauth_provider_id = :provider_id,
                            oauth_raw_profile = :raw_profile,
                            image = COALESCE(:avatar_url, image),  -- Update image if provided
                            name = COALESCE(:name, name),  -- Update name if provided
                            "updatedAt" = NOW()
                        WHERE id = :user_id
                    """),
                    {
                        'user_id': user_id,
                        'provider': provider,
                        'provider_id': provider_id,
                        'raw_profile': profile_data.get('raw_profile'),
                        'avatar_url': profile_data.get('avatar_url'),
                        'name': profile_data.get('name')
                    }
                )
                
                logger.info(f"Linked {provider} account to user {user_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error linking OAuth account for user {user_id}: {e}", exc_info=True)
            raise ProfileError(f"Failed to link OAuth account: {str(e)}")

    def unlink_oauth_account(self, user_id: str) -> bool:
        """Unlink OAuth account from user."""
        try:
            with self.db.session_scope() as session:
                # Check if user has a password - they need some way to authenticate
                user = session.execute(
                    text("SELECT password_hash FROM users WHERE id = :user_id"),
                    {'user_id': user_id}
                ).fetchone()
                
                if not user or not user.password_hash:
                    raise ProfileError("Cannot unlink OAuth account: User must set a password first")
                
                # Remove OAuth information
                session.execute(
                    text("""
                        UPDATE users 
                        SET oauth_provider = NULL,
                            oauth_provider_id = NULL,
                            oauth_raw_profile = NULL,
                            "updatedAt" = NOW()
                        WHERE id = :user_id
                    """),
                    {'user_id': user_id}
                )
                
                logger.info(f"Unlinked OAuth account from user {user_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error unlinking OAuth account for user {user_id}: {e}", exc_info=True)
            raise ProfileError(f"Failed to unlink OAuth account: {str(e)}")

    def has_profile(self, user_id: str) -> bool:
        """Check if user has a profile."""
        try:
            with self.db.session_scope() as session:
                result = session.execute(
                    text("SELECT id FROM profiles WHERE id = :user_id"),
                    {'user_id': user_id}
                ).fetchone()
                return result is not None
        except Exception as e:
            logger.error(f"Error checking if user {user_id} has profile: {e}", exc_info=True)
            return False

    def get_user_oauth_status(self, user_id: str) -> Dict[str, Any]:
        """Get OAuth status for a user."""
        try:
            with self.db.session_scope() as session:
                result = session.execute(
                    text("""
                        SELECT oauth_provider, oauth_provider_id, password_hash IS NOT NULL as has_password
                        FROM users 
                        WHERE id = :user_id
                    """),
                    {'user_id': user_id}
                ).fetchone()
                
                if not result:
                    return {'has_oauth': False, 'has_password': False, 'can_unlink': False}
                
                return {
                    'has_oauth': bool(result.oauth_provider),
                    'oauth_provider': result.oauth_provider,
                    'has_password': bool(result.has_password),
                    'can_unlink': bool(result.oauth_provider and result.has_password),
                }
        except Exception as e:
            logger.error(f"Error getting OAuth status for user {user_id}: {e}", exc_info=True)
            return {'has_oauth': False, 'has_password': False, 'can_unlink': False}
