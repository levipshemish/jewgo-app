#!/usr/bin/env python3
"""Marketplace Service v4 - Service layer for marketplace operations.

This module provides a service layer for marketplace operations including
products, vendors, categories, and orders. It follows the v4 service layer
architecture pattern used throughout the application.

Author: JewGo Development Team
Version: 4.0
Last Updated: 2024
"""

import os
import sys
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
import logging

# Add the backend directory to the path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from services.base_service import BaseService
from database.database_manager_v3 import EnhancedDatabaseManager as DatabaseManagerV3
from utils.logging_config import get_logger

logger = get_logger(__name__)


class MarketplaceServiceV4(BaseService):
    """Marketplace service for managing products, vendors, categories, and orders."""
    
    def __init__(self, db_manager: Optional[DatabaseManagerV3] = None):
        """Initialize the marketplace service.
        
        Args:
            db_manager: Database manager instance. If None, creates a new one.
        """
        super().__init__()
        self.db_manager = db_manager or DatabaseManagerV3()
        self.logger = get_logger(__name__)
    
    def get_products(
        self, 
        limit: int = 50, 
        offset: int = 0,
        category_id: Optional[str] = None,
        vendor_id: Optional[str] = None,
        search_query: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        is_featured: Optional[bool] = None,
        is_on_sale: Optional[bool] = None,
        status: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """Get marketplace products with filtering and pagination.
        
        Args:
            limit: Maximum number of products to return
            offset: Number of products to skip
            category_id: Filter by category ID
            vendor_id: Filter by vendor ID
            search_query: Search in product name and description
            min_price: Minimum price filter
            max_price: Maximum price filter
            is_featured: Filter by featured status
            is_on_sale: Filter by sale status
            status: Filter by product status
            sort_by: Field to sort by
            sort_order: Sort order (asc/desc)
            
        Returns:
            Dictionary containing products and metadata
        """
        try:
            # Check if marketplace table exists first
            check_query = """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'marketplace'
                );
            """
            
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(check_query)
                    table_exists = cursor.fetchone()[0]
                    
                    if not table_exists:
                        # Return empty products if table doesn't exist
                        return {
                            "success": True,
                            "products": [],
                            "total": 0,
                            "limit": limit,
                            "offset": offset,
                            "has_more": False
                        }
            
            # Use explicit column names to avoid column order issues
            query = """
                SELECT id, name, title, description, price, category, subcategory, 
                       vendor_name, product_image, location, city, state, 
                       kosher_agency, kosher_level, rating, stock, is_available, 
                       is_featured, is_on_sale, discount_percentage, 
                       created_at, updated_at
                FROM marketplace WHERE 1=1
            """
            params = []
            
            # Apply filters
            if category_id:
                query += " AND category = %s"
                params.append(category_id)
            
            if vendor_id:
                query += " AND vendor_name = %s"
                params.append(vendor_id)
            
            if search_query:
                query += " AND (name ILIKE %s OR description ILIKE %s)"
                search_term = f"%{search_query}%"
                params.extend([search_term, search_term])
            
            if min_price is not None:
                query += " AND price >= %s"
                params.append(min_price)
            
            if max_price is not None:
                query += " AND price <= %s"
                params.append(max_price)
            
            if is_featured is not None:
                query += " AND is_featured = %s"
                params.append(is_featured)
            
            if is_on_sale is not None:
                query += " AND is_on_sale = %s"
                params.append(is_on_sale)
            
            # Add sorting
            valid_sort_fields = ["name", "price", "rating", "created_at", "updated_at"]
            if sort_by not in valid_sort_fields:
                sort_by = "created_at"
            
            sort_order = "DESC" if sort_order.lower() == "desc" else "ASC"
            query += f" ORDER BY {sort_by} {sort_order}"
            
            # Add pagination
            query += " LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            # Execute query
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, params)
                    products = cursor.fetchall()
                    
                    # Get total count for pagination
                    count_query = query.replace("SELECT id, name, title, description, price, category, subcategory, vendor_name, product_image, location, city, state, kosher_agency, kosher_level, rating, stock, is_available, is_featured, is_on_sale, discount_percentage, views, created_at, updated_at", "SELECT COUNT(*)")
                    count_query = count_query.split("ORDER BY")[0]  # Remove ORDER BY and LIMIT
                    cursor.execute(count_query, params[:-2])  # Remove limit and offset
                    total_count = cursor.fetchone()[0]
            
            # Convert to list of dictionaries with explicit column mapping
            product_list = []
            for product in products:
                try:
                    product_dict = {
                        "id": str(product[0]),
                        "name": product[1],
                        "title": product[2],
                        "description": product[3],
                        "price": float(product[4]) if product[4] is not None else 0.0,
                        "category": product[5],
                        "subcategory": product[6],
                        "vendor_name": product[7],
                        "product_image": product[8],
                        "images": [product[8]] if product[8] else [],
                        "thumbnail": product[8],
                        "location": product[9],
                        "city": product[10],
                        "state": product[11],
                        "kosher_agency": product[12],
                        "kosher_level": product[13],
                        "rating": float(product[14]) if product[14] is not None else 0.0,
                        "stock": product[15] or 0,
                        "is_available": product[16],
                        "is_featured": product[17],
                        "is_on_sale": product[18],
                        "discount_percentage": float(product[19]) if product[19] is not None else 0.0,
                        "views": 0,  # Default value since views column might not exist
                        "created_at": product[20].isoformat() if product[20] else None,
                        "updated_at": product[21].isoformat() if product[21] else None
                    }
                    product_list.append(product_dict)
                except (ValueError, TypeError, IndexError) as e:
                    self.logger.warning(f"Error processing product {product[0] if product else 'unknown'}: {str(e)}")
                    continue
            
            return {
                "success": True,
                "products": product_list,
                "total": total_count,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + limit) < total_count
            }
            
        except Exception as e:
            self.logger.error(f"Error getting products: {str(e)}")
            return {
                "success": False,
                "error": "Failed to retrieve products",
                "products": [],
                "total": 0,
                "limit": limit,
                "offset": offset,
                "has_more": False
            }
    
    def get_product(self, product_id: str) -> Dict[str, Any]:
        """Get a single marketplace product by ID.
        
        Args:
            product_id: Product ID to retrieve
            
        Returns:
            Dictionary containing product data
        """
        try:
            query = """
                SELECT id, name, title, description, price, category, subcategory, 
                       vendor_name, product_image, location, city, state, 
                       kosher_agency, kosher_level, rating, stock, is_available, 
                       is_featured, is_on_sale, discount_percentage, 
                       created_at, updated_at
                FROM marketplace WHERE id = %s
            """
            
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, (product_id,))
                    product = cursor.fetchone()
            
            if not product:
                return {
                    "success": False,
                    "error": "Product not found",
                    "product": None
                }
            
                try:
                    product_dict = {
                        "id": str(product[0]),
                        "name": product[1],
                        "title": product[2],
                        "description": product[3],
                        "price": float(product[4]) if product[4] is not None else 0.0,
                        "category": product[5],
                        "subcategory": product[6],
                        "vendor_name": product[7],
                        "product_image": product[8],
                        "images": [product[8]] if product[8] else [],
                        "thumbnail": product[8],
                        "location": product[9],
                        "city": product[10],
                        "state": product[11],
                        "kosher_agency": product[12],
                        "kosher_level": product[13],
                        "rating": float(product[14]) if product[14] is not None else 0.0,
                        "stock": product[15] or 0,
                        "is_available": product[16],
                        "is_featured": product[17],
                        "is_on_sale": product[18],
                        "discount_percentage": float(product[19]) if product[19] is not None else 0.0,
                        "views": 0,  # Default value since views column might not exist
                        "created_at": product[20].isoformat() if product[20] else None,
                        "updated_at": product[21].isoformat() if product[21] else None
                    }
                except (ValueError, TypeError, IndexError) as e:
                    self.logger.error(f"Error processing product {product_id}: {str(e)}")
                    return {
                        "success": False,
                        "error": "Failed to process product data",
                        "product": None
                    }
            
            return {
                "success": True,
                "product": product_dict
            }
            
        except Exception as e:
            self.logger.error(f"Error getting product {product_id}: {str(e)}")
            return {
                "success": False,
                "error": "Failed to retrieve product",
                "product": None
            }
    
    def get_featured_products(self, limit: int = 10) -> Dict[str, Any]:
        """Get featured marketplace products.
        
        Args:
            limit: Maximum number of featured products to return
            
        Returns:
            Dictionary containing featured products
        """
        return self.get_products(
            limit=limit,
            is_featured=True,
            sort_by="rating",
            sort_order="desc"
        )
    
    def get_categories(self) -> Dict[str, Any]:
        """Get marketplace categories.
        
        Returns:
            Dictionary containing categories
        """
        try:
            # Check if database manager is available
            if not self.db_manager:
                self.logger.warning("Database manager not available")
                return {
                    "success": True,
                    "categories": []
                }
            
            # Check if marketplace table exists first
            check_query = """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'marketplace'
                );
            """
            
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(check_query)
                    table_exists = cursor.fetchone()[0]
                    
                    if not table_exists:
                        # Return empty categories if table doesn't exist
                        return {
                            "success": True,
                            "categories": []
                        }
                    
                    # Use correct column names from the Marketplace model
                    query = """
                        SELECT DISTINCT category, subcategory, COUNT(*) as product_count
                        FROM marketplace 
                        WHERE is_available = true
                        GROUP BY category, subcategory
                        ORDER BY category, subcategory
                    """
                    
                    cursor.execute(query)
                    categories_data = cursor.fetchall()
            
            # Group by category and create category objects
            categories = {}
            for cat_data in categories_data:
                category = cat_data[0]
                subcategory = cat_data[1]
                product_count = cat_data[2]
                
                if category not in categories:
                    categories[category] = {
                        "id": category,
                        "name": category.replace("_", " ").title(),
                        "description": f"{category.replace('_', ' ').title()} products",
                        "icon": "🛍️",
                        "color": "#3b82f6",
                        "product_count": 0,
                        "is_active": True,
                        "sort_order": len(categories) + 1
                    }
                
                categories[category]["product_count"] += product_count
            
            return {
                "success": True,
                "categories": list(categories.values())
            }
            
        except Exception as e:
            self.logger.error(f"Error getting categories: {str(e)}")
            return {
                "success": True,  # Return success with empty list instead of error
                "categories": []
            }
    
    def get_vendors(self) -> Dict[str, Any]:
        """Get marketplace vendors.
        
        Returns:
            Dictionary containing vendors
        """
        try:
            query = """
                SELECT DISTINCT vendor_id, vendor_name, COUNT(*) as product_count,
                       AVG(rating) as avg_rating, COUNT(CASE WHEN rating > 0 THEN 1 END) as review_count
                FROM marketplace 
                WHERE status = 'active'
                GROUP BY vendor_id, vendor_name
                ORDER BY avg_rating DESC NULLS LAST
            """
            
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query)
                    vendors_data = cursor.fetchall()
            
            vendors = []
            for vendor_data in vendors_data:
                vendor_dict = {
                    "id": vendor_data[0],
                    "name": vendor_data[1],
                    "description": f"Vendor offering {vendor_data[2]} products",
                    "logo": None,
                    "address": None,
                    "city": None,
                    "state": None,
                    "zip_code": None,
                    "phone": None,
                    "email": None,
                    "website": None,
                    "rating": float(vendor_data[3]) if vendor_data[3] else 0.0,
                    "review_count": vendor_data[4] or 0,
                    "is_verified": True,
                    "is_premium": False,
                    "product_count": vendor_data[2],
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                vendors.append(vendor_dict)
            
            return {
                "success": True,
                "vendors": vendors
            }
            
        except Exception as e:
            self.logger.error(f"Error getting vendors: {str(e)}")
            return {
                "success": False,
                "error": "Failed to retrieve vendors",
                "vendors": []
            }
    
    def search_products(
        self, 
        query: str, 
        limit: int = 50, 
        offset: int = 0
    ) -> Dict[str, Any]:
        """Search marketplace products.
        
        Args:
            query: Search query
            limit: Maximum number of results
            offset: Number of results to skip
            
        Returns:
            Dictionary containing search results
        """
        return self.get_products(
            limit=limit,
            offset=offset,
            search_query=query,
            sort_by="rating",
            sort_order="desc"
        )
    
    def get_stats(self) -> Dict[str, Any]:
        """Get marketplace statistics.
        
        Returns:
            Dictionary containing marketplace stats
        """
        try:
            # Check if database manager is available
            if not self.db_manager:
                self.logger.warning("Database manager not available")
                return {
                    "success": True,
                    "stats": {
                        "total_products": 0,
                        "total_vendors": 0,
                        "total_categories": 0,
                        "active_orders": 0,
                        "total_sales": 0.0,
                        "average_rating": 0.0
                    }
                }
            
            # Check if marketplace table exists first
            check_query = """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'marketplace'
                );
            """
            
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(check_query)
                    table_exists = cursor.fetchone()[0]
                    
                    if not table_exists:
                        # Return empty stats if table doesn't exist
                        return {
                            "success": True,
                            "stats": {
                                "total_products": 0,
                                "total_vendors": 0,
                                "total_categories": 0,
                                "active_orders": 0,
                                "total_sales": 0.0,
                                "average_rating": 0.0
                            }
                        }
                    
                    # Use correct column names from the Marketplace model
                    queries = {
                        "total_products": "SELECT COUNT(*) FROM marketplace WHERE is_available = true",
                        "total_vendors": "SELECT COUNT(DISTINCT vendor_name) FROM marketplace WHERE is_available = true",
                        "total_categories": "SELECT COUNT(DISTINCT category) FROM marketplace WHERE is_available = true",
                        "average_rating": "SELECT AVG(rating) FROM marketplace WHERE is_available = true AND rating > 0",
                        "total_sales": "SELECT SUM(price) FROM marketplace WHERE is_available = true AND is_on_sale = true"
                    }
                    
                    stats = {}
                    for stat_name, query in queries.items():
                        cursor.execute(query)
                        result = cursor.fetchone()[0]
                        if stat_name == "average_rating":
                            stats[stat_name] = float(result) if result else 0.0
                        elif stat_name == "total_sales":
                            stats[stat_name] = float(result) if result else 0.0
                        else:
                            stats[stat_name] = int(result) if result else 0
                    
                    # Add mock data for missing stats
                    stats.update({
                        "active_orders": 0,  # Mock data - would need orders table
                        "total_sales": stats.get("total_sales", 0.0)
                    })
                    
                    return {
                        "success": True,
                        "stats": stats
                    }
            
        except Exception as e:
            self.logger.error(f"Error getting stats: {str(e)}")
            return {
                "success": True,  # Return success with empty stats instead of error
                "stats": {
                    "total_products": 0,
                    "total_vendors": 0,
                    "total_categories": 0,
                    "active_orders": 0,
                    "total_sales": 0.0,
                    "average_rating": 0.0
                }
            }
