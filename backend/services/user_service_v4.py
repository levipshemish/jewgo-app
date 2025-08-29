from typing import Any, Dict, List, Optional

from services.base_service import BaseService
from utils.error_handler import NotFoundError, ValidationError

#!/usr/bin/env python3
"""User service v4 - handles all user-related business logic using DatabaseManager v4."""


class UserServiceV4(BaseService):
    """Service for user-related operations using DatabaseManager v4."""

    def get_users(
        self,
        limit: int = 20,
        offset: int = 0,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Get users with optional filtering and pagination.

        Args:
            limit: Maximum number of users to return
            offset: Number of users to skip
            filters: Optional filters to apply

        Returns:
            List of user dictionaries

        """
        self.log_operation("get_users", limit=limit, offset=offset)

        try:
            # Use database manager v4's get_users method
            users = self.db_manager.get_users(
                limit=limit,
                offset=offset,
                filters=filters,
            )

            self.logger.info(
                "Successfully retrieved users",
                count=len(users),
                limit=limit,
                offset=offset,
            )
            return users

        except Exception as e:
            self.logger.exception("Error retrieving users", error=str(e))
            raise

    def get_users_count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Get total count of users with optional filtering.

        Args:
            filters: Optional filters to apply

        Returns:
            Total count of users

        """
        self.log_operation("get_users_count")

        try:
            # Use database manager v4's get_users_count method
            count = self.db_manager.get_users_count(filters)

            self.logger.info("Successfully retrieved users count", count=count)
            return count

        except Exception as e:
            self.logger.exception("Error retrieving users count", error=str(e))
            raise

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a user by their ID.

        Args:
            user_id: User ID

        Returns:
            User dictionary or None if not found

        """
        if not user_id:
            raise ValidationError("User ID is required")

        self.log_operation("get_user_by_id", user_id=user_id)

        try:
            # Use database manager v4's get_user_by_id method
            user = self.db_manager.get_user_by_id(user_id)

            if user:
                self.logger.info("Successfully retrieved user", user_id=user_id)
            else:
                self.logger.warning("User not found", user_id=user_id)

            return user

        except Exception as e:
            self.logger.exception("Error retrieving user", error=str(e))
            raise

    def update_user_role(self, user_id: str, is_super_admin: bool) -> bool:
        """Update user's admin role.

        Args:
            user_id: User ID
            is_super_admin: Whether the user should be a super admin

        Returns:
            True if successful

        Raises:
            NotFoundError: If user doesn't exist

        """
        if not user_id:
            raise ValidationError("User ID is required")

        self.log_operation(
            "update_user_role", user_id=user_id, is_super_admin=is_super_admin
        )

        try:
            # Use database manager v4's update_user_role method
            success = self.db_manager.update_user_role(user_id, is_super_admin)

            if not success:
                raise NotFoundError(f"User with ID {user_id} not found")

            self.logger.info(
                "Successfully updated user role",
                user_id=user_id,
                is_super_admin=is_super_admin,
            )
            return True

        except NotFoundError:
            raise
        except Exception as e:
            self.logger.exception("Error updating user role", error=str(e))
            raise

    def delete_user(self, user_id: str) -> bool:
        """Delete a user.

        Args:
            user_id: User ID

        Returns:
            True if successful

        Raises:
            NotFoundError: If user doesn't exist

        """
        if not user_id:
            raise ValidationError("User ID is required")

        self.log_operation("delete_user", user_id=user_id)

        try:
            # Use database manager v4's delete_user method
            success = self.db_manager.delete_user(user_id)

            if not success:
                raise NotFoundError(f"User with ID {user_id} not found")

            self.logger.info("Successfully deleted user", user_id=user_id)
            return True

        except NotFoundError:
            raise
        except Exception as e:
            self.logger.exception("Error deleting user", error=str(e))
            raise

    def get_user_statistics(self) -> Dict[str, Any]:
        """Get user statistics.

        Returns:
            Dictionary containing user statistics

        """
        self.log_operation("get_user_statistics")

        try:
            # Use database manager v4's get_user_statistics method
            stats = self.db_manager.get_user_statistics()

            self.logger.info("Successfully retrieved user statistics")
            return stats

        except Exception as e:
            self.logger.exception("Error retrieving user statistics", error=str(e))
            raise

    def get_admin_users(self) -> List[Dict[str, Any]]:
        """Get all admin users.

        Returns:
            List of admin user dictionaries

        """
        self.log_operation("get_admin_users")

        try:
            # Use database manager v4's get_users method with admin filter
            admin_users = self.db_manager.get_users(
                limit=1000,  # Get all admin users
                filters={"role": "admin"},
            )

            self.logger.info(
                "Successfully retrieved admin users", count=len(admin_users)
            )
            return admin_users

        except Exception as e:
            self.logger.exception("Error retrieving admin users", error=str(e))
            raise

    def get_users_by_role(
        self, role: str, limit: int = 50, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get users by role.

        Args:
            role: User role ("admin" or "user")
            limit: Maximum number of users to return
            offset: Number of users to skip

        Returns:
            List of user dictionaries

        """
        if role not in ["admin", "user"]:
            raise ValidationError("Role must be 'admin' or 'user'")

        self.log_operation("get_users_by_role", role=role)

        try:
            # Use database manager v4's get_users method with role filter
            users = self.db_manager.get_users(
                limit=limit,
                offset=offset,
                filters={"role": role},
            )

            self.logger.info(
                "Successfully retrieved users by role",
                role=role,
                count=len(users),
            )
            return users

        except Exception as e:
            self.logger.exception("Error retrieving users by role", error=str(e))
            raise

    def search_users(
        self, query: str, limit: int = 50, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Search users by name or email.

        Args:
            query: Search query string
            limit: Maximum number of users to return
            offset: Number of users to skip

        Returns:
            List of matching user dictionaries

        """
        if not query:
            raise ValidationError("Search query is required")

        self.log_operation("search_users", query=query)

        try:
            # Use database manager v4's get_users method with search filter
            users = self.db_manager.get_users(
                limit=limit,
                offset=offset,
                filters={"search": query},
            )

            self.logger.info(
                "Successfully searched users",
                query=query,
                count=len(users),
            )
            return users

        except Exception as e:
            self.logger.exception("Error searching users", error=str(e))
            raise

    def get_users_with_verified_email(
        self, limit: int = 50, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get users with verified email addresses.

        Args:
            limit: Maximum number of users to return
            offset: Number of users to skip

        Returns:
            List of user dictionaries with verified emails

        """
        self.log_operation("get_users_with_verified_email")

        try:
            # Use database manager v4's get_users method with email verification filter
            users = self.db_manager.get_users(
                limit=limit,
                offset=offset,
                filters={"email_verified": True},
            )

            self.logger.info(
                "Successfully retrieved users with verified email",
                count=len(users),
            )
            return users

        except Exception as e:
            self.logger.exception(
                "Error retrieving users with verified email", error=str(e)
            )
            raise

    def get_users_without_verified_email(
        self, limit: int = 50, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get users without verified email addresses.

        Args:
            limit: Maximum number of users to return
            offset: Number of users to skip

        Returns:
            List of user dictionaries without verified emails

        """
        self.log_operation("get_users_without_verified_email")

        try:
            # Use database manager v4's get_users method with email verification filter
            users = self.db_manager.get_users(
                limit=limit,
                offset=offset,
                filters={"email_verified": False},
            )

            self.logger.info(
                "Successfully retrieved users without verified email",
                count=len(users),
            )
            return users

        except Exception as e:
            self.logger.exception(
                "Error retrieving users without verified email", error=str(e)
            )
            raise

    # Helper methods
    def _validate_user_data(self, data: Dict[str, Any]) -> None:
        """Validate user data."""
        required_fields = ["name", "email"]
        missing_fields = [field for field in required_fields if not data.get(field)]

        if missing_fields:
            raise ValidationError(
                f"Missing required fields: {', '.join(missing_fields)}"
            )

        # Validate email format
        email = data.get("email")
        if email and "@" not in email:
            raise ValidationError("Invalid email format")

    def _validate_user_update_data(self, data: Dict[str, Any]) -> None:
        """Validate user update data."""
        # Validate email format if provided
        email = data.get("email")
        if email and "@" not in email:
            raise ValidationError("Invalid email format")

    def _preprocess_user_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Preprocess user data before saving."""
        # Add any preprocessing logic
        return data.copy()
