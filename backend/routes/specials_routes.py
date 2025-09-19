#!/usr/bin/env python3
"""Specials API Routes.

This module provides RESTful API endpoints for the specials system including:
- List specials for restaurants
- Create/update/delete specials (restaurant owners/admins)
- Claim specials (users/guests)
- Redeem claims (staff)
- Track analytics events
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from uuid import UUID

from flask import Blueprint, request, jsonify, current_app
from sqlalchemy import and_, or_, func, desc
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import BadRequest, NotFound, Conflict, Unauthorized

from database.models import db
from database.specials_models import (
    Special, SpecialClaim, SpecialEvent, SpecialMedia,
    DiscountKind, ClaimStatus, MediaKind
)
from middleware.auth import require_auth, get_current_user
from middleware.rate_limit import rate_limit
from utils.error_handling import handle_api_error
from utils.validation import validate_json_schema

logger = logging.getLogger(__name__)

# Create Blueprint
specials_bp = Blueprint('specials', __name__, url_prefix='/v5/specials')

# Rate limiting configurations
CLAIM_RATE_LIMIT = "10 per minute"
REDEEM_RATE_LIMIT = "30 per minute"
EVENT_RATE_LIMIT = "100 per minute"


@specials_bp.route('/restaurants/<int:restaurant_id>/specials', methods=['GET'])
def get_restaurant_specials(restaurant_id: int):
    """Get specials for a specific restaurant.
    
    Query Parameters:
    - window: now|today|range (default: now)
    - from: ISO timestamp (required for range)
    - until: ISO timestamp (required for range)
    - limit: number (default: 50, max: 100)
    - offset: number (default: 0)
    """
    try:
        # Parse query parameters
        window = request.args.get('window', 'now')
        from_time = request.args.get('from')
        until_time = request.args.get('until')
        limit = min(int(request.args.get('limit', 50)), 100)
        offset = int(request.args.get('offset', 0))
        
        # Validate time window
        if window == 'range':
            if not from_time or not until_time:
                raise BadRequest("from and until parameters required for range window")
            try:
                from_time = datetime.fromisoformat(from_time.replace('Z', '+00:00'))
                until_time = datetime.fromisoformat(until_time.replace('Z', '+00:00'))
            except ValueError:
                raise BadRequest("Invalid timestamp format")
        elif window == 'today':
            now = datetime.now(timezone.utc)
            from_time = now.replace(hour=0, minute=0, second=0, microsecond=0)
            until_time = from_time.replace(hour=23, minute=59, second=59, microsecond=999999)
        else:  # window == 'now'
            now = datetime.now(timezone.utc)
            from_time = now
            until_time = now
        
        # Build query
        query = db.session.query(Special).filter(
            Special.restaurant_id == restaurant_id,
            Special.is_active == True,
            Special.deleted_at.is_(None)
        )
        
        # Apply time filter
        if window == 'range':
            query = query.filter(
                Special.valid_from <= until_time,
                Special.valid_until >= from_time
            )
        else:
            query = query.filter(
                Special.valid_from <= until_time,
                Special.valid_until >= from_time
            )
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        specials = query.order_by(Special.valid_from.asc()).offset(offset).limit(limit).all()
        
        # Format response
        result = []
        for special in specials:
            # Get media items
            media_items = db.session.query(SpecialMedia).filter(
                SpecialMedia.special_id == special.id
            ).order_by(SpecialMedia.position.asc()).all()
            
            # Check if user can claim (if authenticated)
            can_claim = True
            user_claims_remaining = 0
            
            current_user = get_current_user()
            if current_user:
                # Check existing claims for authenticated user
                existing_claims = db.session.query(SpecialClaim).filter(
                    SpecialClaim.special_id == special.id,
                    SpecialClaim.user_id == current_user.id
                ).count()
                
                if special.per_visit:
                    # Check today's claims
                    today = datetime.now(timezone.utc).date()
                    today_claims = db.session.query(SpecialClaim).filter(
                        SpecialClaim.special_id == special.id,
                        SpecialClaim.user_id == current_user.id,
                        func.date(SpecialClaim.claimed_at) == today
                    ).count()
                    user_claims_remaining = max(0, special.max_claims_per_user - today_claims)
                else:
                    # Check total claims
                    user_claims_remaining = max(0, special.max_claims_per_user - existing_claims)
                
                can_claim = user_claims_remaining > 0
            
            special_data = {
                'id': str(special.id),
                'title': special.title,
                'subtitle': special.subtitle,
                'description': special.description,
                'discount_type': special.discount_type,
                'discount_value': float(special.discount_value) if special.discount_value else None,
                'discount_label': special.discount_label,
                'valid_from': special.valid_from.isoformat(),
                'valid_until': special.valid_until.isoformat(),
                'max_claims_total': special.max_claims_total,
                'max_claims_per_user': special.max_claims_per_user,
                'per_visit': special.per_visit,
                'requires_code': special.requires_code,
                'code_hint': special.code_hint,
                'terms': special.terms,
                'hero_image_url': special.hero_image_url,
                'media_items': [
                    {
                        'id': str(item.id),
                        'kind': item.kind,
                        'url': item.url,
                        'alt_text': item.alt_text,
                        'position': item.position
                    }
                    for item in media_items
                ],
                'can_claim': can_claim,
                'user_claims_remaining': user_claims_remaining,
                'created_at': special.created_at.isoformat()
            }
            result.append(special_data)
        
        return jsonify({
            'specials': result,
            'total': total,
            'has_more': offset + limit < total,
            'window': window,
            'from': from_time.isoformat() if window == 'range' else None,
            'until': until_time.isoformat() if window == 'range' else None
        })
        
    except BadRequest as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.exception("Error getting restaurant specials")
        return jsonify({'error': 'Internal server error'}), 500


@specials_bp.route('', methods=['POST'])
@require_auth
def create_special():
    """Create a new special (restaurant owners/admins only)."""
    try:
        # Get current user
        current_user = get_current_user()
        if not current_user:
            raise Unauthorized("Authentication required")
        
        # Validate request data
        data = request.get_json()
        if not data:
            raise BadRequest("JSON data required")
        
        # Validate required fields
        required_fields = ['restaurant_id', 'title', 'discount_type', 'discount_label', 
                          'valid_from', 'valid_until']
        for field in required_fields:
            if field not in data:
                raise BadRequest(f"Missing required field: {field}")
        
        # TODO: Add authorization check - verify user owns restaurant or is admin
        
        # Parse timestamps
        try:
            valid_from = datetime.fromisoformat(data['valid_from'].replace('Z', '+00:00'))
            valid_until = datetime.fromisoformat(data['valid_until'].replace('Z', '+00:00'))
        except ValueError:
            raise BadRequest("Invalid timestamp format")
        
        # Validate discount type exists
        discount_kind = db.session.query(DiscountKind).filter(
            DiscountKind.code == data['discount_type']
        ).first()
        if not discount_kind:
            raise BadRequest("Invalid discount type")
        
        # Create special
        special = Special(
            restaurant_id=data['restaurant_id'],
            title=data['title'],
            subtitle=data.get('subtitle'),
            description=data.get('description'),
            discount_type=data['discount_type'],
            discount_value=data.get('discount_value'),
            discount_label=data['discount_label'],
            valid_from=valid_from,
            valid_until=valid_until,
            max_claims_total=data.get('max_claims_total'),
            max_claims_per_user=data.get('max_claims_per_user', 1),
            per_visit=data.get('per_visit', False),
            requires_code=data.get('requires_code', False),
            code_hint=data.get('code_hint'),
            terms=data.get('terms'),
            hero_image_url=data.get('hero_image_url'),
            created_by=current_user.id
        )
        
        db.session.add(special)
        db.session.commit()
        
        # Add media items if provided
        if 'media_items' in data:
            for i, media_data in enumerate(data['media_items']):
                media_item = SpecialMedia(
                    special_id=special.id,
                    kind=media_data.get('kind', 'image'),
                    url=media_data['url'],
                    alt_text=media_data.get('alt_text'),
                    position=media_data.get('position', i)
                )
                db.session.add(media_item)
        
        db.session.commit()
        
        return jsonify({
            'id': str(special.id),
            'message': 'Special created successfully'
        }), 201
        
    except BadRequest as e:
        return jsonify({'error': str(e)}), 400
    except Unauthorized as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        db.session.rollback()
        logger.exception("Error creating special")
        return jsonify({'error': 'Internal server error'}), 500


@specials_bp.route('/<uuid:special_id>', methods=['PATCH'])
@require_auth
def update_special(special_id: UUID):
    """Update a special (restaurant owners/admins only)."""
    try:
        # Get current user
        current_user = get_current_user()
        if not current_user:
            raise Unauthorized("Authentication required")
        
        # Find special
        special = db.session.query(Special).filter(
            Special.id == special_id,
            Special.deleted_at.is_(None)
        ).first()
        
        if not special:
            raise NotFound("Special not found")
        
        # TODO: Add authorization check - verify user owns restaurant or is admin
        
        # Get update data
        data = request.get_json()
        if not data:
            raise BadRequest("JSON data required")
        
        # Update fields
        if 'title' in data:
            special.title = data['title']
        if 'subtitle' in data:
            special.subtitle = data['subtitle']
        if 'description' in data:
            special.description = data['description']
        if 'discount_type' in data:
            # Validate discount type
            discount_kind = db.session.query(DiscountKind).filter(
                DiscountKind.code == data['discount_type']
            ).first()
            if not discount_kind:
                raise BadRequest("Invalid discount type")
            special.discount_type = data['discount_type']
        if 'discount_value' in data:
            special.discount_value = data['discount_value']
        if 'discount_label' in data:
            special.discount_label = data['discount_label']
        if 'valid_from' in data:
            try:
                special.valid_from = datetime.fromisoformat(data['valid_from'].replace('Z', '+00:00'))
            except ValueError:
                raise BadRequest("Invalid valid_from timestamp format")
        if 'valid_until' in data:
            try:
                special.valid_until = datetime.fromisoformat(data['valid_until'].replace('Z', '+00:00'))
            except ValueError:
                raise BadRequest("Invalid valid_until timestamp format")
        if 'max_claims_total' in data:
            special.max_claims_total = data['max_claims_total']
        if 'max_claims_per_user' in data:
            special.max_claims_per_user = data['max_claims_per_user']
        if 'per_visit' in data:
            special.per_visit = data['per_visit']
        if 'requires_code' in data:
            special.requires_code = data['requires_code']
        if 'code_hint' in data:
            special.code_hint = data['code_hint']
        if 'terms' in data:
            special.terms = data['terms']
        if 'hero_image_url' in data:
            special.hero_image_url = data['hero_image_url']
        if 'is_active' in data:
            special.is_active = data['is_active']
        
        db.session.commit()
        
        return jsonify({
            'id': str(special.id),
            'message': 'Special updated successfully'
        })
        
    except BadRequest as e:
        return jsonify({'error': str(e)}), 400
    except Unauthorized as e:
        return jsonify({'error': str(e)}), 401
    except NotFound as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        db.session.rollback()
        logger.exception("Error updating special")
        return jsonify({'error': 'Internal server error'}), 500


@specials_bp.route('/<uuid:special_id>/claim', methods=['POST'])
@rate_limit(CLAIM_RATE_LIMIT)
def claim_special(special_id: UUID):
    """Claim a special (users or guests)."""
    try:
        # Get current user (optional for guests)
        current_user = get_current_user()
        guest_session_id = request.json.get('guest_session_id') if request.json else None
        
        if not current_user and not guest_session_id:
            raise BadRequest("Either authentication or guest_session_id required")
        
        # Find special
        special = db.session.query(Special).filter(
            Special.id == special_id,
            Special.is_active == True,
            Special.deleted_at.is_(None)
        ).first()
        
        if not special:
            raise NotFound("Special not found")
        
        # Check if special is currently valid
        now = datetime.now(timezone.utc)
        if special.valid_from > now or special.valid_until < now:
            raise BadRequest("Special is not currently active")
        
        # Check total claims limit
        if special.max_claims_total:
            total_claims = db.session.query(SpecialClaim).filter(
                SpecialClaim.special_id == special.id
            ).count()
            if total_claims >= special.max_claims_total:
                raise Conflict("Special has reached maximum claims limit")
        
        # Create claim
        claim = SpecialClaim(
            special_id=special.id,
            user_id=current_user.id if current_user else None,
            guest_session_id=guest_session_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        try:
            db.session.add(claim)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            if current_user:
                raise Conflict("You have already claimed this special")
            else:
                raise Conflict("This guest session has already claimed this special")
        
        # Log claim event
        event = SpecialEvent(
            special_id=special.id,
            user_id=current_user.id if current_user else None,
            guest_session_id=guest_session_id,
            event_type='claim',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        db.session.add(event)
        db.session.commit()
        
        # Generate redeem code if required
        redeem_code = None
        if special.requires_code:
            # Generate a simple code (in production, use a more secure method)
            redeem_code = f"{special_id.hex[:8].upper()}-{claim.id.hex[:4].upper()}"
        
        return jsonify({
            'claim_id': str(claim.id),
            'status': claim.status,
            'claimed_at': claim.claimed_at.isoformat(),
            'redeem_code': redeem_code,
            'terms': special.terms,
            'message': 'Special claimed successfully'
        }), 201
        
    except BadRequest as e:
        return jsonify({'error': str(e)}), 400
    except Conflict as e:
        return jsonify({'error': str(e)}), 409
    except NotFound as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        db.session.rollback()
        logger.exception("Error claiming special")
        return jsonify({'error': 'Internal server error'}), 500


@specials_bp.route('/<uuid:special_id>/redeem', methods=['POST'])
@require_auth
@rate_limit(REDEEM_RATE_LIMIT)
def redeem_claim(special_id: UUID):
    """Redeem a claim (staff only)."""
    try:
        # Get current user
        current_user = get_current_user()
        if not current_user:
            raise Unauthorized("Authentication required")
        
        # TODO: Add authorization check - verify user is staff for restaurant
        
        # Get request data
        data = request.get_json()
        if not data:
            raise BadRequest("JSON data required")
        
        claim_id = data.get('claim_id')
        redeem_code = data.get('redeem_code')
        
        if not claim_id:
            raise BadRequest("claim_id required")
        
        # Find claim
        claim = db.session.query(SpecialClaim).filter(
            SpecialClaim.id == claim_id,
            SpecialClaim.special_id == special_id,
            SpecialClaim.status == 'claimed'
        ).first()
        
        if not claim:
            raise NotFound("Valid claim not found")
        
        # Verify redeem code if required
        if redeem_code:
            expected_code = f"{special_id.hex[:8].upper()}-{claim.id.hex[:4].upper()}"
            if redeem_code.upper() != expected_code:
                raise BadRequest("Invalid redeem code")
        
        # Update claim status
        claim.status = 'redeemed'
        claim.redeemed_at = datetime.now(timezone.utc)
        claim.redeemed_by = current_user.id
        
        db.session.commit()
        
        return jsonify({
            'claim_id': str(claim.id),
            'status': claim.status,
            'redeemed_at': claim.redeemed_at.isoformat(),
            'redeemed_by': str(current_user.id),
            'message': 'Claim redeemed successfully'
        })
        
    except BadRequest as e:
        return jsonify({'error': str(e)}), 400
    except Unauthorized as e:
        return jsonify({'error': str(e)}), 401
    except NotFound as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        db.session.rollback()
        logger.exception("Error redeeming claim")
        return jsonify({'error': 'Internal server error'}), 500


@specials_bp.route('/<uuid:special_id>/events', methods=['POST'])
@rate_limit(EVENT_RATE_LIMIT)
def track_special_event(special_id: UUID):
    """Track analytics events for specials (view, share, click)."""
    try:
        # Get current user (optional)
        current_user = get_current_user()
        guest_session_id = request.json.get('guest_session_id') if request.json else None
        
        # Get request data
        data = request.get_json()
        if not data:
            raise BadRequest("JSON data required")
        
        event_type = data.get('event_type')
        if event_type not in ['view', 'share', 'click']:
            raise BadRequest("Invalid event_type. Must be one of: view, share, click")
        
        # Verify special exists
        special = db.session.query(Special).filter(
            Special.id == special_id,
            Special.deleted_at.is_(None)
        ).first()
        
        if not special:
            raise NotFound("Special not found")
        
        # Create event
        event = SpecialEvent(
            special_id=special.id,
            user_id=current_user.id if current_user else None,
            guest_session_id=guest_session_id,
            event_type=event_type,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        db.session.add(event)
        db.session.commit()
        
        return jsonify({
            'event_id': str(event.id),
            'message': 'Event tracked successfully'
        }), 201
        
    except BadRequest as e:
        return jsonify({'error': str(e)}), 400
    except NotFound as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        db.session.rollback()
        logger.exception("Error tracking special event")
        return jsonify({'error': 'Internal server error'}), 500


@specials_bp.route('/discount-kinds', methods=['GET'])
def get_discount_kinds():
    """Get available discount kinds."""
    try:
        kinds = db.session.query(DiscountKind).order_by(DiscountKind.label).all()
        
        result = [
            {
                'code': kind.code,
                'label': kind.label,
                'description': kind.description
            }
            for kind in kinds
        ]
        
        return jsonify({'discount_kinds': result})
        
    except Exception as e:
        logger.exception("Error getting discount kinds")
        return jsonify({'error': 'Internal server error'}), 500


@specials_bp.route('/media-kinds', methods=['GET'])
def get_media_kinds():
    """Get available media kinds."""
    try:
        kinds = db.session.query(MediaKind).order_by(MediaKind.label).all()
        
        result = [
            {
                'code': kind.code,
                'label': kind.label,
                'description': kind.description
            }
            for kind in kinds
        ]
        
        return jsonify({'media_kinds': result})
        
    except Exception as e:
        logger.exception("Error getting media kinds")
        return jsonify({'error': 'Internal server error'}), 500


# Error handlers
@specials_bp.errorhandler(400)
def handle_bad_request(error):
    return jsonify({'error': 'Bad request'}), 400


@specials_bp.errorhandler(401)
def handle_unauthorized(error):
    return jsonify({'error': 'Unauthorized'}), 401


@specials_bp.errorhandler(404)
def handle_not_found(error):
    return jsonify({'error': 'Not found'}), 404


@specials_bp.errorhandler(409)
def handle_conflict(error):
    return jsonify({'error': 'Conflict'}), 409


@specials_bp.errorhandler(500)
def handle_internal_error(error):
    logger.exception("Internal server error in specials API")
    return jsonify({'error': 'Internal server error'}), 500
