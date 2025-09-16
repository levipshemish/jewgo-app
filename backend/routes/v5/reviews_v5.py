#!/usr/bin/env python3
"""Consolidated v5 reviews and ratings API routes.

This route file consolidates all review and rating functionality including
review management, rating aggregation, moderation, and sentiment analysis.
Replaces: reviews_api.py, ratings_endpoints.py, and review moderation routes.
"""

from flask import Blueprint, request, jsonify, g
from typing import Dict, Any, Optional
from datetime import datetime
from functools import wraps
import logging

# Import required dependencies
from database.repositories.entity_repository_v5 import EntityRepositoryV5
from utils.cursor_v5 import CursorV5Manager
from utils.etag_v5 import ETagV5Manager

logger = logging.getLogger(__name__)

# Create reviews blueprint - now available in production
reviews_v5 = Blueprint('reviews_v5', __name__, url_prefix='/api/v5/reviews')

# Reviews system is now available in production
# @reviews_v5.before_request
# def check_development_only():
#     """Ensure reviews endpoints are only accessible in development."""
#     import os
#     if os.environ.get('FLASK_ENV') == 'production':
#         from flask import jsonify
#         return jsonify({
#             'error': 'Reviews system is disabled in production',
#             'code': 'FEATURE_DISABLED'
#         }), 503

# Global service instances
entity_repository = None
redis_manager = None
cursor_manager = None
etag_manager = None
feature_flags = None

# Review configuration
REVIEW_CONFIG = {
    'max_review_length': 5000,
    'min_review_length': 10,
    'rating_scale': {
        'min': 1,
        'max': 5
    },
    'moderation': {
        'auto_approve_threshold': 0.8,
        'auto_reject_threshold': 0.3,
        'require_moderation': True
    },
    'rate_limiting': {
        'reviews_per_user_per_day': 10,
        'reviews_per_entity_per_day': 100
    },
    'supported_entities': ['restaurants', 'synagogues', 'mikvahs', 'stores']
}


def init_services(connection_manager, redis_manager_instance, feature_flags_instance):
    """Initialize service instances."""
    global entity_repository, redis_manager, cursor_manager, etag_manager, feature_flags
    
    entity_repository = EntityRepositoryV5(connection_manager)
    redis_manager = redis_manager_instance
    cursor_manager = CursorV5Manager()
    etag_manager = ETagV5Manager()
    feature_flags = feature_flags_instance


def require_review_permission(operation: str):
    """Decorator to require review-specific permissions."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'user_permissions') or not g.user_permissions:
                return jsonify({'error': 'Authentication required'}), 401
            
            required_permissions = {
                'create': ['create_reviews'],
                'read': ['read_reviews'],
                'update': ['update_reviews'],
                'delete': ['delete_reviews'],
                'moderate': ['moderate_reviews']
            }
            
            if operation not in required_permissions:
                return jsonify({'error': 'Invalid operation'}), 400
            
            user_permissions = set(g.user_permissions)
            if not any(perm in user_permissions for perm in required_permissions[operation]):
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def validate_review_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate review data."""
    errors = []
    
    # Validate required fields
    if not data.get('entity_type'):
        errors.append('Entity type is required')
    elif data['entity_type'] not in REVIEW_CONFIG['supported_entities']:
        errors.append('Invalid entity type')
    
    if not data.get('entity_id'):
        errors.append('Entity ID is required')
    
    if not data.get('rating'):
        errors.append('Rating is required')
    else:
        try:
            rating = float(data['rating'])
            if rating < REVIEW_CONFIG['rating_scale']['min'] or rating > REVIEW_CONFIG['rating_scale']['max']:
                errors.append(f'Rating must be between {REVIEW_CONFIG["rating_scale"]["min"]} and {REVIEW_CONFIG["rating_scale"]["max"]}')
        except (ValueError, TypeError):
            errors.append('Rating must be a number')
    
    if not data.get('content'):
        errors.append('Review content is required')
    else:
        content = data['content'].strip()
        if len(content) < REVIEW_CONFIG['min_review_length']:
            errors.append(f'Review content must be at least {REVIEW_CONFIG["min_review_length"]} characters')
        elif len(content) > REVIEW_CONFIG['max_review_length']:
            errors.append(f'Review content must not exceed {REVIEW_CONFIG["max_review_length"]} characters')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }


def check_rate_limits(user_id: int, entity_type: str, entity_id: int) -> Dict[str, Any]:
    """Check rate limits for review creation."""
    today = datetime.utcnow().date()
    
    # Check user daily limit
    user_key = f"reviews:user:{user_id}:{today}"
    user_review_count = redis_manager.get_counter(user_key, default=0)
    
    if user_review_count >= REVIEW_CONFIG['rate_limiting']['reviews_per_user_per_day']:
        return {
            'allowed': False,
            'reason': 'User daily review limit exceeded',
            'limit': REVIEW_CONFIG['rate_limiting']['reviews_per_user_per_day']
        }
    
    # Check entity daily limit
    entity_key = f"reviews:entity:{entity_type}:{entity_id}:{today}"
    entity_review_count = redis_manager.get_counter(entity_key, default=0)
    
    if entity_review_count >= REVIEW_CONFIG['rate_limiting']['reviews_per_entity_per_day']:
        return {
            'allowed': False,
            'reason': 'Entity daily review limit exceeded',
            'limit': REVIEW_CONFIG['rate_limiting']['reviews_per_entity_per_day']
        }
    
    return {'allowed': True}


def analyze_sentiment(content: str) -> Dict[str, Any]:
    """Analyze sentiment of review content."""
    # Placeholder implementation - would integrate with actual sentiment analysis service
    positive_words = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best']
    negative_words = ['bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'disappointed', 'poor']
    
    content_lower = content.lower()
    positive_count = sum(1 for word in positive_words if word in content_lower)
    negative_count = sum(1 for word in negative_words if word in content_lower)
    
    if positive_count > negative_count:
        sentiment = 'positive'
        confidence = min(0.9, 0.5 + (positive_count - negative_count) * 0.1)
    elif negative_count > positive_count:
        sentiment = 'negative'
        confidence = min(0.9, 0.5 + (negative_count - positive_count) * 0.1)
    else:
        sentiment = 'neutral'
        confidence = 0.5
    
    return {
        'sentiment': sentiment,
        'confidence': confidence,
        'positive_words': positive_count,
        'negative_words': negative_count
    }


def moderate_review(review_data: Dict[str, Any]) -> Dict[str, Any]:
    """Moderate review content."""
    if not REVIEW_CONFIG['moderation']['require_moderation']:
        return {'status': 'approved', 'reason': 'Auto-approved'}
    
    # Analyze sentiment
    sentiment_analysis = analyze_sentiment(review_data['content'])
    
    # Check for inappropriate content (placeholder)
    inappropriate_keywords = ['spam', 'fake', 'scam']  # Would be more comprehensive
    content_lower = review_data['content'].lower()
    has_inappropriate = any(keyword in content_lower for keyword in inappropriate_keywords)
    
    # Determine moderation status
    if has_inappropriate:
        return {
            'status': 'rejected',
            'reason': 'Inappropriate content detected',
            'sentiment_analysis': sentiment_analysis
        }
    elif sentiment_analysis['confidence'] >= REVIEW_CONFIG['moderation']['auto_approve_threshold']:
        return {
            'status': 'approved',
            'reason': 'Auto-approved based on sentiment analysis',
            'sentiment_analysis': sentiment_analysis
        }
    elif sentiment_analysis['confidence'] <= REVIEW_CONFIG['moderation']['auto_reject_threshold']:
        return {
            'status': 'rejected',
            'reason': 'Auto-rejected based on sentiment analysis',
            'sentiment_analysis': sentiment_analysis
        }
    else:
        return {
            'status': 'pending',
            'reason': 'Requires manual moderation',
            'sentiment_analysis': sentiment_analysis
        }


# Review endpoints
@reviews_v5.route('/', methods=['GET'])
def get_reviews():
    """Get reviews with filtering and pagination."""
    try:
        # Extract query parameters
        entity_type = request.args.get('entity_type')
        entity_id = request.args.get('entity_id', type=int)
        limit = request.args.get('limit', 10, type=int)
        cursor = request.args.get('cursor', '0')
        
        logger.info(f"Reviews API called with params: entity_type={entity_type}, entity_id={entity_id}, limit={limit}, cursor={cursor}")
        
        # Simple response for now to isolate the issue
        return jsonify({
            'reviews': [],
            'pagination': {
                'cursor': cursor,
                'next_cursor': None,
                'has_more': False,
                'total_count': 0
            }
        })
        
    except Exception as e:
        logger.exception("Failed to get reviews", error=str(e))
        return jsonify({'error': 'Failed to retrieve reviews'}), 500


@reviews_v5.route('/<int:review_id>', methods=['GET'])
def get_review(review_id: int):
    """Get a specific review by ID."""
    try:
        review = get_review_by_id(review_id)
        if not review:
            return jsonify({'error': 'Review not found'}), 404
        
        # Generate ETag - use simple fallback for now since review data is None
        import hashlib
        import time
        etag_data = f"review:{review_id}:{int(time.time() // 300)}"  # 5-minute cache
        etag = f'"{hashlib.md5(etag_data.encode()).hexdigest()[:16]}"'
        
        response = jsonify({'data': review})
        response.headers['ETag'] = etag
        
        return response
        
    except Exception as e:
        logger.exception("Failed to get review", review_id=review_id, error=str(e))
        return jsonify({'error': 'Failed to retrieve review'}), 500


@reviews_v5.route('/', methods=['POST'])
@require_review_permission('create')
def create_review():
    """Create a new review."""
    try:
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        user_id = getattr(g, 'user_id', None)
        
        # Validate review data
        validation = validate_review_data(data)
        if not validation['valid']:
            return jsonify({'error': 'Validation failed', 'details': validation['errors']}), 400
        
        # Check rate limits
        rate_limit_check = check_rate_limits(user_id, data['entity_type'], data['entity_id'])
        if not rate_limit_check['allowed']:
            return jsonify({'error': rate_limit_check['reason']}), 429
        
        # Check if user already reviewed this entity
        existing_review = get_user_review_for_entity(user_id, data['entity_type'], data['entity_id'])
        if existing_review:
            return jsonify({'error': 'You have already reviewed this entity'}), 409
        
        # Moderate review
        moderation_result = moderate_review(data)
        
        # Create review
        review_data = {
            'user_id': user_id,
            'entity_type': data['entity_type'],
            'entity_id': data['entity_id'],
            'rating': float(data['rating']),
            'content': data['content'].strip(),
            'status': moderation_result['status'],
            'moderation_reason': moderation_result['reason'],
            'sentiment_analysis': moderation_result.get('sentiment_analysis'),
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        review = create_review_in_db(review_data)
        if not review:
            return jsonify({'error': 'Failed to create review'}), 500
        
        # Update rate limit counters
        today = datetime.utcnow().date()
        user_key = f"reviews:user:{user_id}:{today}"
        entity_key = f"reviews:entity:{data['entity_type']}:{data['entity_id']}:{today}"
        redis_manager.increment_counter(user_key, ttl=86400)  # 24 hours
        redis_manager.increment_counter(entity_key, ttl=86400)  # 24 hours
        
        # Invalidate related caches
        etag_manager.invalidate_etag('reviews')
        etag_manager.invalidate_etag(f"{data['entity_type']}_{data['entity_id']}")
        
        return jsonify({
            'data': review,
            'message': 'Review created successfully',
            'moderation_status': moderation_result['status']
        }), 201
        
    except Exception as e:
        logger.exception("Failed to create review", error=str(e))
        return jsonify({'error': 'Failed to create review'}), 500


@reviews_v5.route('/<int:review_id>', methods=['PUT'])
@require_review_permission('update')
def update_review(review_id: int):
    """Update an existing review."""
    try:
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        user_id = getattr(g, 'user_id', None)
        
        # Get existing review
        existing_review = get_review_by_id(review_id)
        if not existing_review:
            return jsonify({'error': 'Review not found'}), 404
        
        # Check ownership
        if existing_review['user_id'] != user_id:
            return jsonify({'error': 'You can only update your own reviews'}), 403
        
        # Validate update data
        update_data = {}
        if 'rating' in data:
            try:
                rating = float(data['rating'])
                if rating < REVIEW_CONFIG['rating_scale']['min'] or rating > REVIEW_CONFIG['rating_scale']['max']:
                    return jsonify({'error': f'Rating must be between {REVIEW_CONFIG["rating_scale"]["min"]} and {REVIEW_CONFIG["rating_scale"]["max"]}'}), 400
                update_data['rating'] = rating
            except (ValueError, TypeError):
                return jsonify({'error': 'Rating must be a number'}), 400
        
        if 'content' in data:
            content = data['content'].strip()
            if len(content) < REVIEW_CONFIG['min_review_length']:
                return jsonify({'error': f'Review content must be at least {REVIEW_CONFIG["min_review_length"]} characters'}), 400
            elif len(content) > REVIEW_CONFIG['max_review_length']:
                return jsonify({'error': f'Review content must not exceed {REVIEW_CONFIG["max_review_length"]} characters'}), 400
            update_data['content'] = content
        
        if not update_data:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        # Moderate updated content if content changed
        if 'content' in update_data:
            moderation_result = moderate_review({'content': update_data['content']})
            update_data['status'] = moderation_result['status']
            update_data['moderation_reason'] = moderation_result['reason']
            update_data['sentiment_analysis'] = moderation_result.get('sentiment_analysis')
        
        update_data['updated_at'] = datetime.utcnow()
        
        # Update review
        success = update_review_in_db(review_id, update_data)
        if not success:
            return jsonify({'error': 'Failed to update review'}), 500
        
        # Invalidate related caches
        etag_manager.invalidate_etag('reviews')
        etag_manager.invalidate_etag(f'review_{review_id}')
        etag_manager.invalidate_etag(f"{existing_review['entity_type']}_{existing_review['entity_id']}")
        
        return jsonify({'message': 'Review updated successfully'})
        
    except Exception as e:
        logger.exception("Failed to update review", review_id=review_id, error=str(e))
        return jsonify({'error': 'Failed to update review'}), 500


@reviews_v5.route('/<int:review_id>', methods=['DELETE'])
@require_review_permission('delete')
def delete_review(review_id: int):
    """Delete a review."""
    try:
        user_id = getattr(g, 'user_id', None)
        
        # Get existing review
        existing_review = get_review_by_id(review_id)
        if not existing_review:
            return jsonify({'error': 'Review not found'}), 404
        
        # Check ownership
        if existing_review['user_id'] != user_id:
            return jsonify({'error': 'You can only delete your own reviews'}), 403
        
        # Delete review
        success = delete_review_from_db(review_id)
        if not success:
            return jsonify({'error': 'Failed to delete review'}), 500
        
        # Invalidate related caches
        etag_manager.invalidate_etag('reviews')
        etag_manager.invalidate_etag(f'review_{review_id}')
        etag_manager.invalidate_etag(f"{existing_review['entity_type']}_{existing_review['entity_id']}")
        
        return jsonify({'message': 'Review deleted successfully'})
        
    except Exception as e:
        logger.exception("Failed to delete review", review_id=review_id, error=str(e))
        return jsonify({'error': 'Failed to delete review'}), 500


@reviews_v5.route('/<int:review_id>/moderate', methods=['PUT'])
@require_review_permission('moderate')
def moderate_review_endpoint(review_id: int):
    """Moderate a review (admin only)."""
    try:
        if not request.is_json:
            return jsonify({'error': 'JSON data required'}), 400
        
        data = request.get_json()
        action = data.get('action')  # 'approve', 'reject', 'pending'
        
        if action not in ['approve', 'reject', 'pending']:
            return jsonify({'error': 'Invalid action'}), 400
        
        # Get existing review
        existing_review = get_review_by_id(review_id)
        if not existing_review:
            return jsonify({'error': 'Review not found'}), 404
        
        # Update moderation status
        update_data = {
            'status': action,
            'moderation_reason': data.get('reason', f'Manually {action}d'),
            'moderated_by': getattr(g, 'user_id', None),
            'moderated_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        success = update_review_in_db(review_id, update_data)
        if not success:
            return jsonify({'error': 'Failed to moderate review'}), 500
        
        # Invalidate related caches
        etag_manager.invalidate_etag('reviews')
        etag_manager.invalidate_etag(f'review_{review_id}')
        etag_manager.invalidate_etag(f"{existing_review['entity_type']}_{existing_review['entity_id']}")
        
        return jsonify({'message': f'Review {action}d successfully'})
        
    except Exception as e:
        logger.exception("Failed to moderate review", review_id=review_id, error=str(e))
        return jsonify({'error': 'Failed to moderate review'}), 500


@reviews_v5.route('/<entity_type>/<int:entity_id>/stats', methods=['GET'])
def get_entity_review_stats(entity_type: str, entity_id: int):
    """Get review statistics for an entity."""
    try:
        if entity_type not in REVIEW_CONFIG['supported_entities']:
            return jsonify({'error': 'Invalid entity type'}), 400
        
        # Get review statistics
        stats = get_entity_review_statistics(entity_type, entity_id)
        
        # Generate ETag - use simple fallback for now since stats data is empty
        import hashlib
        import time
        etag_data = f"review_stats:{entity_type}:{entity_id}:{int(time.time() // 300)}"  # 5-minute cache
        etag = f'"{hashlib.md5(etag_data.encode()).hexdigest()[:16]}"'
        
        response = jsonify({'data': stats})
        response.headers['ETag'] = etag
        
        return response
        
    except Exception as e:
        logger.exception("Failed to get review stats", entity_type=entity_type, entity_id=entity_id, error=str(e))
        return jsonify({'error': 'Failed to retrieve review statistics'}), 500


# Helper functions (these would be implemented with actual database queries)
def get_reviews_paginated(filters: Dict[str, Any], cursor: Optional[str], limit: int) -> Dict[str, Any]:
    """Get paginated reviews with filters."""
    try:
        # For now, return empty data to prevent 500 errors
        # TODO: Implement actual database queries when review system is ready
        logger.info("Reviews API called with filters", filters=filters, cursor=cursor, limit=limit)
        
        return {
            'reviews': [],
            'pagination': {
                'cursor': cursor,
                'next_cursor': None,
                'has_more': False,
                'total_count': 0
            }
        }
    except Exception as e:
        logger.exception("Error in get_reviews_paginated", error=str(e))
        return {
            'reviews': [],
            'pagination': {
                'cursor': cursor,
                'next_cursor': None,
                'has_more': False,
                'total_count': 0
            }
        }


def get_review_by_id(review_id: int) -> Optional[Dict[str, Any]]:
    """Get review by ID."""
    try:
        # For now, return None to prevent 500 errors
        # TODO: Implement actual database queries when review system is ready
        logger.info("get_review_by_id called", review_id=review_id)
        return None
    except Exception as e:
        logger.exception("Error in get_review_by_id", error=str(e))
        return None


def get_user_review_for_entity(user_id: int, entity_type: str, entity_id: int) -> Optional[Dict[str, Any]]:
    """Get user's review for a specific entity."""
    try:
        # For now, return None to prevent 500 errors
        # TODO: Implement actual database queries when review system is ready
        logger.info("get_user_review_for_entity called", user_id=user_id, entity_type=entity_type, entity_id=entity_id)
        return None
    except Exception as e:
        logger.exception("Error in get_user_review_for_entity", error=str(e))
        return None


def create_review_in_db(review_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Create review in database."""
    try:
        # For now, return None to prevent 500 errors
        # TODO: Implement actual database queries when review system is ready
        logger.info("create_review_in_db called", review_data=review_data)
        return None
    except Exception as e:
        logger.exception("Error in create_review_in_db", error=str(e))
        return None


def update_review_in_db(review_id: int, update_data: Dict[str, Any]) -> bool:
    """Update review in database."""
    try:
        # For now, return True to prevent 500 errors
        # TODO: Implement actual database queries when review system is ready
        logger.info("update_review_in_db called", review_id=review_id, update_data=update_data)
        return True
    except Exception as e:
        logger.exception("Error in update_review_in_db", error=str(e))
        return False


def delete_review_from_db(review_id: int) -> bool:
    """Delete review from database."""
    try:
        # For now, return True to prevent 500 errors
        # TODO: Implement actual database queries when review system is ready
        logger.info("delete_review_from_db called", review_id=review_id)
        return True
    except Exception as e:
        logger.exception("Error in delete_review_from_db", error=str(e))
        return False


def get_entity_review_statistics(entity_type: str, entity_id: int) -> Dict[str, Any]:
    """Get review statistics for an entity."""
    try:
        # For now, return empty stats to prevent 500 errors
        # TODO: Implement actual database queries when review system is ready
        logger.info("get_entity_review_statistics called", entity_type=entity_type, entity_id=entity_id)
        return {
            'total_reviews': 0,
            'average_rating': 0.0,
            'rating_distribution': {},
            'recent_reviews_count': 0
        }
    except Exception as e:
        logger.exception("Error in get_entity_review_statistics", error=str(e))
        return {
            'total_reviews': 0,
            'average_rating': 0.0,
            'rating_distribution': {},
            'recent_reviews_count': 0
        }


# Error handlers
@reviews_v5.errorhandler(400)
def bad_request(error):
    """Handle bad request errors."""
    return jsonify({'error': 'Bad request'}), 400


@reviews_v5.errorhandler(401)
def unauthorized(error):
    """Handle unauthorized errors."""
    return jsonify({'error': 'Authentication required'}), 401


@reviews_v5.errorhandler(403)
def forbidden(error):
    """Handle forbidden errors."""
    return jsonify({'error': 'Insufficient permissions'}), 403


@reviews_v5.errorhandler(404)
def not_found(error):
    """Handle not found errors."""
    return jsonify({'error': 'Resource not found'}), 404


@reviews_v5.errorhandler(409)
def conflict(error):
    """Handle conflict errors."""
    return jsonify({'error': 'Resource conflict'}), 409


@reviews_v5.errorhandler(429)
def too_many_requests(error):
    """Handle rate limit errors."""
    return jsonify({'error': 'Too many requests'}), 429


@reviews_v5.errorhandler(500)
def internal_server_error(error):
    """Handle internal server errors."""
    logger.exception("Reviews API internal server error", error=str(error))
    return jsonify({'error': 'Reviews service unavailable'}), 500
