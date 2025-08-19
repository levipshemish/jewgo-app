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
            # Build query for marketplace table with specific column order
            query = """
                SELECT m.id, m.title, m.description, m.price, m.currency, m.city, m.state, m.zip_code, 
                       m.latitude, m.longitude, m.vendor_id, m.vendor_name, m.vendor_phone, m.vendor_email,
                       m.kosher_agency, m.kosher_level, m.is_available, m.is_featured, m.is_on_sale, 
                       m.discount_percentage, m.stock, m.rating, m.review_count, m.status, m.created_at, 
                       m.updated_at, m.category as category_name, m.subcategory as subcategory_name, 
                       m.vendor_name as seller_name
                FROM marketplace m
                WHERE m.status = %s
            """
            params = [status]
            
            # Add filters
            if search:
                query += " AND (m.title ILIKE %s OR m.description ILIKE %s)"
                params.extend([f'%{search}%', f'%{search}%'])
            
            if category:
                query += " AND m.category ILIKE %s"
                params.append(f'%{category}%')
                
            if subcategory:
                query += " AND m.subcategory ILIKE %s"
                params.append(f'%{subcategory}%')
                
            if kind:  # Map kind to appropriate marketplace fields
                if kind == 'regular':
                    query += " AND m.category NOT IN ('vehicle', 'appliance')"
                elif kind == 'vehicle':
                    query += " AND m.category ILIKE %s"
                    params.append('%vehicle%')
                elif kind == 'appliance':
                    query += " AND m.category ILIKE %s"
                    params.append('%appliance%')
                
            if condition:
                # Marketplace table doesn't have condition field, skip this filter
                pass
            
            if min_price is not None:
                query += " AND m.price >= %s"
                params.append(min_price / 100.0)  # Convert cents to dollars
            
            if max_price is not None:
                query += " AND m.price <= %s"
                params.append(max_price / 100.0)  # Convert cents to dollars
            
            if city:
                query += " AND m.city ILIKE %s"
                params.append(f'%{city}%')
                
            if region:
                query += " AND m.state ILIKE %s"
                params.append(f'%{region}%')
            
            # Location-based filtering
            if lat and lng and radius:
                # Convert radius from miles to degrees (approximate)
                radius_degrees = radius / 69.0
                query += """
                    AND m.latitude IS NOT NULL 
                    AND m.longitude IS NOT NULL
                    AND m.latitude BETWEEN %s AND %s
                    AND m.longitude BETWEEN %s AND %s
                """
                params.extend([
                    lat - radius_degrees, lat + radius_degrees,
                    lng - radius_degrees, lng + radius_degrees
                ])
            
            # Add ordering and pagination
            query += " ORDER BY m.created_at DESC LIMIT %s OFFSET %s"
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
                count_query = sqlalchemy_query.replace("SELECT m.*, ", "SELECT COUNT(*) as total FROM marketplace m ")
                count_query = count_query.split("ORDER BY")[0]  # Remove ORDER BY and LIMIT
                count_params = {k: v for k, v in sqlalchemy_params.items() if not k.endswith(f"_{len(params)-2}") and not k.endswith(f"_{len(params)-1}")}
                count_result = session.execute(text(count_query), count_params)
                total = count_result.scalar()
            
            # Format response for marketplace table
            formatted_listings = []
            for listing in listings:
                # Convert marketplace table structure to expected format
                # Use dictionary access since SQLAlchemy returns Row objects
                formatted_listing = {
                    'id': str(listing[0]),  # id
                    'kind': 'regular',  # Default to regular for marketplace items
                    'txn_type': 'sale',  # Default to sale
                    'title': listing[1],  # title
                    'description': listing[2],  # description
                    'price_cents': int(float(listing[3]) * 100) if listing[3] else 0,  # price (convert to cents)
                    'currency': listing[4] or 'USD',  # currency
                    'condition': 'new',  # Default condition for marketplace items
                    'category_id': None,  # Not used in marketplace table
                    'subcategory_id': None,  # Not used in marketplace table
                    'city': listing[5],  # city
                    'region': listing[6],  # state (map to region)
                    'zip': listing[7],  # zip_code
                    'country': 'US',  # Default country
                    'lat': float(listing[8]) if listing[8] else None,  # latitude
                    'lng': float(listing[9]) if listing[9] else None,  # longitude
                    'seller_user_id': listing[10],  # vendor_id
                    'attributes': {
                        'vendor_name': listing[11],  # vendor_name
                        'vendor_phone': listing[12],  # vendor_phone
                        'vendor_email': listing[13],  # vendor_email
                        'kosher_agency': listing[14],  # kosher_agency
                        'kosher_level': listing[15],  # kosher_level
                        'is_available': listing[16],  # is_available
                        'is_featured': listing[17],  # is_featured
                        'is_on_sale': listing[18],  # is_on_sale
                        'discount_percentage': listing[19],  # discount_percentage
                        'stock': listing[20],  # stock
                        'rating': float(listing[21]) if listing[21] else None,  # rating
                        'review_count': listing[22] or 0  # review_count
                    },
                    'endorse_up': 0,  # Default values
                    'endorse_down': 0,  # Default values
                    'status': listing[23],  # status
                    'created_at': listing[24].isoformat() if listing[24] else None,  # created_at
                    'updated_at': listing[25].isoformat() if listing[25] else None,  # updated_at
                    'category_name': listing[26],  # category_name (from alias)
                    'subcategory_name': listing[27],  # subcategory_name (from alias)
                    'seller_name': listing[28]  # seller_name (from alias)
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
                    SELECT m.id, m.title, m.description, m.price, m.currency, m.city, m.state, m.zip_code, 
                           m.latitude, m.longitude, m.vendor_id, m.vendor_name, m.vendor_phone, m.vendor_email,
                           m.kosher_agency, m.kosher_level, m.is_available, m.is_featured, m.is_on_sale, 
                           m.discount_percentage, m.stock, m.rating, m.review_count, m.status, m.created_at, 
                           m.updated_at, m.category as category_name, m.subcategory as subcategory_name, 
                           m.vendor_name as seller_name, m.vendor_id as seller_username
                    FROM marketplace m
                    WHERE m.id = :listing_id
                """), {'listing_id': listing_id})
                
                listing = result.fetchone()
                
                if not listing:
                    return {
                        'success': False,
                        'error': 'Listing not found'
                    }
                
                # Format response for marketplace table with specific column order
                formatted_listing = {
                    'id': str(listing[0]),  # id
                    'kind': 'regular',  # Default to regular for marketplace items
                    'txn_type': 'sale',  # Default to sale
                    'title': listing[1],  # title
                    'description': listing[2],  # description
                    'price_cents': int(float(listing[3]) * 100) if listing[3] else 0,  # price (convert to cents)
                    'currency': listing[4] or 'USD',  # currency
                    'condition': 'new',  # Default condition for marketplace items
                    'category_id': None,  # Not used in marketplace table
                    'subcategory_id': None,  # Not used in marketplace table
                    'city': listing[5],  # city
                    'region': listing[6],  # state (map to region)
                    'zip': listing[7],  # zip_code
                    'country': 'US',  # Default country
                    'lat': float(listing[8]) if listing[8] else None,  # latitude
                    'lng': float(listing[9]) if listing[9] else None,  # longitude
                    'seller_user_id': listing[10],  # vendor_id
                    'attributes': {
                        'vendor_name': listing[11],  # vendor_name
                        'vendor_phone': listing[12],  # vendor_phone
                        'vendor_email': listing[13],  # vendor_email
                        'kosher_agency': listing[14],  # kosher_agency
                        'kosher_level': listing[15],  # kosher_level
                        'is_available': listing[16],  # is_available
                        'is_featured': listing[17],  # is_featured
                        'is_on_sale': listing[18],  # is_on_sale
                        'discount_percentage': listing[19],  # discount_percentage
                        'stock': listing[20],  # stock
                        'rating': float(listing[21]) if listing[21] else None,  # rating
                        'review_count': listing[22] or 0  # review_count
                    },
                    'endorse_up': 0,  # Default values
                    'endorse_down': 0,  # Default values
                    'status': listing[23],  # status
                    'created_at': listing[24].isoformat() if listing[24] else None,  # created_at
                    'updated_at': listing[25].isoformat() if listing[25] else None,  # updated_at
                    'category_name': listing[26],  # category_name (from alias)
                    'subcategory_name': listing[27],  # subcategory_name (from alias)
                    'seller_name': listing[28],  # seller_name (from alias)
                    'seller_username': listing[29]  # seller_username (from alias)
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


