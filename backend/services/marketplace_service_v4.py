#!/usr/bin/env python3
"""Marketplace Service v4 - Service layer for marketplace operations.

This service provides marketplace functionality including listings, categories,
gemachs, and user management. It follows the v4 service layer architecture
pattern used throughout the JewGo application.

Author: JewGo Development Team
Version: 4.0
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
        
        logger.info("MarketplaceServiceV4 initialized")

    def get_listings(
        self,
        limit: int = 50,
        offset: int = 0,
        search: Optional[str] = None,
        category: Optional[str] = None,
        subcategory: Optional[str] = None,
        listing_type: Optional[str] = None,
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
                
            if listing_type:
                query += " AND l.type = %s"
                params.append(listing_type)
                
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
            with self.db_manager.connection_manager.get_session() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, params)
                    listings = cursor.fetchall()
                    
                    # Get total count for pagination
                    count_query = query.replace("SELECT l.*, ", "SELECT COUNT(*) as total FROM listings l ")
                    count_query = count_query.split("ORDER BY")[0]  # Remove ORDER BY and LIMIT
                    cursor.execute(count_query, params[:-2])  # Remove limit and offset
                    total = cursor.fetchone()[0]
            
            # Format response
            formatted_listings = []
            for listing in listings:
                formatted_listing = {
                    'id': str(listing[0]),  # Assuming id is first column
                    'title': listing[1],
                    'description': listing[2],
                    'type': listing[3],
                    'category': listing[4],
                    'subcategory': listing[5],
                    'price_cents': listing[6],
                    'currency': listing[7],
                    'condition': listing[8],
                    'city': listing[9],
                    'region': listing[10],
                    'zip': listing[11],
                    'country': listing[12],
                    'lat': listing[13],
                    'lng': listing[14],
                    'seller_name': listing[15] or listing[16],
                    'seller_type': 'user' if listing[15] else 'gemach',
                    'available_from': listing[17].isoformat() if listing[17] else None,
                    'available_to': listing[18].isoformat() if listing[18] else None,
                    'loan_terms': listing[19],
                    'attributes': listing[20],
                    'endorse_up': listing[21],
                    'endorse_down': listing[22],
                    'status': listing[23],
                    'created_at': listing[24].isoformat(),
                    'updated_at': listing[25].isoformat()
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
            with self.db_manager.connection_manager.get_session() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("""
                        SELECT l.*, 
                               c.name as category_name,
                               sc.name as subcategory_name,
                               u.display_name as seller_name,
                               u.username as seller_username
                        FROM listings l
                        LEFT JOIN categories c ON l.category_id = c.id
                        LEFT JOIN subcategories sc ON l.subcategory_id = sc.id
                        LEFT JOIN users u ON l.seller_user_id = u.id
                        WHERE l.id = %s
                    """, [listing_id])
                    
                    listing = cursor.fetchone()
                    
                    if not listing:
                        return {
                            'success': False,
                            'error': 'Listing not found'
                        }
                    
                    # Format response
                    formatted_listing = {
                        'id': str(listing[0]),
                        'title': listing[1],
                        'description': listing[2],
                        'type': listing[3],
                        'category': listing[4],
                        'subcategory': listing[5],
                        'price_cents': listing[6],
                        'currency': listing[7],
                        'condition': listing[8],
                        'city': listing[9],
                        'region': listing[10],
                        'zip': listing[11],
                        'country': listing[12],
                        'lat': listing[13],
                        'lng': listing[14],
                        'seller_name': listing[15],
                        'seller_username': listing[16],
                        'seller_type': 'user',
                        'available_from': listing[20].isoformat() if listing[20] else None,
                        'available_to': listing[21].isoformat() if listing[21] else None,
                        'loan_terms': listing[22],
                        'attributes': listing[23],
                        'endorse_up': listing[24],
                        'endorse_down': listing[25],
                        'status': listing[26],
                        'created_at': listing[27].isoformat(),
                        'updated_at': listing[28].isoformat()
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
            required_fields = ['title', 'type', 'category_id', 'price_cents']
            for field in required_fields:
                if field not in listing_data:
                    return {
                        'success': False,
                        'error': f'Missing required field: {field}'
                    }
            
            # Validate listing type
            valid_types = ['sale', 'free', 'borrow', 'gemach']
            if listing_data['type'] not in valid_types:
                return {
                    'success': False,
                    'error': f'Invalid listing type. Must be one of: {", ".join(valid_types)}'
                }
            
            # Validate price for free listings
            if listing_data['type'] == 'free' and listing_data['price_cents'] != 0:
                return {
                    'success': False,
                    'error': 'Free listings must have price_cents = 0'
                }
            
            # Validate loan terms for borrow
            if listing_data['type'] == 'borrow' and not listing_data.get('loan_terms'):
                return {
                    'success': False,
                    'error': 'Borrow listings must include loan_terms'
                }
            
            with self.db_manager.connection_manager.get_session() as conn:
                with conn.cursor() as cursor:
                    # Insert listing
                    cursor.execute("""
                        INSERT INTO listings (
                            title, description, type, category_id, subcategory_id,
                            price_cents, currency, condition, city, region, zip, country,
                            lat, lng, seller_user_id, available_from,
                            available_to, loan_terms, attributes, status
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                        ) RETURNING id
                    """, [
                        listing_data['title'],
                        listing_data.get('description'),
                        listing_data['type'],
                        listing_data['category_id'],
                        listing_data.get('subcategory_id'),
                        listing_data['price_cents'],
                        listing_data.get('currency', 'USD'),
                        listing_data.get('condition'),
                        listing_data.get('city'),
                        listing_data.get('region'),
                        listing_data.get('zip'),
                        listing_data.get('country', 'US'),
                        listing_data.get('lat'),
                        listing_data.get('lng'),
                        listing_data.get('seller_user_id'),
                        listing_data.get('available_from'),
                        listing_data.get('available_to'),
                        json.dumps(listing_data.get('loan_terms')) if listing_data.get('loan_terms') else None,
                        json.dumps(listing_data.get('attributes', {})),
                        'active'
                    ])
                    
                    listing_id = cursor.fetchone()[0]
                    conn.commit()
                    
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
            with self.db_manager.connection_manager.get_session() as conn:
                with conn.cursor() as cursor:
                    # Get categories
                    cursor.execute("""
                        SELECT id, name, slug, sort_order, active
                        FROM categories
                        WHERE active = true
                        ORDER BY sort_order, name
                    """)
                    categories = cursor.fetchall()
                    
                    # Get subcategories for each category
                    formatted_categories = []
                    for category in categories:
                        cursor.execute("""
                            SELECT id, name, slug, sort_order, active
                            FROM subcategories
                            WHERE category_id = %s AND active = true
                            ORDER BY sort_order, name
                        """, [category[0]])
                        subcategories = cursor.fetchall()
                        
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


