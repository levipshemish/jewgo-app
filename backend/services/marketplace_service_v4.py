#!/usr/bin/env python3
"""Marketplace Service v4 - Streamlined marketplace operations.

This service provides marketplace functionality with three creation paths:
- Regular (generic items)
- Vehicle (with vehicle-specific attributes)
- Appliance (with kosher flags)

Author: JewGo Development Team
Version: 4.1
Last Updated: 2024
"""

import json
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from utils.logging_config import get_logger

logger = get_logger(__name__)


class MarketplaceServiceV4:
    """Marketplace service for managing listings and categories."""

    def __init__(self, db_manager=None, cache_manager=None, config=None):
        """Initialize the marketplace service."""
        self.db_manager = db_manager
        self.cache_manager = cache_manager
        self.config = config
        
        logger.info("MarketplaceServiceV4 (Streamlined) initialized")

    def get_listings(
        self, 
        limit: int = 50, 
        offset: int = 0,
        search: Optional[str] = None,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        kind: Optional[str] = None,  # Changed from listing_type to kind
        condition: Optional[str] = None,
        min_price: Optional[int] = None,
        max_price: Optional[int] = None,
        city: Optional[str] = None,
        region: Optional[str] = None,
        status: str = 'active',
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        radius: float = 10.0
    ) -> Dict[str, Any]:
        """Get marketplace listings with filtering and pagination."""
        try:
            # Build query
            query = """
                SELECT l.*, 
                       c.name as category_name,
                       sc.name as subcategory_name,
                       u.display_name as seller_name
                FROM listings l
                LEFT JOIN categories c ON l.category_id = c.id
                LEFT JOIN subcategories sc ON l.subcategory_id = sc.id
                LEFT JOIN users u ON l.seller_user_id = u.id
                WHERE l.status = %s
            """
            params = [status]
            
            # Add filters
            if search:
                query += " AND (l.title ILIKE %s OR l.description ILIKE %s)"
                params.extend([f'%{search}%', f'%{search}%'])
            
            if category:
                query += " AND c.slug = %s"
                params.append(category)
                
            if subcategory:
                query += " AND sc.slug = %s"
                params.append(subcategory)
                
            if kind:  # Changed from listing_type to kind
                query += " AND l.kind = %s"
                params.append(kind)
                
            if condition:
                query += " AND l.condition = %s"
                params.append(condition)
            
            if min_price is not None:
                query += " AND l.price_cents >= %s"
                params.append(min_price)
            
            if max_price is not None:
                query += " AND l.price_cents <= %s"
                params.append(max_price)
            
            if city:
                query += " AND l.city ILIKE %s"
                params.append(f'%{city}%')
                
            if region:
                query += " AND l.region = %s"
                params.append(region)
            
            # Location-based filtering
            if lat and lng and radius:
                # Convert radius from miles to degrees (approximate)
                radius_degrees = radius / 69.0
                query += """
                    AND l.lat IS NOT NULL 
                    AND l.lng IS NOT NULL
                    AND l.lat BETWEEN %s AND %s
                    AND l.lng BETWEEN %s AND %s
                """
                params.extend([
                    lat - radius_degrees, lat + radius_degrees,
                    lng - radius_degrees, lng + radius_degrees
                ])
            
            # Add ordering and pagination
            query += " ORDER BY l.created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            # Execute query
            with self.db_manager.connection_manager.get_session_context() as session:
                from sqlalchemy import text
                
                # Convert psycopg2-style parameters to SQLAlchemy-style
                # Replace %s with numbered parameters
                sqlalchemy_query = query
                sqlalchemy_params = {}
                for i, param in enumerate(params):
                    param_name = f"param_{i}"
                    sqlalchemy_query = sqlalchemy_query.replace("%s", f":{param_name}", 1)
                    sqlalchemy_params[param_name] = param
                
                # Execute main query
                result = session.execute(text(sqlalchemy_query), sqlalchemy_params)
                listings = result.fetchall()
                
                # Get total count for pagination
                count_query = sqlalchemy_query.replace("SELECT l.*, ", "SELECT COUNT(*) as total FROM listings l ")
                count_query = count_query.split("ORDER BY")[0]  # Remove ORDER BY and LIMIT
                count_params = {k: v for k, v in sqlalchemy_params.items() if not k.endswith(f"_{len(params)-2}") and not k.endswith(f"_{len(params)-1}")}
                count_result = session.execute(text(count_query), count_params)
                total = count_result.scalar()
            
            # Format response
            formatted_listings = []
            for listing in listings:
                formatted_listing = {
                    'id': str(listing[0]),
                    'kind': listing[1],  # Changed from type to kind
                    'txn_type': listing[2],  # New field
                    'title': listing[3],
                    'description': listing[4],
                    'price_cents': listing[5],
                    'currency': listing[6],
                    'condition': listing[7],
                    'category_id': listing[8],
                    'subcategory_id': listing[9],
                    'city': listing[10],
                    'region': listing[11],
                    'zip': listing[12],
                    'country': listing[13],
                    'lat': listing[14],
                    'lng': listing[15],
                    'seller_user_id': listing[16],
                    'attributes': listing[17],
                    'endorse_up': listing[18],
                    'endorse_down': listing[19],
                    'status': listing[20],
                    'created_at': listing[21].isoformat(),
                    'updated_at': listing[22].isoformat(),
                    'category_name': listing[23],
                    'subcategory_name': listing[24],
                    'seller_name': listing[25]
                }
                formatted_listings.append(formatted_listing)
            
            return {
                'success': True,
                'data': {
                    'listings': formatted_listings,
                    'total': total,
                    'limit': limit,
                    'offset': offset
                }
            }
            
        except Exception as e:
            logger.exception("Error fetching marketplace listings")
            return {
                'success': False,
                'error': 'Failed to fetch marketplace listings',
                'details': str(e)
            }

    def get_listing(self, listing_id: str) -> Dict[str, Any]:
        """Get a specific marketplace listing by ID."""
        try:
            with self.db_manager.connection_manager.get_session_context() as session:
                from sqlalchemy import text
                
                result = session.execute(text("""
                    SELECT l.*, 
                           c.name as category_name,
                           sc.name as subcategory_name,
                           u.display_name as seller_name,
                           u.username as seller_username
                    FROM listings l
                    LEFT JOIN categories c ON l.category_id = c.id
                    LEFT JOIN subcategories sc ON l.subcategory_id = sc.id
                    LEFT JOIN users u ON l.seller_user_id = u.id
                    WHERE l.id = :listing_id
                """), {'listing_id': listing_id})
                
                listing = result.fetchone()
                
                if not listing:
                    return {
                        'success': False,
                        'error': 'Listing not found'
                    }
                
                # Format response
                formatted_listing = {
                        'id': str(listing[0]),
                        'kind': listing[1],
                        'txn_type': listing[2],
                        'title': listing[3],
                        'description': listing[4],
                        'price_cents': listing[5],
                        'currency': listing[6],
                        'condition': listing[7],
                        'category_id': listing[8],
                        'subcategory_id': listing[9],
                        'city': listing[10],
                        'region': listing[11],
                        'zip': listing[12],
                        'country': listing[13],
                        'lat': listing[14],
                        'lng': listing[15],
                        'seller_user_id': listing[16],
                        'attributes': listing[17],
                        'endorse_up': listing[18],
                        'endorse_down': listing[19],
                        'status': listing[20],
                        'created_at': listing[21].isoformat(),
                        'updated_at': listing[22].isoformat(),
                        'category_name': listing[23],
                        'subcategory_name': listing[24],
                        'seller_name': listing[25],
                        'seller_username': listing[26]
                    }
            
            return {
                    'success': True,
                    'data': formatted_listing
            }
            
        except Exception as e:
            logger.exception("Error fetching marketplace listing")
            return {
                'success': False,
                'error': 'Failed to fetch marketplace listing',
                'details': str(e)
            }

    def create_listing(self, listing_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new marketplace listing."""
        try:
            # Validate required fields
            required_fields = ['title', 'kind', 'category_id', 'condition', 'price_cents']
            for field in required_fields:
                if field not in listing_data:
                    return {
                        'success': False,
                        'error': f'Missing required field: {field}'
                    }
            
            # Validate listing kind
            valid_kinds = ['regular', 'vehicle', 'appliance']
            if listing_data['kind'] not in valid_kinds:
                return {
                    'success': False,
                    'error': f'Invalid listing kind. Must be one of: {valid_kinds}'
                }
            
            # Validate condition
            valid_conditions = ['new', 'used_like_new', 'used_good', 'used_fair']
            if listing_data['condition'] not in valid_conditions:
                return {
                    'success': False,
                    'error': f'Invalid condition. Must be one of: {valid_conditions}'
                }
            
            # Validate price
            if listing_data['price_cents'] < 0:
                        return {
                    'success': False,
                    'error': 'Price cannot be negative'
                }
            
            with self.db_manager.connection_manager.get_session_context() as session:
                from sqlalchemy import text
                
                # Set defaults
                listing_data.setdefault('txn_type', 'sale')
                listing_data.setdefault('currency', 'USD')
                listing_data.setdefault('country', 'US')
                listing_data.setdefault('status', 'active')
                listing_data.setdefault('attributes', {})
                
                # Insert listing
                result = session.execute(text("""
                    INSERT INTO listings (
                        kind, txn_type, title, description, price_cents, currency,
                        condition, category_id, subcategory_id, city, region, zip,
                        country, lat, lng, seller_user_id, attributes, status
                    ) VALUES (
                        :kind, :txn_type, :title, :description, :price_cents, :currency,
                        :condition, :category_id, :subcategory_id, :city, :region, :zip,
                        :country, :lat, :lng, :seller_user_id, :attributes, :status
                    ) RETURNING id
                """), {
                    'kind': listing_data['kind'],
                    'txn_type': listing_data['txn_type'],
                    'title': listing_data['title'],
                    'description': listing_data.get('description'),
                    'price_cents': listing_data['price_cents'],
                    'currency': listing_data['currency'],
                    'condition': listing_data['condition'],
                    'category_id': listing_data['category_id'],
                    'subcategory_id': listing_data.get('subcategory_id'),
                    'city': listing_data.get('city'),
                    'region': listing_data.get('region'),
                    'zip': listing_data.get('zip'),
                    'country': listing_data['country'],
                    'lat': listing_data.get('lat'),
                    'lng': listing_data.get('lng'),
                    'seller_user_id': listing_data.get('seller_user_id'),
                    'attributes': json.dumps(listing_data['attributes']),
                    'status': listing_data['status']
                })
                
                listing_id = result.scalar()
            
            return {
                    'success': True,
                    'data': {
                        'id': str(listing_id),
                        'message': 'Listing created successfully'
                    }
            }
            
        except Exception as e:
            logger.exception("Error creating marketplace listing")
            return {
                'success': False,
                'error': 'Failed to create marketplace listing',
                'details': str(e)
            }

    def get_categories(self) -> Dict[str, Any]:
        """Get marketplace categories and subcategories."""
        try:
            with self.db_manager.connection_manager.get_session_context() as session:
                from sqlalchemy import text
                
                # Get categories
                result = session.execute(text("""
                    SELECT id, name, slug, sort_order, active
                    FROM categories
                    WHERE active = true
                    ORDER BY sort_order, name
                """))
                categories = result.fetchall()
                
                # Get subcategories for each category
                formatted_categories = []
                for category in categories:
                    sub_result = session.execute(text("""
                        SELECT id, name, slug, sort_order, active
                        FROM subcategories
                        WHERE category_id = :category_id AND active = true
                        ORDER BY sort_order, name
                    """), {'category_id': category[0]})
                    subcategories = sub_result.fetchall()
                    
                    formatted_category = {
                        'id': category[0],
                        'name': category[1],
                        'slug': category[2],
                        'sort_order': category[3],
                        'active': category[4],
                        'subcategories': [
                            {
                                'id': sub[0],
                                'name': sub[1],
                                'slug': sub[2],
                                'sort_order': sub[3],
                                'active': sub[4]
                            }
                            for sub in subcategories
                        ]
                    }
                    formatted_categories.append(formatted_category)
                    
                    return {
                    'success': True,
                    'data': formatted_categories
                    }
            
        except Exception as e:
            logger.exception("Error fetching marketplace categories")
            return {
                'success': False,
                'error': 'Failed to fetch marketplace categories',
                'details': str(e)
            }


