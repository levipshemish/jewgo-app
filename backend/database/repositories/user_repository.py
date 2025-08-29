from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, or_
from utils.logging_config import get_logger

from ..base_repository import BaseRepository
from ..connection_manager import DatabaseConnectionManager
from ..models import Account
from ..models import Session as UserSession
from ..models import User

logger = get_logger(__name__)

#!/usr/bin/env python3
"""User repository for database operations.

This module handles all user-related database operations,
separating data access logic from business logic.
"""


class UserRepository(BaseRepository[User]):
    """Repository for user database operations."""

    def __init__(self, connection_manager: DatabaseConnectionManager):
        """Initialize user repository."""
        super().__init__(connection_manager, User)
        self.logger = logger.bind(repository="UserRepository")

    def get_users(
        self,
        limit: int = 20,
        offset: int = 0,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[User]:
        """Get users with optional filtering and pagination."""
        try:
            session = self.connection_manager.get_session()
            query = session.query(User)

            # Apply filters
            if filters:
                if filters.get("search"):
                    search = f"%{filters['search']}%"
                    query = query.filter(
                        or_(User.name.ilike(search), User.email.ilike(search))
                    )
                if filters.get("role"):
                    if filters["role"] == "admin":
                        query = query.filter(User.isSuperAdmin == True)
                    elif filters["role"] == "user":
                        query = query.filter(User.isSuperAdmin == False)
                if filters.get("email_verified"):
                    if filters["email_verified"]:
                        query = query.filter(User.emailVerified.isnot(None))
                    else:
                        query = query.filter(User.emailVerified.is_(None))

            # Apply pagination and ordering
            users = (
                query.order_by(User.createdAt.desc()).offset(offset).limit(limit).all()
            )
            session.close()
            return users

        except Exception as e:
            self.logger.exception("Error getting users", error=str(e))
            return []

    def get_users_count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Get total count of users with optional filtering."""
        try:
            session = self.connection_manager.get_session()
            query = session.query(User)

            # Apply filters
            if filters:
                if filters.get("search"):
                    search = f"%{filters['search']}%"
                    query = query.filter(
                        or_(User.name.ilike(search), User.email.ilike(search))
                    )
                if filters.get("role"):
                    if filters["role"] == "admin":
                        query = query.filter(User.isSuperAdmin == True)
                    elif filters["role"] == "user":
                        query = query.filter(User.isSuperAdmin == False)
                if filters.get("email_verified"):
                    if filters["email_verified"]:
                        query = query.filter(User.emailVerified.isnot(None))
                    else:
                        query = query.filter(User.emailVerified.is_(None))

            count = query.count()
            session.close()
            return count

        except Exception as e:
            self.logger.exception("Error getting users count", error=str(e))
            return 0

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email address."""
        try:
            session = self.connection_manager.get_session()
            user = session.query(User).filter(User.email == email).first()
            session.close()
            return user

        except Exception as e:
            self.logger.exception("Error getting user by email", error=str(e))
            return None

    def get_admin_users(self) -> List[User]:
        """Get all admin users."""
        try:
            session = self.connection_manager.get_session()
            admins = (
                session.query(User)
                .filter(User.isSuperAdmin == True)
                .order_by(User.createdAt.desc())
                .all()
            )
            session.close()
            return admins

        except Exception as e:
            self.logger.exception("Error getting admin users", error=str(e))
            return []

    def get_admin_count(self) -> int:
        """Get count of admin users."""
        try:
            session = self.connection_manager.get_session()
            count = session.query(User).filter(User.isSuperAdmin == True).count()
            session.close()
            return count

        except Exception as e:
            self.logger.exception("Error getting admin count", error=str(e))
            return 0

    def update_user_role(self, user_id: str, is_super_admin: bool) -> bool:
        """Update user's admin role."""
        try:
            update_data = {
                "isSuperAdmin": is_super_admin,
                "updatedAt": datetime.utcnow(),
            }

            success = self.update(user_id, update_data)
            if success:
                self.logger.info(
                    "Updated user role", user_id=user_id, is_super_admin=is_super_admin
                )
            return success

        except Exception as e:
            self.logger.exception("Error updating user role", error=str(e))
            return False

    def delete_user(self, user_id: str) -> bool:
        """Delete a user (admin only)."""
        try:
            # Check if this is the last admin
            if self._is_last_admin(user_id):
                self.logger.warning("Cannot delete last super admin", user_id=user_id)
                return False

            success = super().delete(user_id)
            if success:
                self.logger.info("Deleted user", user_id=user_id)
            return success

        except Exception as e:
            self.logger.exception("Error deleting user", error=str(e))
            return False

    def _is_last_admin(self, user_id: str) -> bool:
        """Check if the user is the last admin."""
        try:
            session = self.connection_manager.get_session()
            user = session.query(User).filter(User.id == user_id).first()

            if not user or not user.isSuperAdmin:
                session.close()
                return False

            admin_count = session.query(User).filter(User.isSuperAdmin == True).count()
            session.close()

            return admin_count <= 1

        except Exception as e:
            self.logger.exception("Error checking if last admin", error=str(e))
            return False

    def get_user_statistics(self) -> Dict[str, Any]:
        """Get user statistics."""
        try:
            session = self.connection_manager.get_session()

            # Total users
            total_users = session.query(User).count()

            # Admin users
            admin_count = session.query(User).filter(User.isSuperAdmin == True).count()

            # Users with verified email
            verified_count = (
                session.query(User).filter(User.emailVerified.isnot(None)).count()
            )

            # Users by creation date (last 30 days)
            thirty_days_ago = datetime.utcnow() - datetime.timedelta(days=30)
            recent_users = (
                session.query(User).filter(User.createdAt >= thirty_days_ago).count()
            )

            session.close()

            return {
                "total_users": total_users,
                "admin_users": admin_count,
                "regular_users": total_users - admin_count,
                "verified_users": verified_count,
                "unverified_users": total_users - verified_count,
                "recent_users_30_days": recent_users,
            }

        except Exception as e:
            self.logger.exception("Error getting user statistics", error=str(e))
            return {}

    def get_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """Get active sessions for a user."""
        try:
            session = self.connection_manager.get_session()
            user_sessions = (
                session.query(UserSession)
                .filter(
                    and_(
                        UserSession.userId == user_id,
                        UserSession.expires > datetime.utcnow(),
                    )
                )
                .order_by(UserSession.expires.desc())
                .all()
            )

            result = []
            for user_session in user_sessions:
                session_dict = {
                    "id": user_session.id,
                    "sessionToken": user_session.sessionToken,
                    "userId": user_session.userId,
                    "expires": user_session.expires.isoformat()
                    if user_session.expires
                    else None,
                }
                result.append(session_dict)

            session.close()
            return result

        except Exception as e:
            self.logger.exception("Error getting user sessions", error=str(e))
            return []

    def get_user_accounts(self, user_id: str) -> List[Dict[str, Any]]:
        """Get OAuth accounts for a user."""
        try:
            session = self.connection_manager.get_session()
            accounts = (
                session.query(Account)
                .filter(Account.userId == user_id)
                .order_by(Account.provider)
                .all()
            )

            result = []
            for account in accounts:
                account_dict = {
                    "id": account.id,
                    "userId": account.userId,
                    "type": account.type,
                    "provider": account.provider,
                    "providerAccountId": account.providerAccountId,
                    "expires_at": account.expires_at,
                    "token_type": account.token_type,
                    "scope": account.scope,
                }
                result.append(account_dict)

            session.close()
            return result

        except Exception as e:
            self.logger.exception("Error getting user accounts", error=str(e))
            return []

    def delete_user_sessions(self, user_id: str) -> bool:
        """Delete all sessions for a user."""
        try:
            session = self.connection_manager.get_session()
            deleted_count = (
                session.query(UserSession)
                .filter(UserSession.userId == user_id)
                .delete()
            )
            session.commit()
            session.close()

            self.logger.info(
                "Deleted user sessions", user_id=user_id, count=deleted_count
            )
            return True

        except Exception as e:
            self.logger.exception("Error deleting user sessions", error=str(e))
            return False

    def delete_user_accounts(self, user_id: str) -> bool:
        """Delete all OAuth accounts for a user."""
        try:
            session = self.connection_manager.get_session()
            deleted_count = (
                session.query(Account).filter(Account.userId == user_id).delete()
            )
            session.commit()
            session.close()

            self.logger.info(
                "Deleted user accounts", user_id=user_id, count=deleted_count
            )
            return True

        except Exception as e:
            self.logger.exception("Error deleting user accounts", error=str(e))
            return False
