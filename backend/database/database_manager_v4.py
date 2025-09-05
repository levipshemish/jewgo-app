import ast
import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from utils.error_handler import (
    ExternalServiceError,
    handle_database_operation,
    handle_operation_with_fallback,
)
from utils.logging_config import get_logger
from .connection_manager import DatabaseConnectionManager
from .models import Base
from .repositories import (
    GoogleReviewRepository,
    ImageRepository,
    RestaurantRepository,
    ReviewRepository,
    UserRepository,
)

# Import ConfigManager at module level
try:
    from utils.unified_database_config import UnifiedDatabaseConfig as ConfigManager
except ImportError:
    # Fallback for when utils module is not available
    import os
    class ConfigManager:
        @staticmethod
        def get_database_url():
            return os.getenv("DATABASE_URL")
        @staticmethod
        def get_pg_keepalives_idle():
            return int(os.getenv("PG_KEEPALIVES_IDLE", "60"))
        @staticmethod
        def get_pg_keepalives_interval():
            return int(os.getenv("PG_KEEPALIVES_INTERVAL", "20"))
        @staticmethod
        def get_pg_keepalives_count():
            return int(os.getenv("PG_KEEPALIVES_COUNT", "5"))
        @staticmethod
        def get_pg_statement_timeout():
            return os.getenv("PG_STATEMENT_TIMEOUT", "60000")
        @staticmethod
        def get_pg_idle_tx_timeout():
            return os.getenv("PG_IDLE_TX_TIMEOUT", "120000")
        @staticmethod
        def get_pg_sslmode():
            return os.getenv("PGSSLMODE", "prefer")
        @staticmethod
        def get_pg_sslrootcert():
            return os.getenv("PGSSLROOTCERT")

# Import the dynamic status calculation module
try:
    from utils.restaurant_status import get_restaurant_status, is_restaurant_open
except ImportError:
    # Fallback for when utils module is not available
    def get_restaurant_status(restaurant_data):
        return {
            "is_open": False,
            "status": "unknown",
            "status_reason": "Status calculation not available",
        }

    def is_restaurant_open(restaurant_data) -> bool:
        return False


logger = get_logger(__name__)
# !/usr/bin/env python3
"""Enhanced Database Manager for JewGo App v4.
This module provides a comprehensive database management system for the JewGo application,
using the repository pattern to separate concerns and improve maintainability.
Key Features:
- Repository pattern implementation
- SQLAlchemy 1.4 compatibility with PostgreSQL
- Structured logging with structlog
- Comprehensive restaurant data management
- Kosher supervision categorization
- Search and filtering capabilities
- Geographic location support
- Statistics and reporting
Architecture:
- ConnectionManager: Handles database connections and sessions
- BaseRepository: Generic CRUD operations
- Specific Repositories: Restaurant, Review, User, Image
- DatabaseManager: Orchestrates repositories and provides unified interface
Author: JewGo Development Team
Version: 4.0
Last Updated: 2024
"""


class DatabaseManager:
    """Enhanced database manager using repository pattern."""

    def __init__(self, database_url: Optional[str] = None) -> None:
        """Initialize database manager with connection string."""
        # Initialize connection manager
        self.connection_manager = DatabaseConnectionManager(database_url)
        # Initialize repositories
        self.restaurant_repo = RestaurantRepository(self.connection_manager)
        self.review_repo = ReviewRepository(self.connection_manager)
        self.google_review_repo = GoogleReviewRepository(self.connection_manager)
        self.user_repo = UserRepository(self.connection_manager)
        self.image_repo = ImageRepository(self.connection_manager)
        
        # Initialize Supabase configuration for role management
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.supabase_url or not self.supabase_service_role_key:
            logger.warning("Supabase configuration not found. Role management features will be disabled.")
            self.supabase_enabled = False
        else:
            self.supabase_enabled = True
            logger.info("Supabase configuration loaded for role management")
        
        logger.info("Database manager v4 initialized with repository pattern")

    def connect(self) -> bool:
        """Connect to the database and create tables if they don't exist."""
        try:
            success = self.connection_manager.connect()
            if success:
                # Create tables if they don't exist
                Base.metadata.create_all(self.connection_manager.engine)
                logger.info("Database tables created/verified")
            return success
        except Exception as e:
            logger.exception("Failed to connect to database", error=str(e))
            return False

    def disconnect(self) -> None:
        """Disconnect from the database."""
        self.connection_manager.disconnect()

    def close(self) -> None:
        """Close the database connection (alias for disconnect)."""
        self.disconnect()

    def health_check(self) -> bool:
        """Perform a health check on the database connection."""
        health_result = self.connection_manager.health_check()
        return health_result.get("status") == "healthy"

    def test_connection(self) -> bool:
        """Test the database connection (alias for health_check)."""
        return self.health_check()

    # Restaurant Operations
    @handle_database_operation
    def add_restaurant(self, restaurant_data: Dict[str, Any]) -> bool:
        """Add a new restaurant to the database."""
        # Validate required fields
        required_fields = [
            "name",
            "address",
            "city",
            "state",
            "zip_code",
            "phone_number",
            "kosher_category",
            "listing_type",
        ]
        for field in required_fields:
            if not restaurant_data.get(field):
                logger.error("Missing required field", field=field)
                return False
        # Set default values
        restaurant_data.setdefault("certifying_agency", "ORB")
        restaurant_data.setdefault("created_at", datetime.now(timezone.utc))
        restaurant_data.setdefault("updated_at", datetime.now(timezone.utc))
        restaurant_data.setdefault("hours_parsed", False)
        # Handle specials field
        if "specials" in restaurant_data and isinstance(
            restaurant_data["specials"], list
        ):
            restaurant_data["specials"] = json.dumps(restaurant_data["specials"])
        result = self.restaurant_repo.create(restaurant_data)
        if result and result.get("created"):
            logger.info(
                "Restaurant added successfully",
                restaurant_id=result.get("id"),
                name=result.get("name", "Unknown"),
            )
            return True
        return False

    @handle_database_operation
    def get_restaurants(
        self,
        kosher_type: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        as_dict: bool = False,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Any]:
        """Get restaurants with optional filtering and pagination."""
        restaurants = self.restaurant_repo.get_restaurants_with_filters(
            kosher_type=kosher_type,
            status=status,
            limit=limit,
            offset=offset,
            filters=filters,
        )
        if as_dict:
            # Use bulk image loading to avoid N+1 query problem
            restaurant_ids = [restaurant.id for restaurant in restaurants]
            images_map = self.image_repo.get_images_for_restaurants(restaurant_ids)
            return [self._restaurant_to_dict_with_images(restaurant, images_map.get(restaurant.id, [])) for restaurant in restaurants]
        return restaurants

    @handle_operation_with_fallback(fallback_value=0)
    def get_restaurants_count(
        self,
        kosher_type: Optional[str] = None,
        status: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> int:
        """Get the total count of restaurants with optional filtering."""
        return self.restaurant_repo.count(filters or {})

    @handle_database_operation
    def get_restaurant_by_id(self, restaurant_id: int) -> Optional[Dict[str, Any]]:
        """Get a restaurant by its ID."""
        restaurant = self.restaurant_repo.get_by_id(restaurant_id)
        if restaurant:
            return self._restaurant_to_dict(restaurant)
        return None

    @handle_database_operation
    def search_restaurants(
        self,
        query: str,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Search restaurants by name or description."""
        restaurants = self.restaurant_repo.search_restaurants(query, limit, offset)
        return [self._restaurant_to_dict(restaurant) for restaurant in restaurants]

    @handle_database_operation
    def search_restaurants_near_location(
        self,
        latitude: float,
        longitude: float,
        radius_miles: float = 10.0,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Search restaurants within a radius of a location."""
        restaurants = self.restaurant_repo.search_restaurants_near_location(
            latitude, longitude, radius_miles, limit
        )
        return [self._restaurant_to_dict(restaurant) for restaurant in restaurants]

    @handle_database_operation
    def update_restaurant_data(
        self, restaurant_id: int, update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update restaurant data."""
        update_data["updated_at"] = datetime.now(timezone.utc)
        return self.restaurant_repo.update(restaurant_id, update_data)

    @handle_database_operation
    def delete_restaurant(self, restaurant_id: int) -> bool:
        """Delete a restaurant."""
        # Delete associated images first
        self.image_repo.delete_all_restaurant_images(restaurant_id)
        # Delete the restaurant
        return self.restaurant_repo.delete(restaurant_id)

    @handle_operation_with_fallback(fallback_value={})
    def get_restaurant_statistics(self) -> Dict[str, Any]:
        """Get restaurant statistics."""
        return self.restaurant_repo.get_statistics()

    # Review Operations
    @handle_database_operation
    def get_reviews(
        self,
        restaurant_id: Optional[int] = None,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Get reviews with optional filtering and pagination."""
        logger.info(f"DatabaseManager: Getting reviews for restaurant_id={restaurant_id}, status={status}")
        reviews = self.review_repo.get_reviews(
            restaurant_id=restaurant_id,
            status=status,
            limit=limit,
            offset=offset,
            filters=filters,
        )
        logger.info(f"DatabaseManager: ReviewRepository returned {len(reviews)} reviews")
        result = [self._review_to_dict(review) for review in reviews]
        logger.info(f"DatabaseManager: Converted to {len(result)} review dicts")
        return result

    @handle_operation_with_fallback(fallback_value=0)
    def get_reviews_count(
        self,
        restaurant_id: Optional[int] = None,
        status: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> int:
        """Get the total count of reviews with optional filtering."""
        return self.review_repo.get_reviews_count(restaurant_id, status, filters)

    # Google Review Operations
    @handle_database_operation
    def get_google_reviews(
        self,
        restaurant_id: Optional[int] = None,
        place_id: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Get Google reviews with optional filtering and pagination."""
        logger.info(f"DatabaseManager: Getting Google reviews for restaurant_id={restaurant_id}, place_id={place_id}")
        reviews = self.google_review_repo.get_google_reviews(
            restaurant_id=restaurant_id,
            place_id=place_id,
            limit=limit,
            offset=offset,
        )
        logger.info(f"DatabaseManager: GoogleReviewRepository returned {len(reviews)} reviews")
        result = [self._google_review_to_dict(review) for review in reviews]
        logger.info(f"DatabaseManager: Converted to {len(result)} Google review dicts")
        return result

    @handle_operation_with_fallback(fallback_value=0)
    def get_google_reviews_count(
        self,
        restaurant_id: Optional[int] = None,
        place_id: Optional[str] = None,
    ) -> int:
        """Get the total count of Google reviews with optional filtering."""
        return self.google_review_repo.get_google_reviews_count(restaurant_id, place_id)

    @handle_database_operation
    def upsert_google_reviews(
        self,
        restaurant_id: int,
        place_id: str,
        google_reviews: List[Dict[str, Any]]
    ) -> bool:
        """Upsert Google reviews for a restaurant."""
        logger.info(f"DatabaseManager: Upserting {len(google_reviews)} Google reviews for restaurant {restaurant_id}")
        return self.google_review_repo.upsert_google_reviews(restaurant_id, place_id, google_reviews)

    @handle_database_operation
    def delete_old_google_reviews(
        self,
        restaurant_id: int,
        place_id: str,
        keep_review_ids: List[str]
    ) -> bool:
        """Delete Google reviews that are no longer in the Google Places API response."""
        return self.google_review_repo.delete_old_google_reviews(restaurant_id, place_id, keep_review_ids)

    @handle_database_operation
    def get_review_by_id(self, review_id: str) -> Optional[Dict[str, Any]]:
        """Get a review by its ID."""
        review = self.review_repo.get_by_id(review_id)
        if review:
            return self._review_to_dict(review)
        return None

    def create_review(self, review_data: Dict[str, Any]) -> Optional[str]:
        """Create a new review."""
        try:
            return self.review_repo.create_review(review_data)
        except Exception as e:
            logger.exception("Error creating review", error=str(e))
            return None

    def update_review(self, review_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a review."""
        try:
            return self.review_repo.update(review_id, update_data)
        except Exception as e:
            logger.exception("Error updating review", error=str(e))
            return False

    def delete_review(self, review_id: str) -> bool:
        """Delete a review."""
        try:
            return self.review_repo.delete(review_id)
        except Exception as e:
            logger.exception("Error deleting review", error=str(e))
            return False

    def get_review_statistics(self) -> Dict[str, Any]:
        """Get review statistics."""
        try:
            return self.review_repo.get_review_statistics()
        except Exception as e:
            logger.exception("Error getting review statistics", error=str(e))
            return {}

    # User Operations
    @handle_database_operation
    def get_users(
        self,
        limit: int = 20,
        offset: int = 0,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """Get users with optional filtering and pagination."""
        users = self.user_repo.get_users(limit, offset, filters)
        return [self._user_to_dict(user) for user in users]

    @handle_operation_with_fallback(fallback_value=0)
    def get_users_count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Get total count of users with optional filtering."""
        return self.user_repo.get_users_count(filters)

    @handle_database_operation
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a user by their ID."""
        user = self.user_repo.get_by_id(user_id)
        if user:
            return self._user_to_dict(user)
        return None

    def update_user_role(self, user_id: str, is_super_admin: bool) -> bool:
        """Update user's admin role."""
        try:
            return self.user_repo.update_user_role(user_id, is_super_admin)
        except Exception as e:
            logger.exception("Error updating user role", error=str(e))
            return False

    def delete_user(self, user_id: str) -> bool:
        """Delete a user."""
        try:
            # Delete associated sessions and accounts first
            self.user_repo.delete_user_sessions(user_id)
            self.user_repo.delete_user_accounts(user_id)
            # Delete the user
            return self.user_repo.delete_user(user_id)
        except Exception as e:
            logger.exception("Error deleting user", error=str(e))
            return False

    def get_user_statistics(self) -> Dict[str, Any]:
        """Get user statistics."""
        try:
            return self.user_repo.get_user_statistics()
        except Exception as e:
            logger.exception("Error getting user statistics", error=str(e))
            return {}

    # Image Operations
    @handle_database_operation
    def get_restaurant_images(self, restaurant_id: int) -> List[Dict[str, Any]]:
        """Get all images for a specific restaurant."""
        images = self.image_repo.get_restaurant_images(restaurant_id)
        return [self._image_to_dict(image) for image in images]

    @handle_database_operation
    def add_restaurant_image(
        self,
        restaurant_id: int,
        image_url: str,
        image_order: Optional[int] = None,
        cloudinary_public_id: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Add a new image to a restaurant."""
        image = self.image_repo.add_restaurant_image(
            restaurant_id, image_url, image_order, cloudinary_public_id
        )
        if image:
            return self._image_to_dict(image)
        return None

    @handle_database_operation
    def delete_restaurant_image(self, image_id: int) -> bool:
        """Delete a specific restaurant image."""
        return self.image_repo.delete_restaurant_image(image_id)

    @handle_operation_with_fallback(fallback_value={})
    def get_image_statistics(self) -> Dict[str, Any]:
        """Get image statistics."""
        return self.image_repo.get_image_statistics()

    # Role Management Methods
    @handle_database_operation("Supabase RPC call")
    def call_supabase_rpc(self, function_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Call a Supabase RPC function with service role authentication.
        
        Args:
            function_name: Name of the RPC function to call
            params: Parameters to pass to the RPC function
            
        Returns:
            Dict containing the RPC response
        """
        # Check if service role RPC is enabled
        if os.getenv("ENABLE_SERVICE_ROLE_RPC", "false").lower() != "true":
            logger.error("Service role RPC calls are disabled by ENABLE_SERVICE_ROLE_RPC=false")
            return {
                "success": False,
                "error": "Service role RPC calls are disabled",
                "error_type": "auth_error",
                "status_code": 403,
            }
        
        # Allowlist of permitted RPC functions
        allowed_functions = {
            "assign_admin_role",
            "remove_admin_role"
        }
        
        if function_name not in allowed_functions:
            logger.error(f"RPC function '{function_name}' not in allowlist", 
                        function=function_name, 
                        allowed_functions=list(allowed_functions),
                        caller_context="database_manager_v4")
            return {
                "success": False,
                "error": f"RPC function '{function_name}' not permitted",
                "error_type": "auth_error",
                "status_code": 403,
            }
        
        if not self.supabase_enabled:
            logger.error("Supabase not configured for role management")
            return {
                "success": False,
                "error": "Supabase not configured",
                "error_type": "service_error",
                "status_code": 503,
            }
        
        try:
            import requests
            
            # Construct the RPC URL
            rpc_url = f"{self.supabase_url}/rest/v1/rpc/{function_name}"
            
            # Set up headers with service role key
            headers = {
                'Authorization': f'Bearer {self.supabase_service_role_key}',
                'Content-Type': 'application/json',
                'apikey': self.supabase_service_role_key
            }
            
            # Make the RPC call
            response = requests.post(
                rpc_url,
                json=params,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Supabase RPC call successful", function=function_name)
                return result
            else:
                error_text = response.text
                logger.error(
                    f"Supabase RPC call failed",
                    function=function_name,
                    status_code=response.status_code,
                    response=error_text
                )
                
                # Map HTTP status codes to appropriate error types
                status_code = response.status_code
                if status_code == 400:
                    error_type = 'validation_error'
                elif status_code in [401, 403]:
                    error_type = 'auth_error'
                elif status_code == 404:
                    error_type = 'not_found'
                elif status_code == 409:
                    error_type = 'conflict'
                else:
                    error_type = 'service_error'
                    status_code = 503
                
                return {
                    "error": f"RPC call failed: {response.status_code}",
                    "error_type": error_type,
                    "status_code": status_code,
                    "details": error_text
                }
                
        except Exception as e:
            logger.exception(f"Error calling Supabase RPC", function=function_name, error=str(e))
            return {
                "success": False,
                "error": f"RPC call error: {str(e)}",
                "error_type": "service_error",
                "status_code": 503,
            }

    @handle_database_operation("assign admin role")
    def assign_admin_role(
        self,
        target_user_id: str,
        role: str,
        assigned_by_user_id: str,
        expires_at: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Assign an admin role to a user via Supabase RPC.
        
        Args:
            target_user_id: ID of the user to assign role to
            role: Role to assign
            assigned_by_user_id: ID of the admin user making the assignment
            expires_at: Optional expiration date
            notes: Optional notes about the assignment
            
        Returns:
            Dict: { success: bool, error?: str, error_type?: str, status_code?: int }
        """
        try:
            params = {
                'p_user_id': target_user_id,
                'p_role': role,
                'p_assigned_by': assigned_by_user_id
            }
            
            if expires_at:
                params['p_expires_at'] = expires_at
            if notes:
                params['p_notes'] = notes
            
            result = self.call_supabase_rpc('assign_admin_role', params)
            
            # Structured audit logging
            audit_log = {
                "actor_id": assigned_by_user_id,
                "target_user_id": target_user_id, 
                "action": "assign_admin_role",
                "role": role,
                "expires_at": expires_at,
                "notes": notes
            }
            
            if 'error' in result:
                audit_log["result"] = "failure"
                audit_log["error"] = result['error']
                logger.error("AUDIT_ADMIN_ROLE_ASSIGN_FAILED", extra=audit_log)
                return result
            
            audit_log["result"] = "success"
            logger.info("AUDIT_ADMIN_ROLE_ASSIGN_SUCCESS", extra=audit_log)
            # Return RPC response when available; default to success
            return result if isinstance(result, dict) else {"success": True}
            
        except Exception as e:
            logger.exception("Error assigning admin role", error=str(e))
            return {"success": False, "error": str(e), "error_type": "service_error", "status_code": 503}

    @handle_database_operation("remove admin role")
    def remove_admin_role(
        self,
        target_user_id: str,
        role: str,
        removed_by_user_id: str
    ) -> Dict[str, Any]:
        """Remove an admin role from a user via Supabase RPC.
        
        Args:
            target_user_id: ID of the user to remove role from
            role: Role to remove
            removed_by_user_id: ID of the admin user making the removal
            
        Returns:
            Dict: { success: bool, error?: str, error_type?: str, status_code?: int }
        """
        try:
            params = {
                'p_user_id': target_user_id,
                'p_role': role,
                'p_removed_by': removed_by_user_id
            }
            
            result = self.call_supabase_rpc('remove_admin_role', params)
            
            # Structured audit logging
            audit_log = {
                "actor_id": removed_by_user_id,
                "target_user_id": target_user_id,
                "action": "remove_admin_role", 
                "role": role
            }
            
            if 'error' in result:
                audit_log["result"] = "failure"
                audit_log["error"] = result['error']
                logger.error("AUDIT_ADMIN_ROLE_REMOVE_FAILED", extra=audit_log)
                return result
            
            audit_log["result"] = "success"
            logger.info("AUDIT_ADMIN_ROLE_REMOVE_SUCCESS", extra=audit_log)
            return result if isinstance(result, dict) else {"success": True}
            
        except Exception as e:
            logger.exception("Error removing admin role", error=str(e))
            return {"success": False, "error": str(e), "error_type": "service_error", "status_code": 503}

    def get_active_super_admin_count(self) -> int:
        """Return precise count of active super_admin roles using Supabase REST Content-Range.
        Falls back to 0 on errors.
        """
        try:
            if not self.supabase_enabled:
                logger.error("Supabase not configured for role management")
                return 0

            import requests

            headers = {
                'Authorization': f'Bearer {self.supabase_service_role_key}',
                'apikey': self.supabase_service_role_key,
                'Prefer': 'count=exact'
            }

            query_url = f"{self.supabase_url}/rest/v1/admin_roles"
            params = {
                'select': 'id',
                'is_active': 'eq.true',
                'role': 'eq.super_admin',
                'limit': 1,
                'offset': 0,
                'order': 'assigned_at.desc'
            }

            response = requests.get(query_url, params=params, headers=headers, timeout=30)
            if response.status_code != 200:
                logger.warning("Failed to count super_admins", status=response.status_code, resp=response.text)
                return 0

            content_range = response.headers.get('Content-Range')
            if content_range and '/' in content_range:
                try:
                    return int(content_range.split('/')[-1])
                except Exception:
                    return 0
            # Fallback to length if header missing
            try:
                data = response.json()
                return len(data) if isinstance(data, list) else 0
            except Exception:
                return 0
        except Exception as e:
            logger.exception("Error counting super_admins", error=str(e))
            return 0

    @handle_database_operation("get admin roles")
    def get_admin_roles(
        self,
        user_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        search: str = "",
        role_filter: Optional[str] = None,
        include_all: bool = False,
        include_expired: bool = False
    ) -> Dict[str, Any]:
        """Get admin roles from Supabase with optional filtering.
        
        Args:
            user_id: Optional specific user ID
            limit: Number of records to return
            offset: Number of records to skip
            search: Search term for user name or email
            role_filter: Filter by specific role
            
        Returns:
            Dict containing users with roles and pagination info
        """
        try:
            if not self.supabase_enabled:
                logger.error("Supabase not configured for role management")
                raise ExternalServiceError(
                    message="Role management service unavailable",
                    service="supabase",
                    details={"reason": "Supabase not configured"}
                )
            
            import requests
            
            # Set up headers with service role key and count preference
            headers = {
                'Authorization': f'Bearer {self.supabase_service_role_key}',
                'apikey': self.supabase_service_role_key,
                'Prefer': 'count=exact',
                'Range': f'{offset}-{offset + limit - 1}'  # Add Range header for clarity
            }
            
            if include_all:
                # Query users table with left join to admin_roles, restrict fields for PII safety
                query_url = f"{self.supabase_url}/rest/v1/users"
                params = {
                    'select': 'id,name,email,admin_roles(*)',
                    'limit': limit,
                    'offset': offset,
                    'order': 'created_at.desc'
                }
                # Add search filter for users table
                if search:
                    params['or'] = f'(name.ilike.*{search}*,email.ilike.*{search}*)'
            else:
                # Query admin_roles table with user data
                query_url = f"{self.supabase_url}/rest/v1/admin_roles"
                params = {
                    'select': '*,users:users!inner(id,name,email)',
                    'limit': limit,
                    'offset': offset,
                    'order': 'assigned_at.desc'
                }
                
                # Build filters
                and_filters = []
                if not include_expired:
                    params['is_active'] = 'eq.true'
                    expires_filter = 'or(expires_at.is.null,expires_at.gt.now())'
                    and_filters.append(expires_filter)
                if search:
                    search_filter = f'or(users.name.ilike.*{search}*,users.email.ilike.*{search}*)'
                    and_filters.append(search_filter)
                if and_filters:
                    params['and'] = f"and({','.join(and_filters)})"
            
            if user_id:
                params['user_id'] = f'eq.{user_id}'
            if role_filter:
                params['role'] = f'eq.{role_filter}'
            
            # Make the request
            response = requests.get(
                query_url,
                params=params,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                roles_data = response.json()
                
                # Get total count from Content-Range header
                total_count = len(roles_data)  # Fallback
                content_range = response.headers.get('Content-Range')
                header_present = bool(content_range)
                if content_range:
                    try:
                        # Content-Range format: "0-9/100" where 100 is total count
                        total_count = int(content_range.split('/')[-1])
                        logger.debug("Content-Range header parsed successfully", content_range=content_range, total_count=total_count)
                    except (ValueError, IndexError) as e:
                        logger.warning("Failed to parse Content-Range header, using fallback", content_range=content_range, error=str(e))
                        total_count = len(roles_data)
                else:
                    logger.warning("Content-Range header missing, using fallback count", returned_count=len(roles_data))
                
                # Format the response - flatten nested user data
                flattened_users = []
                if include_all:
                    # Process users query with admin_roles join
                    for user_record in roles_data:
                        admin_role_data = user_record.get('admin_roles', [])
                        # Get the most recent active role if any
                        active_role = None
                        if admin_role_data:
                            active_roles = [r for r in admin_role_data if r.get('is_active', True)]
                            if active_roles:
                                # Sort by assigned_at and take most recent
                                active_role = sorted(active_roles, 
                                                   key=lambda x: x.get('assigned_at', ''), 
                                                   reverse=True)[0]
                        
                        flattened_users.append({
                            'id': user_record.get('id'),
                            'name': user_record.get('name'),
                            'email': user_record.get('email'),
                            'role': active_role.get('role') if active_role else None,
                            'role_level': active_role.get('role_level') if active_role else None,
                            'assigned_at': active_role.get('assigned_at') if active_role else None,
                            'expires_at': active_role.get('expires_at') if active_role else None,
                            'notes': active_role.get('notes') if active_role else None,
                            'assigned_by': active_role.get('assigned_by') if active_role else None
                        })
                else:
                    # Process admin_roles query with users join
                    for role_record in roles_data:
                        user_data = role_record.get('users', {})
                        flattened_users.append({
                            'id': role_record.get('user_id'),
                            'name': user_data.get('name'),
                            'email': user_data.get('email'),
                            'role': role_record.get('role'),
                            'role_level': role_record.get('role_level'),
                            'assigned_at': role_record.get('assigned_at'),
                            'expires_at': role_record.get('expires_at'),
                            'notes': role_record.get('notes'),
                            'assigned_by': role_record.get('assigned_by')
                        })
                
                result = {
                    "users": flattened_users,
                    "total": total_count,
                    "page": (offset // limit) + 1 if limit else 1,
                    "limit": limit,
                    "has_more": (((offset + len(roles_data)) < total_count) if header_present else (len(roles_data) == limit))
                }
                
                logger.info("Admin roles retrieved successfully", count=len(roles_data))
                return result
            else:
                logger.error(
                    "Failed to retrieve admin roles",
                    status_code=response.status_code,
                    response=response.text
                )
                return {"users": [], "total": 0, "page": 1, "limit": limit, "has_more": False}
                
        except Exception as e:
            logger.exception("Error retrieving admin roles", error=str(e))
            return {"users": [], "total": 0, "page": 1, "limit": limit, "has_more": False}

    # Helper methods for data conversion
    def _restaurant_to_dict(self, restaurant) -> Dict[str, Any]:
        """Convert restaurant model to dictionary."""
        try:
            # Get restaurant images (N+1 query - use _restaurant_to_dict_with_images for better performance)
            images = self.image_repo.get_restaurant_images(restaurant.id)
            image_dicts = [self._image_to_dict(img) for img in images]
            # Get restaurant status
            status_info = get_restaurant_status(
                {
                    "hours_json": restaurant.hours_json,
                    "timezone": restaurant.timezone,
                }
            )
            return self._build_restaurant_dict(restaurant, image_dicts, status_info)
        except Exception as e:
            logger.exception("Error converting restaurant to dict", error=str(e))
            # Re-raise the exception instead of returning empty dict
            raise

    def _restaurant_to_dict_with_images(self, restaurant, images: List[Any]) -> Dict[str, Any]:
        """Convert restaurant model to dictionary with pre-loaded images (avoids N+1 queries)."""
        try:
            # Convert pre-loaded images to dicts
            image_dicts = [self._image_to_dict(img) for img in images]
            # Get restaurant status
            status_info = get_restaurant_status(
                {
                    "hours_json": restaurant.hours_json,
                    "timezone": restaurant.timezone,
                }
            )
            return self._build_restaurant_dict(restaurant, image_dicts, status_info)
        except Exception as e:
            logger.exception("Error converting restaurant to dict with images", error=str(e))
            return {}

    def _build_restaurant_dict(self, restaurant, image_dicts: List[Dict[str, Any]], status_info: Dict[str, Any]) -> Dict[str, Any]:
        """Build the restaurant dictionary from restaurant model, images, and status info."""
        return {
            "id": restaurant.id,
            "name": restaurant.name,
            "address": restaurant.address,
            "city": restaurant.city,
            "state": restaurant.state,
            "zip_code": restaurant.zip_code,
            "phone_number": restaurant.phone_number,
            "website": restaurant.website,
            "certifying_agency": restaurant.certifying_agency,
            "kosher_category": restaurant.kosher_category,
            "listing_type": restaurant.listing_type,
            "google_listing_url": restaurant.google_listing_url,
            "price_range": restaurant.price_range,
            "short_description": restaurant.short_description,
            "hours_of_operation": restaurant.hours_of_operation,
            "hours_json": restaurant.hours_json,
            "hours_last_updated": (
                restaurant.hours_last_updated.isoformat()
                if restaurant.hours_last_updated
                else None
            ),
            "timezone": restaurant.timezone,
            "latitude": restaurant.latitude,
            "longitude": restaurant.longitude,
            "is_cholov_yisroel": restaurant.is_cholov_yisroel,
            "is_pas_yisroel": restaurant.is_pas_yisroel,
            "cholov_stam": restaurant.cholov_stam,
            "image_url": restaurant.image_url,
            "specials": self._safe_json_loads(restaurant.specials, []),
            "status": restaurant.status,
            "place_id": restaurant.place_id,
            "created_at": (
                restaurant.created_at.isoformat() if restaurant.created_at else None
            ),
            "updated_at": (
                restaurant.updated_at.isoformat() if restaurant.updated_at else None
            ),
            "current_time_local": (
                restaurant.current_time_local.isoformat()
                if restaurant.current_time_local
                else None
            ),
            "hours_parsed": restaurant.hours_parsed,
            "google_reviews": getattr(restaurant, 'google_reviews', None),
            # Add missing rating fields with safe getattr fallbacks
            "rating": getattr(restaurant, 'rating', None),
            "star_rating": getattr(restaurant, 'star_rating', None),
            "quality_rating": getattr(restaurant, 'quality_rating', None),
            "google_rating": getattr(restaurant, 'google_rating', None),
            "google_review_count": getattr(restaurant, 'google_review_count', None),
            # Add missing contact and business fields
            "business_email": getattr(restaurant, 'business_email', None),
            "owner_name": getattr(restaurant, 'owner_name', None),
            "owner_email": getattr(restaurant, 'owner_email', None),
            "owner_phone": getattr(restaurant, 'owner_phone', None),
            "is_owner_submission": getattr(restaurant, 'is_owner_submission', False),
            "instagram_link": getattr(restaurant, 'instagram_link', None),
            "facebook_link": getattr(restaurant, 'facebook_link', None),
            "tiktok_link": getattr(restaurant, 'tiktok_link', None),
            "business_images": getattr(restaurant, 'business_images', []),
            "submission_status": getattr(restaurant, 'submission_status', None),
            "submission_date": (
                restaurant.submission_date.isoformat() if getattr(restaurant, 'submission_date', None) else None
            ),
            "approval_date": (
                restaurant.approval_date.isoformat() if getattr(restaurant, 'approval_date', None) else None
            ),
            "approved_by": getattr(restaurant, 'approved_by', None),
            "rejection_reason": getattr(restaurant, 'rejection_reason', None),
            "business_license": getattr(restaurant, 'business_license', None),
            "tax_id": getattr(restaurant, 'tax_id', None),
            "years_in_business": getattr(restaurant, 'years_in_business', None),
            "seating_capacity": getattr(restaurant, 'seating_capacity', None),
            "delivery_available": getattr(restaurant, 'delivery_available', False),
            "takeout_available": getattr(restaurant, 'takeout_available', False),
            "catering_available": getattr(restaurant, 'catering_available', False),
            "preferred_contact_method": getattr(restaurant, 'preferred_contact_method', None),
            "preferred_contact_time": getattr(restaurant, 'preferred_contact_time', None),
            "contact_notes": getattr(restaurant, 'contact_notes', None),
            "images": image_dicts,
            "is_open": status_info.get("is_open", False),
            "status_info": status_info,
        }

    def _review_to_dict(self, review) -> Dict[str, Any]:
        """Convert review model to dictionary."""
        try:
            return {
                "id": review.id,
                "restaurant_id": review.restaurant_id,
                "user_id": review.user_id,
                "user_name": review.user_name,
                "user_email": review.user_email,
                "rating": review.rating,
                "title": review.title,
                "content": review.content,
                "images": self._safe_json_loads(review.images, []),
                "status": review.status,
                "created_at": (
                    review.created_at.isoformat() if review.created_at else None
                ),
                "updated_at": (
                    review.updated_at.isoformat() if review.updated_at else None
                ),
                "moderator_notes": review.moderator_notes,
                "verified_purchase": review.verified_purchase,
                "helpful_count": review.helpful_count,
                "report_count": review.report_count,
            }
        except Exception as e:
            logger.exception("Error converting review to dict", error=str(e))
            return {}

    def _google_review_to_dict(self, review) -> Dict[str, Any]:
        """Convert Google review model to dictionary."""
        try:
            return {
                "id": review.id,
                "restaurant_id": review.restaurant_id,
                "place_id": review.place_id,
                "google_review_id": review.google_review_id,
                "author_name": review.author_name,
                "author_url": review.author_url,
                "profile_photo_url": review.profile_photo_url,
                "rating": review.rating,
                "text": review.text,
                "time": review.time.isoformat() if review.time else None,
                "relative_time_description": review.relative_time_description,
                "language": review.language,
                "created_at": review.created_at.isoformat() if review.created_at else None,
                "updated_at": review.updated_at.isoformat() if review.updated_at else None,
                "source": "google",  # Add source identifier
            }
        except Exception as e:
            logger.exception("Error converting Google review to dict", error=str(e))
            return {}

    def _user_to_dict(self, user) -> Dict[str, Any]:
        """Convert user model to dictionary."""
        try:
            return {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "emailVerified": (
                    user.emailVerified.isoformat() if user.emailVerified else None
                ),
                "image": user.image,
                "isSuperAdmin": user.isSuperAdmin,
                "role": "admin" if user.isSuperAdmin else "user",
                "createdAt": user.createdAt.isoformat() if user.createdAt else None,
                "updatedAt": user.updatedAt.isoformat() if user.updatedAt else None,
            }
        except Exception as e:
            logger.exception("Error converting user to dict", error=str(e))
            return {}

    def _safe_json_loads(self, json_str: Optional[str], default_value: Any) -> Any:
        """Safely parse JSON string or Python literal with fallback to default value."""
        if not json_str:
            return default_value
        # Handle non-string inputs (e.g., already parsed JSON objects)
        if not isinstance(json_str, str):
            # If it's already a list, dict, or other JSON-compatible type, return as is
            if isinstance(json_str, (list, dict, int, float, bool)) or json_str is None:
                return json_str
            logger.debug(
                f"Non-string JSON input: {type(json_str)}, using default value"
            )
            return default_value
        # Remove leading/trailing whitespace
        json_str = json_str.strip()
        # Handle empty strings
        if not json_str:
            return default_value
        # First try to parse as JSON
        try:
            return json.loads(json_str)
        except (json.JSONDecodeError, TypeError):
            # If JSON parsing fails, try to parse as Python literal (handles single quotes)
            try:
                parsed_data = ast.literal_eval(json_str)
                return parsed_data
            except (ValueError, SyntaxError) as e:
                # Log the specific error and the problematic string (truncated)
                json_preview = (
                    json_str[:100] + "..." if len(json_str) > 100 else json_str
                )
                logger.warning(
                    f"Failed to parse JSON or Python literal: {e}, using default value. JSON preview: {json_preview}"
                )
                return default_value

    def _image_to_dict(self, image) -> Dict[str, Any]:
        """Convert image model to dictionary."""
        try:
            return {
                "id": image.id,
                "restaurant_id": image.restaurant_id,
                "image_url": image.image_url,
                "image_order": image.image_order,
                "cloudinary_public_id": image.cloudinary_public_id,
                "created_at": (
                    image.created_at.isoformat() if image.created_at else None
                ),
                "updated_at": (
                    image.updated_at.isoformat() if image.updated_at else None
                ),
            }
        except Exception as e:
            logger.exception("Error converting image to dict", error=str(e))
            return {}
