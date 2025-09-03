from typing import Any, Dict, List, Optional
from services.base_service import BaseService
from utils.error_handler import NotFoundError, ValidationError

# !/usr/bin/env python3
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

    # Role Management Methods
    def assign_user_role(
        self,
        target_user_id: str,
        role: str,
        assigned_by_user_id: str,
        expires_at: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Assign an admin role to a user.

        Args:
            target_user_id: ID of the user to assign role to
            role: Role to assign (moderator, data_admin, system_admin, super_admin)
            assigned_by_user_id: ID of the admin user making the assignment
            expires_at: Optional expiration date for the role
            notes: Optional notes about the assignment

        Returns:
            Dict: { success: boolean, error?: string, error_type?: string, status_code?: number }
        """
        self.log_operation("assign_user_role")
        try:
            # Validate role
            allowed_roles = ["moderator", "data_admin", "system_admin", "super_admin"]
            if role not in allowed_roles:
                raise ValidationError(
                    f"Invalid role. Must be one of: {', '.join(allowed_roles)}"
                )

            # Call database manager to assign role via Supabase RPC
            result = self.db_manager.assign_admin_role(
                target_user_id=target_user_id,
                role=role,
                assigned_by_user_id=assigned_by_user_id,
                expires_at=expires_at,
                notes=notes,
            )
            normalized = (
                result
                if isinstance(result, dict)
                else {"success": False, "error": "Unknown result"}
            )
            if normalized.get("success"):
                self.logger.info(
                    "Successfully assigned admin role",
                    target_user_id=target_user_id,
                    role=role,
                    assigned_by=assigned_by_user_id,
                )
            else:
                self.logger.warning(
                    "Failed to assign admin role",
                    target_user_id=target_user_id,
                    role=role,
                    assigned_by=assigned_by_user_id,
                )
            return normalized

        except Exception as e:
            self.logger.exception(
                "Error assigning admin role",
                error=str(e),
                target_user_id=target_user_id,
                role=role,
            )
            raise

    def revoke_user_role(
        self, target_user_id: str, role: str, removed_by_user_id: str
    ) -> Dict[str, Any]:
        """Revoke an admin role from a user.

        Args:
            target_user_id: ID of the user to revoke role from
            role: Role to revoke
            removed_by_user_id: ID of the admin user making the revocation

        Returns:
            Dict: { success: boolean, error?: string, error_type?: string, status_code?: number }
        """
        self.log_operation("revoke_user_role")
        try:
            # Call database manager to revoke role via Supabase RPC
            result = self.db_manager.remove_admin_role(
                target_user_id=target_user_id,
                role=role,
                removed_by_user_id=removed_by_user_id,
            )
            normalized = (
                result
                if isinstance(result, dict)
                else {"success": False, "error": "Unknown result"}
            )
            if normalized.get("success"):
                self.logger.info(
                    "Successfully revoked admin role",
                    target_user_id=target_user_id,
                    role=role,
                    removed_by=removed_by_user_id,
                )
            else:
                self.logger.warning(
                    "Failed to revoke admin role",
                    target_user_id=target_user_id,
                    role=role,
                    removed_by=removed_by_user_id,
                )
            return normalized

        except Exception as e:
            self.logger.exception(
                "Error revoking admin role",
                error=str(e),
                target_user_id=target_user_id,
                role=role,
            )
            raise

    def get_user_roles(
        self,
        user_id: Optional[str] = None,
        page: int = 1,
        limit: int = 50,
        search: str = "",
        role_filter: Optional[str] = None,
        include_all: bool = False,
        include_expired: bool = False,
    ) -> Dict[str, Any]:
        """Get users with their admin roles.

        Args:
            user_id: Optional specific user ID to get roles for
            page: Page number for pagination
            limit: Number of users per page
            search: Search term for user name or email
            role_filter: Filter by specific role
            include_all: Whether to include all users or just those with roles
            include_expired: Whether to include expired roles

        Returns:
            Dict containing users with roles and pagination info
        """
        self.log_operation("get_user_roles")
        try:
            offset = (page - 1) * limit

            # Call database manager to get admin roles
            result = self.db_manager.get_admin_roles(
                user_id=user_id,
                limit=limit,
                offset=offset,
                search=search,
                role_filter=role_filter,
                include_all=include_all,
                include_expired=include_expired,
            )

            self.logger.info(
                "Successfully retrieved user roles",
                count=len(result.get("users", [])),
                page=page,
                limit=limit,
            )

            return result

        except Exception as e:
            self.logger.exception(
                "Error retrieving user roles", error=str(e), user_id=user_id, page=page
            )
            raise

    def get_available_roles(self) -> List[Dict[str, Any]]:
        """Get list of available admin roles and their descriptions.

        Returns:
            List of role definitions with descriptions and permissions
        """
        self.log_operation("get_available_roles")
        try:
            roles = [
                {
                    "name": "moderator",
                    "level": 1,
                    "description": "Can moderate content and manage basic user issues",
                    "permissions": ["content:moderate", "user:view", "review:moderate"],
                },
                {
                    "name": "data_admin",
                    "level": 2,
                    "description": "Can manage data, run reports, and access analytics",
                    "permissions": [
                        "data:view",
                        "data:export",
                        "analytics:view",
                        "report:generate",
                    ],
                },
                {
                    "name": "system_admin",
                    "level": 3,
                    "description": "Can manage system settings, users, and core functionality",
                    "permissions": [
                        "user:manage",
                        "system:configure",
                        "admin:manage",
                        "security:manage",
                    ],
                },
                {
                    "name": "super_admin",
                    "level": 4,
                    "description": "Full system access including role management",
                    "permissions": ["role:manage", "admin:all", "system:all"],
                },
            ]

            self.logger.info("Successfully retrieved available roles", count=len(roles))
            return roles

        except Exception as e:
            self.logger.exception("Error retrieving available roles", error=str(e))
            raise

    def get_active_super_admin_count(self) -> int:
        """Return precise count of active super_admin roles."""
        try:
            count = 0
            if hasattr(self.db_manager, "get_active_super_admin_count"):
                count = self.db_manager.get_active_super_admin_count()
            self.logger.info("Retrieved active super_admin count", count=count)
            return count
        except Exception as e:
            self.logger.exception("Error getting super_admin count", error=str(e))
            return 0

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
