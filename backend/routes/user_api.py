"""
User API Routes
This module provides API endpoints for authenticated users to interact with
the backend. These endpoints require Supabase authentication.
"""

from flask import Blueprint, request, jsonify
from utils.logging_config import get_logger
from utils.supabase_auth import require_user_auth, get_current_user, get_user_id, optional_user_auth
from utils.error_handler import ValidationError, NotFoundError
from utils.config_manager import config_manager

logger = get_logger(__name__)
# Create blueprint for user API routes
user_api = Blueprint("user_api", __name__, url_prefix="/api/user")


@user_api.route("/profile", methods=["GET"])
@require_user_auth
def get_user_profile():
    """
    Get current user's profile information
    Returns:
        JSON with user profile data
    """
    try:
        user = get_current_user()
        if not user:
            raise NotFoundError("User not found")
        # Return user profile (excluding sensitive information)
        profile = {
            "id": user.get("id"),
            "email": user.get("email"),
            "role": user.get("role"),
            "user_metadata": user.get("user_metadata", {}),
            "created_at": user.get("iat"),  # Token issued at time
        }
        return jsonify(profile)
    except NotFoundError as e:
        logger.warning(f"User not found: {e}")
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        return jsonify({"error": "Internal server error"}), 500


@user_api.route("/profile", methods=["PUT"])
@require_user_auth
def update_user_profile():
    """
    Update current user's profile information
    Expected JSON payload:
    {
        "display_name": "John Doe",
        "avatar_url": "https://...",
        "preferences": {...}
    }
    """
    try:
        user = get_current_user()
        if not user:
            raise NotFoundError("User not found")
        data = request.get_json()
        if not data:
            raise ValidationError("No data provided")
        # Validate input data
        allowed_fields = ["display_name", "avatar_url", "preferences", "phone"]
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        if not update_data:
            raise ValidationError("No valid fields to update")
        # Validate field values
        if "display_name" in update_data and not isinstance(
            update_data["display_name"], str
        ):
            raise ValidationError("display_name must be a string")
        if "avatar_url" in update_data and not isinstance(
            update_data["avatar_url"], str
        ):
            raise ValidationError("avatar_url must be a string")
        if "phone" in update_data and not isinstance(update_data["phone"], str):
            raise ValidationError("phone must be a string")
        # Here you would typically update the user's metadata in Supabase
        # For now, we'll just return the data that would be updated
        logger.info(f"User {user.get('id')} updating profile: {update_data}")
        return jsonify(
            {
                "message": "Profile updated successfully",
                "updated_fields": list(update_data.keys()),
            }
        )
    except ValidationError as e:
        logger.warning(f"Validation error updating user profile: {e}")
        return jsonify({"error": str(e)}), 400
    except NotFoundError as e:
        logger.warning(f"User not found: {e}")
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.error(f"Error updating user profile: {e}")
        return jsonify({"error": "Internal server error"}), 500


@user_api.route("/favorites", methods=["GET"])
@require_user_auth
def get_user_favorites():
    """
    Get current user's favorite restaurants
    Query parameters:
        - limit: Number of favorites to return (default: 20, max: configurable)
        - offset: Number of favorites to skip (default: 0)
    """
    try:
        user_id = get_user_id()
        if not user_id:
            raise NotFoundError("User not found")
        # Get query parameters with configurable limits
        max_limit = config_manager.get("api.max_page_size", 100)
        default_limit = config_manager.get("api.default_page_size", 20)
        limit = min(int(request.args.get("limit", default_limit)), max_limit)
        offset = max(int(request.args.get("offset", 0)), 0)
        # Here you would query the database for user favorites
        # For now, return a placeholder response
        favorites = {
            "user_id": user_id,
            "favorites": [],
            "total": 0,
            "limit": limit,
            "offset": offset,
        }
        return jsonify(favorites)
    except ValueError as e:
        logger.warning(f"Invalid query parameters: {e}")
        return jsonify({"error": "Invalid query parameters"}), 400
    except NotFoundError as e:
        logger.warning(f"User not found: {e}")
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.error(f"Error getting user favorites: {e}")
        return jsonify({"error": "Internal server error"}), 500


@user_api.route("/favorites/<restaurant_id>", methods=["POST"])
@require_user_auth
def add_favorite(restaurant_id):
    """
    Add a restaurant to user's favorites
    Args:
        restaurant_id: ID of the restaurant to add to favorites
    """
    try:
        user_id = get_user_id()
        if not user_id:
            raise NotFoundError("User not found")
        # Validate restaurant_id
        if not restaurant_id or not restaurant_id.isdigit():
            raise ValidationError("Invalid restaurant ID")
        # Here you would validate that the restaurant exists
        # and add it to user's favorites in the database
        logger.info(f"User {user_id} adding restaurant {restaurant_id} to favorites")
        return jsonify(
            {
                "message": "Restaurant added to favorites",
                "restaurant_id": restaurant_id,
                "user_id": user_id,
            }
        )
    except ValidationError as e:
        logger.warning(f"Validation error adding favorite: {e}")
        return jsonify({"error": str(e)}), 400
    except NotFoundError as e:
        logger.warning(f"User not found: {e}")
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.error(f"Error adding favorite: {e}")
        return jsonify({"error": "Internal server error"}), 500


@user_api.route("/favorites/<restaurant_id>", methods=["DELETE"])
@require_user_auth
def remove_favorite(restaurant_id):
    """
    Remove a restaurant from user's favorites
    Args:
        restaurant_id: ID of the restaurant to remove from favorites
    """
    try:
        user_id = get_user_id()
        if not user_id:
            raise NotFoundError("User not found")
        # Validate restaurant_id
        if not restaurant_id or not restaurant_id.isdigit():
            raise ValidationError("Invalid restaurant ID")
        # Here you would remove the restaurant from user's favorites in the database
        logger.info(
            f"User {user_id} removing restaurant {restaurant_id} from favorites"
        )
        return jsonify(
            {
                "message": "Restaurant removed from favorites",
                "restaurant_id": restaurant_id,
                "user_id": user_id,
            }
        )
    except ValidationError as e:
        logger.warning(f"Validation error removing favorite: {e}")
        return jsonify({"error": str(e)}), 400
    except NotFoundError as e:
        logger.warning(f"User not found: {e}")
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.error(f"Error removing favorite: {e}")
        return jsonify({"error": "Internal server error"}), 500


@user_api.route("/reviews", methods=["GET"])
@require_user_auth
def get_user_reviews():
    """
    Get current user's reviews
    Query parameters:
        - limit: Number of reviews to return (default: 20, max: configurable)
        - offset: Number of reviews to skip (default: 0)
    """
    try:
        user_id = get_user_id()
        if not user_id:
            raise NotFoundError("User not found")
        # Get query parameters with configurable limits
        max_limit = config_manager.get("api.max_page_size", 100)
        default_limit = config_manager.get("api.default_page_size", 20)
        limit = min(int(request.args.get("limit", default_limit)), max_limit)
        offset = max(int(request.args.get("offset", 0)), 0)
        # Here you would query the database for user reviews
        # For now, return a placeholder response
        reviews = {
            "user_id": user_id,
            "reviews": [],
            "total": 0,
            "limit": limit,
            "offset": offset,
        }
        return jsonify(reviews)
    except ValueError as e:
        logger.warning(f"Invalid query parameters: {e}")
        return jsonify({"error": "Invalid query parameters"}), 400
    except NotFoundError as e:
        logger.warning(f"User not found: {e}")
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.error(f"Error getting user reviews: {e}")
        return jsonify({"error": "Internal server error"}), 500


@user_api.route("/reviews/<restaurant_id>", methods=["POST"])
@require_user_auth
def create_review(restaurant_id):
    """
    Create a review for a restaurant
    Args:
        restaurant_id: ID of the restaurant to review
    Expected JSON payload:
    {
        "rating": 5,
        "title": "Great food!",
        "content": "Amazing kosher restaurant...",
        "images": ["url1", "url2"]
    }
    """
    try:
        user_id = get_user_id()
        if not user_id:
            raise NotFoundError("User not found")
        # Validate restaurant_id
        if not restaurant_id or not restaurant_id.isdigit():
            raise ValidationError("Invalid restaurant ID")
        data = request.get_json()
        if not data:
            raise ValidationError("No review data provided")
        # Validate required fields
        required_fields = ["rating", "content"]
        for field in required_fields:
            if field not in data:
                raise ValidationError(f"Missing required field: {field}")
        # Validate rating
        rating = data.get("rating")
        if not isinstance(rating, (int, float)) or rating < 1 or rating > 5:
            raise ValidationError("Rating must be a number between 1 and 5")
        # Validate content length
        content = data.get("content", "").strip()
        if len(content) < 10:
            raise ValidationError("Review content must be at least 10 characters")
        if len(content) > 2000:
            raise ValidationError("Review content must be less than 2000 characters")
        # Validate title if provided
        title = data.get("title", "").strip()
        if title and len(title) > 200:
            raise ValidationError("Review title must be less than 200 characters")
        # Validate images if provided
        images = data.get("images", [])
        if not isinstance(images, list):
            raise ValidationError("Images must be a list")
        if len(images) > 10:
            raise ValidationError("Maximum 10 images allowed")
        # Here you would create the review in the database
        review_data = {
            "user_id": user_id,
            "restaurant_id": restaurant_id,
            "rating": rating,
            "title": title,
            "content": content,
            "images": images,
        }
        logger.info(f"User {user_id} creating review for restaurant {restaurant_id}")
        return (
            jsonify({"message": "Review created successfully", "review": review_data}),
            201,
        )
    except ValidationError as e:
        logger.warning(f"Validation error creating review: {e}")
        return jsonify({"error": str(e)}), 400
    except NotFoundError as e:
        logger.warning(f"User not found: {e}")
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.error(f"Error creating review: {e}")
        return jsonify({"error": "Internal server error"}), 500


@user_api.route("/reviews/<review_id>", methods=["PUT"])
@require_user_auth
def update_review(review_id):
    """
    Update a user's review
    Args:
        review_id: ID of the review to update
    """
    try:
        user_id = get_user_id()
        if not user_id:
            raise NotFoundError("User not found")
        # Validate review_id
        if not review_id or not review_id.isdigit():
            raise ValidationError("Invalid review ID")
        data = request.get_json()
        if not data:
            raise ValidationError("No update data provided")
        # Here you would verify the review belongs to the user and update it
        logger.info(f"User {user_id} updating review {review_id}")
        return jsonify(
            {"message": "Review updated successfully", "review_id": review_id}
        )
    except ValidationError as e:
        logger.warning(f"Validation error updating review: {e}")
        return jsonify({"error": str(e)}), 400
    except NotFoundError as e:
        logger.warning(f"User not found: {e}")
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.error(f"Error updating review: {e}")
        return jsonify({"error": "Internal server error"}), 500


@user_api.route("/reviews/<review_id>", methods=["DELETE"])
@require_user_auth
def delete_review(review_id):
    """
    Delete a user's review
    Args:
        review_id: ID of the review to delete
    """
    try:
        user_id = get_user_id()
        if not user_id:
            raise NotFoundError("User not found")
        # Validate review_id
        if not review_id or not review_id.isdigit():
            raise ValidationError("Invalid review ID")
        # Here you would verify the review belongs to the user and delete it
        logger.info(f"User {user_id} deleting review {review_id}")
        return jsonify(
            {"message": "Review deleted successfully", "review_id": review_id}
        )
    except ValidationError as e:
        logger.warning(f"Validation error deleting review: {e}")
        return jsonify({"error": str(e)}), 400
    except NotFoundError as e:
        logger.warning(f"User not found: {e}")
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.error(f"Error deleting review: {e}")
        return jsonify({"error": "Internal server error"}), 500


@user_api.route("/activity", methods=["GET"])
@require_user_auth
def get_user_activity():
    """
    Get current user's activity history
    Query parameters:
        - limit: Number of activities to return (default: 20, max: configurable)
        - offset: Number of activities to skip (default: 0)
        - type: Filter by activity type (optional)
    """
    try:
        user_id = get_user_id()
        if not user_id:
            raise NotFoundError("User not found")
        # Get query parameters with configurable limits
        max_limit = config_manager.get("api.max_page_size", 100)
        default_limit = config_manager.get("api.default_page_size", 20)
        limit = min(int(request.args.get("limit", default_limit)), max_limit)
        offset = max(int(request.args.get("offset", 0)), 0)
        activity_type = request.args.get("type")
        # Here you would query the database for user activity
        # For now, return a placeholder response
        activity = {
            "user_id": user_id,
            "activities": [],
            "total": 0,
            "limit": limit,
            "offset": offset,
        }
        if activity_type:
            activity["filter_type"] = activity_type
        return jsonify(activity)
    except ValueError as e:
        logger.warning(f"Invalid query parameters: {e}")
        return jsonify({"error": "Invalid query parameters"}), 400
    except NotFoundError as e:
        logger.warning(f"User not found: {e}")
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.error(f"Error getting user activity: {e}")
        return jsonify({"error": "Internal server error"}), 500


@user_api.route("/stats", methods=["GET"])
@require_user_auth
def get_user_stats():
    """
    Get current user's statistics
    Returns:
        JSON with user statistics
    """
    try:
        user_id = get_user_id()
        if not user_id:
            raise NotFoundError("User not found")
        # Here you would calculate user statistics from the database
        # For now, return a placeholder response
        stats = {
            "user_id": user_id,
            "total_reviews": 0,
            "total_favorites": 0,
            "average_rating": 0.0,
            "member_since": None,
            "last_activity": None,
        }
        return jsonify(stats)
    except NotFoundError as e:
        logger.warning(f"User not found: {e}")
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.error(f"Error getting user stats: {e}")
        return jsonify({"error": "Internal server error"}), 500


# Create a separate blueprint for auth-specific routes
auth_api = Blueprint("auth_api", __name__, url_prefix="/api/auth")


@auth_api.route("/user-role", methods=["GET"])
@optional_user_auth
def get_user_role():
    """
    Get user role information from Supabase admin role system.
    This endpoint accepts both authenticated and anonymous tokens.
    
    Returns:
        JSON with role data or 401 for anonymous users
    """
    try:
        # Get user from request context (set by optional_user_auth decorator)
        user = getattr(request, 'user', None)
        
        # If no user (anonymous or invalid token), return 401
        if not user:
            logger.debug("No user found in request - returning 401 for anonymous user")
            return jsonify({
                "success": False,
                "error": "Unauthorized",
                "message": "Anonymous users do not have admin roles"
            }), 401
        
        # Check if user is anonymous
        app_metadata = user.get('app_metadata', {})
        if app_metadata.get('provider') == 'anonymous':
            logger.debug(f"Anonymous user {user.get('id')} - returning 401")
            return jsonify({
                "success": False,
                "error": "Unauthorized",
                "message": "Anonymous users do not have admin roles"
            }), 401
        
        # Get the access token from the Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            logger.warning("No valid Authorization header found")
            return jsonify({
                "success": False,
                "error": "Unauthorized",
                "message": "Valid Authorization header required"
            }), 401
        
        access_token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        # Get role manager and fetch admin role
        try:
            from utils.supabase_role_manager import get_role_manager
            role_manager = get_role_manager()
            role_data = role_manager.get_user_admin_role(access_token)
            
            if role_data:
                role = role_data.get('role')
                level = role_data.get('level', 0)
                
                # Return role data in expected format
                return jsonify({
                    "success": True,
                    "role": role,
                    "level": level,
                    "permissions": []  # Permissions are handled on frontend based on role
                })
            else:
                # No admin role found - return default values
                logger.debug(f"No admin role found for user {user.get('id')}")
                return jsonify({
                    "success": True,
                    "role": None,
                    "level": 0,
                    "permissions": []
                })
                
        except ImportError:
            logger.error("SupabaseRoleManager not available")
            return jsonify({
                "success": False,
                "error": "Service unavailable",
                "message": "Role management system not available"
            }), 503
        except Exception as e:
            logger.error(f"Error fetching user role: {e}")
            return jsonify({
                "success": False,
                "error": "Internal server error",
                "message": "Failed to fetch user role"
            }), 500
            
    except Exception as e:
        logger.error(f"Unexpected error in get_user_role: {e}")
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "message": "An unexpected error occurred"
        }), 500
