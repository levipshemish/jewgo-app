#!/usr/bin/env python3
"""Enhanced Store service for v5 API with comprehensive e-commerce functionality.

This service provides store management with inventory tracking, order processing,
payment integration, and marketplace functionality.
"""

from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
import requests
from flask import current_app
import json
from utils.logging_config import get_logger
from database.repositories.entity_repository_v5 import EntityRepositoryV5
from cache.redis_manager_v5 import RedisManagerV5
from utils.feature_flags_v5 import FeatureFlagsV5

logger = get_logger(__name__)


class StoreServiceV5:
    """Enhanced store service with e-commerce functionality and inventory management."""
    
    def __init__(self, entity_repository: EntityRepositoryV5, redis_manager: RedisManagerV5, feature_flags: FeatureFlagsV5):
        """Initialize store service.
        
        Args:
            entity_repository: Generic entity repository for database operations
            redis_manager: Redis manager for caching and session management
            feature_flags: Feature flags manager for gradual rollouts
        """
        self.repository = entity_repository
        self.redis_manager = redis_manager
        self.feature_flags = feature_flags
        self.logger = logger.bind(service="store_v5")
        
        # Cache configurations
        self.cache_config = {
            'store_details': {'ttl': 3600, 'prefix': 'store_v5'},  # 1 hour
            'store_inventory': {'ttl': 300, 'prefix': 'inventory'},  # 5 minutes
            'store_hours': {'ttl': 1800, 'prefix': 'store_hours'},  # 30 minutes
            'product_details': {'ttl': 1800, 'prefix': 'products'},  # 30 minutes
            'shipping_rates': {'ttl': 7200, 'prefix': 'shipping'},  # 2 hours
            'store_analytics': {'ttl': 3600, 'prefix': 'analytics'}  # 1 hour
        }
        
        # E-commerce configurations
        self.ecommerce_config = {
            'default_currency': 'USD',
            'tax_rate': Decimal('0.0875'),  # 8.75% default tax rate
            'shipping_threshold_free': Decimal('50.00'),  # Free shipping threshold
            'inventory_low_threshold': 10,
            'inventory_critical_threshold': 3,
            'order_timeout_minutes': 30,
            'cart_expiry_hours': 24
        }
        
        # Product categories for kosher stores
        self.product_categories = {
            'food': {
                'meat': ['beef', 'chicken', 'lamb', 'deli'],
                'dairy': ['milk', 'cheese', 'yogurt', 'butter'],
                'produce': ['fruits', 'vegetables', 'herbs'],
                'bakery': ['bread', 'challah', 'pastries', 'cakes'],
                'pantry': ['canned', 'dried', 'spices', 'condiments'],
                'frozen': ['meals', 'vegetables', 'desserts'],
                'beverages': ['wine', 'juice', 'soda', 'water']
            },
            'judaica': {
                'books': ['torah', 'talmud', 'prayer', 'children'],
                'ritual_items': ['tallit', 'tefillin', 'mezuzah', 'shabbat'],
                'jewelry': ['rings', 'necklaces', 'pendants'],
                'gifts': ['home', 'children', 'occasions']
            },
            'household': {
                'kitchen': ['cookware', 'dishes', 'utensils', 'appliances'],
                'cleaning': ['soaps', 'detergents', 'supplies'],
                'personal_care': ['cosmetics', 'health', 'baby']
            }
        }

    def get_entities(
        self,
        filters: Optional[Dict[str, Any]] = None,
        cursor: Optional[str] = None,
        page: Optional[int] = None,
        limit: int = 20,
        sort: str = 'created_at_desc',
        include_relations: bool = False,
        include_filter_options: bool = False,
        user_context: Optional[Dict[str, Any]] = None,
        use_cache: bool = True
    ) -> Dict[str, Any]:
        """
        Get entities (stores) with API-compatible interface.
        
        This method provides a unified interface for the entity API routes.
        """
        try:
            stores, next_cursor, prev_cursor = self.get_stores(
                filters=filters,
                cursor=cursor,
                page=page,
                limit=limit,
                sort_key=sort
            )
            
            response = {
                'success': True,
                'data': stores,
                'pagination': {
                    'next_cursor': next_cursor,
                    'prev_cursor': prev_cursor,
                    'limit': limit,
                    'has_more': next_cursor is not None
                },
                'meta': {
                    'total_count': len(stores),
                    'entity_type': 'stores'
                }
            }
            if include_filter_options and (page is None or page == 1):
                response['filter_options'] = self._get_filter_options()
            return response
        except Exception as e:
            logger.error(f"Failed to get stores: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'data': [],
                'pagination': {
                    'next_cursor': None,
                    'prev_cursor': None,
                    'limit': limit,
                    'has_more': False
                },
                'meta': {
                    'total_count': 0,
                    'entity_type': 'stores'
                }
            }

    def _get_filter_options(self) -> Dict[str, Any]:
        """Return filter options metadata for stores."""
        try:
            return {
                'categories': list(self.product_categories.keys()),
                'status': ['active', 'pending', 'closed'],
                'delivery': ['delivery_available'],
            }
        except Exception:
            return {}

    def get_entity_count(
        self,
        filters: Optional[Dict[str, Any]] = None,
        user_context: Optional[Dict[str, Any]] = None
    ) -> int:
        """Get total count of entities matching filters."""
        try:
            # Process and validate filters
            processed_filters = self._process_filters(filters)
            
            # Get count from repository
            count = self.repository.get_entity_count(
                entity_type='stores',
                filters=processed_filters
            )
            
            return count
            
        except Exception as e:
            logger.error(f"Error getting entity count: {e}")
            return 0

    def get_entity(self, entity_id: int) -> Optional[Dict[str, Any]]:
        """
        Get entity by ID - wrapper for get_store for API compatibility.
        
        Args:
            entity_id: Entity ID (store ID)
            
        Returns:
            Store dictionary or None if not found
        """
        return self.get_store(entity_id)

    def get_store(self, store_id: int, enrich: bool = True) -> Optional[Dict[str, Any]]:
        """Get store by ID with optional enrichment.
        
        Args:
            store_id: Store ID
            enrich: Whether to enrich with additional data
            
        Returns:
            Store data with enrichment or None if not found
        """
        try:
            cache_key = f"store_details:{store_id}:{enrich}"
            cached = self.redis_manager.get(
                cache_key, 
                prefix=self.cache_config['store_details']['prefix']
            )
            if cached:
                self.logger.debug("Retrieved store from cache", store_id=store_id)
                return cached
                
            # Get base store data
            store = self.repository.get_entity_by_id('stores', store_id)
            if not store:
                return None
                
            store_data = self._format_store_response(store)
            
            if enrich:
                store_data = self._enrich_store_data(store_data)
                
            # Cache the result
            self.redis_manager.set(
                cache_key,
                store_data,
                ttl=self.cache_config['store_details']['ttl'],
                prefix=self.cache_config['store_details']['prefix']
            )
            
            self.logger.info("Retrieved store successfully", store_id=store_id, enriched=enrich)
            return store_data
            
        except Exception as e:
            self.logger.exception("Failed to get store", store_id=store_id, error=str(e))
            return None

    def get_stores(self, filters: Optional[Dict[str, Any]] = None, cursor: Optional[str] = None,
                   page: Optional[int] = None, limit: int = 20, sort_key: str = 'name_asc') -> Tuple[List[Dict[str, Any]], Optional[str], Optional[str]]:
        """Get stores with filtering and pagination, returning (items, next_cursor, prev_cursor).
        
        Args:
            filters: Filter criteria
            cursor: Pagination cursor
            limit: Number of results per page
            sort_key: Sort strategy
            
        Returns:
            Paginated store results with metadata
        """
        try:
            # Get paginated results from repository
            entities, next_cursor, prev_cursor = self.repository.get_entities_with_cursor(
                entity_type='stores',
                filters=filters,
                cursor=cursor,
                page=page,
                limit=limit,
                sort_key=sort_key
            )
            
            # Enrich each store with basic additional data
            enriched_stores: List[Dict[str, Any]] = []
            for store in entities:
                store_data = self._format_store_response(store)
                store_data = self._add_store_status(store_data)
                enriched_stores.append(store_data)
            
            self.logger.info("Retrieved stores successfully",
                           count=len(enriched_stores),
                           has_more=(next_cursor is not None))
            
            return enriched_stores, next_cursor, prev_cursor
            
        except Exception as e:
            self.logger.exception("Failed to get stores", error=str(e))
            return [], None, None

    def _process_filters(self, filters: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Normalize store filters to repository schema."""
        if not filters:
            return {}
        processed: Dict[str, Any] = {}
        try:
            for key, value in filters.items():
                if value in (None, ''):
                    continue
                processed[key] = value
            return processed
        except Exception:
            return processed

    def create_store(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create new store with validation.
        
        Args:
            data: Store creation data
            
        Returns:
            Created store data or None if failed
        """
        try:
            # Validate required fields
            required_fields = ['name', 'address', 'phone', 'owner_email']
            if not all(field in data for field in required_fields):
                self.logger.warning("Missing required fields for store creation", 
                                  missing=[f for f in required_fields if f not in data])
                return None
                
            # Set default values
            store_data = {
                **data,
                'entity_type': 'store',
                'status': 'pending_approval',  # New stores require approval
                'store_type': data.get('store_type', 'marketplace'),
                'currency': data.get('currency', self.ecommerce_config['default_currency']),
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            
            # Validate and set operating hours
            if 'operating_hours' in data:
                store_data['operating_hours'] = self._validate_operating_hours(data['operating_hours'])
                
            # Initialize e-commerce settings
            if data.get('enable_ecommerce', False):
                store_data['ecommerce_settings'] = self._create_default_ecommerce_settings()
                
            # Create store
            result = self.repository.create_entity('stores', store_data)
            if result:
                self._invalidate_store_caches()
                self.logger.info("Created store successfully", store_id=result.get('id'))
                
                # Initialize store inventory if e-commerce enabled
                if store_data.get('enable_ecommerce'):
                    self._initialize_store_inventory(result.get('id'))
                
            return result
            
        except Exception as e:
            self.logger.exception("Failed to create store", error=str(e))
            return None

    def update_store(self, store_id: int, data: Dict[str, Any]) -> bool:
        """Update store with validation.
        
        Args:
            store_id: Store ID
            data: Update data
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Validate operating hours if being updated
            if 'operating_hours' in data:
                data['operating_hours'] = self._validate_operating_hours(data['operating_hours'])
                
            # Handle e-commerce settings updates
            if 'ecommerce_settings' in data:
                data['ecommerce_settings'] = self._validate_ecommerce_settings(data['ecommerce_settings'])
                
            data['updated_at'] = datetime.utcnow()
            
            success = self.repository.update_entity('stores', store_id, data)
            if success:
                self._invalidate_store_caches(store_id)
                self.logger.info("Updated store successfully", store_id=store_id)
                
            return success
            
        except Exception as e:
            self.logger.exception("Failed to update store", store_id=store_id, error=str(e))
            return False

    def delete_store(self, store_id: int) -> bool:
        """Delete store (soft delete).
        
        Args:
            store_id: Store ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            success = self.repository.update_entity('stores', store_id, {
                'status': 'deleted',
                'deleted_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            })
            
            if success:
                self._invalidate_store_caches(store_id)
                self._archive_store_inventory(store_id)
                self.logger.info("Deleted store successfully", store_id=store_id)
                
            return success
            
        except Exception as e:
            self.logger.exception("Failed to delete store", store_id=store_id, error=str(e))
            return False

    def get_store_inventory(self, store_id: int, category: Optional[str] = None, 
                           low_stock_only: bool = False) -> Dict[str, Any]:
        """Get store inventory with filtering options.
        
        Args:
            store_id: Store ID
            category: Product category filter
            low_stock_only: Only return low stock items
            
        Returns:
            Store inventory data
        """
        try:
            cache_key = f"inventory:{store_id}:{category or 'all'}:{low_stock_only}"
            cached = self.redis_manager.get(
                cache_key,
                prefix=self.cache_config['store_inventory']['prefix']
            )
            if cached:
                return cached
                
            # Get inventory from repository (would be separate inventory table)
            inventory_filters = {'store_id': store_id}
            if category:
                inventory_filters['category'] = category
            if low_stock_only:
                inventory_filters['quantity__lte'] = self.ecommerce_config['inventory_low_threshold']
                
            # This would typically query a products/inventory table
            inventory_items = []  # Placeholder - would get from repository
            
            inventory_data = {
                'store_id': store_id,
                'total_items': len(inventory_items),
                'categories': self._get_inventory_categories(inventory_items),
                'low_stock_count': sum(1 for item in inventory_items 
                                     if item.get('quantity', 0) <= self.ecommerce_config['inventory_low_threshold']),
                'out_of_stock_count': sum(1 for item in inventory_items if item.get('quantity', 0) == 0),
                'items': inventory_items
            }
            
            # Cache the result
            self.redis_manager.set(
                cache_key,
                inventory_data,
                ttl=self.cache_config['store_inventory']['ttl'],
                prefix=self.cache_config['store_inventory']['prefix']
            )
            
            return inventory_data
            
        except Exception as e:
            self.logger.exception("Failed to get store inventory", store_id=store_id, error=str(e))
            return {'store_id': store_id, 'items': [], 'total_items': 0}

    def update_product_inventory(self, store_id: int, product_id: int, quantity: int) -> bool:
        """Update product inventory quantity.
        
        Args:
            store_id: Store ID
            product_id: Product ID
            quantity: New quantity
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Update product quantity (would typically update products table)
            update_data = {
                'quantity': quantity,
                'updated_at': datetime.utcnow()
            }
            
            # Add stock status
            if quantity == 0:
                update_data['stock_status'] = 'out_of_stock'
            elif quantity <= self.ecommerce_config['inventory_critical_threshold']:
                update_data['stock_status'] = 'critical'
            elif quantity <= self.ecommerce_config['inventory_low_threshold']:
                update_data['stock_status'] = 'low'
            else:
                update_data['stock_status'] = 'in_stock'
                
            # This would update the products table
            success = True  # Placeholder - would call repository
            
            if success:
                # Invalidate inventory caches
                self._invalidate_inventory_caches(store_id)
                
                # Send low stock alerts if needed
                if quantity <= self.ecommerce_config['inventory_critical_threshold']:
                    self._send_low_stock_alert(store_id, product_id, quantity)
                    
                self.logger.info("Updated product inventory", 
                               store_id=store_id, 
                               product_id=product_id,
                               quantity=quantity)
                
            return success
            
        except Exception as e:
            self.logger.exception("Failed to update product inventory", 
                                store_id=store_id, 
                                product_id=product_id,
                                error=str(e))
            return False

    def calculate_order_total(self, store_id: int, items: List[Dict[str, Any]], 
                             shipping_address: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Calculate order total with tax and shipping.
        
        Args:
            store_id: Store ID
            items: List of order items with product_id and quantity
            shipping_address: Shipping address for tax/shipping calculation
            
        Returns:
            Order total breakdown
        """
        try:
            subtotal = Decimal('0.00')
            item_details = []
            
            # Calculate subtotal
            for item in items:
                # Get product price (would query products table)
                product_price = Decimal('10.00')  # Placeholder
                item_total = product_price * item['quantity']
                subtotal += item_total
                
                item_details.append({
                    'product_id': item['product_id'],
                    'quantity': item['quantity'],
                    'unit_price': str(product_price),
                    'total_price': str(item_total)
                })
            
            # Calculate tax
            tax_amount = subtotal * self.ecommerce_config['tax_rate']
            tax_amount = tax_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            # Calculate shipping
            shipping_cost = self._calculate_shipping_cost(store_id, subtotal, shipping_address)
            
            # Calculate total
            total = subtotal + tax_amount + shipping_cost
            
            order_total = {
                'subtotal': str(subtotal),
                'tax_amount': str(tax_amount),
                'tax_rate': str(self.ecommerce_config['tax_rate']),
                'shipping_cost': str(shipping_cost),
                'total': str(total),
                'currency': self.ecommerce_config['default_currency'],
                'items': item_details
            }
            
            self.logger.info("Calculated order total", 
                           store_id=store_id,
                           items_count=len(items),
                           total=str(total))
            
            return order_total
            
        except Exception as e:
            self.logger.exception("Failed to calculate order total", 
                                store_id=store_id,
                                error=str(e))
            return {'total': '0.00', 'error': 'Calculation failed'}

    def get_store_analytics(self, store_id: int, date_range: Optional[Tuple[datetime, datetime]] = None) -> Dict[str, Any]:
        """Get store analytics and performance metrics.
        
        Args:
            store_id: Store ID
            date_range: Optional date range for analytics
            
        Returns:
            Store analytics data
        """
        try:
            cache_key = f"analytics:{store_id}:{date_range[0].strftime('%Y-%m-%d') if date_range else 'all'}"
            cached = self.redis_manager.get(
                cache_key,
                prefix=self.cache_config['store_analytics']['prefix']
            )
            if cached:
                return cached
                
            if not date_range:
                # Default to last 30 days
                end_date = datetime.now()
                start_date = end_date - timedelta(days=30)
                date_range = (start_date, end_date)
                
            # Calculate analytics (would query orders/products tables)
            analytics = {
                'store_id': store_id,
                'date_range': {
                    'start': date_range[0].isoformat(),
                    'end': date_range[1].isoformat()
                },
                'sales': {
                    'total_revenue': '0.00',  # Would sum from orders
                    'total_orders': 0,
                    'average_order_value': '0.00',
                    'conversion_rate': 0.0
                },
                'inventory': {
                    'total_products': 0,
                    'low_stock_items': 0,
                    'out_of_stock_items': 0,
                    'top_selling_products': []
                },
                'traffic': {
                    'page_views': 0,
                    'unique_visitors': 0,
                    'bounce_rate': 0.0
                }
            }
            
            # Cache the result
            self.redis_manager.set(
                cache_key,
                analytics,
                ttl=self.cache_config['store_analytics']['ttl'],
                prefix=self.cache_config['store_analytics']['prefix']
            )
            
            return analytics
            
        except Exception as e:
            self.logger.exception("Failed to get store analytics", 
                                store_id=store_id,
                                error=str(e))
            return {'store_id': store_id, 'error': 'Analytics unavailable'}

    def _format_store_response(self, store: Any) -> Dict[str, Any]:
        """Format store database record for API response.
        
        Args:
            store: Database store record
            
        Returns:
            Formatted store data
        """
        return {
            'id': store.id,
            'name': store.name,
            'description': getattr(store, 'description', None),
            'address': store.address,
            'phone': getattr(store, 'phone', None),
            'email': getattr(store, 'email', None),
            'website': getattr(store, 'website', None),
            'owner_name': getattr(store, 'owner_name', None),
            'owner_email': getattr(store, 'owner_email', None),
            'store_type': getattr(store, 'store_type', 'marketplace'),
            'operating_hours': getattr(store, 'operating_hours', {}),
            'specialties': getattr(store, 'specialties', []),
            'kosher_certification': getattr(store, 'kosher_certification', None),
            'payment_methods': getattr(store, 'payment_methods', []),
            'shipping_options': getattr(store, 'shipping_options', []),
            'enable_ecommerce': getattr(store, 'enable_ecommerce', False),
            'ecommerce_settings': getattr(store, 'ecommerce_settings', {}),
            'latitude': float(store.latitude) if hasattr(store, 'latitude') and store.latitude else None,
            'longitude': float(store.longitude) if hasattr(store, 'longitude') and store.longitude else None,
            'status': getattr(store, 'status', 'active'),
            'created_at': store.created_at.isoformat() if hasattr(store, 'created_at') and store.created_at else None,
            'updated_at': store.updated_at.isoformat() if hasattr(store, 'updated_at') and store.updated_at else None
        }

    def _enrich_store_data(self, store_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enrich store data with additional information.
        
        Args:
            store_data: Base store data
            
        Returns:
            Enriched store data
        """
        try:
            # Add current operating status
            store_data = self._add_store_status(store_data)
            
            # Add inventory summary if e-commerce enabled
            if store_data.get('enable_ecommerce'):
                inventory_summary = self._get_inventory_summary(store_data['id'])
                store_data['inventory_summary'] = inventory_summary
                
            # Add distance if coordinates are available
            if hasattr(current_app, 'user_location') and current_app.user_location:
                if store_data.get('latitude') and store_data.get('longitude'):
                    distance = self._calculate_distance(
                        current_app.user_location['latitude'],
                        current_app.user_location['longitude'],
                        store_data['latitude'],
                        store_data['longitude']
                    )
                    store_data['distance_km'] = round(distance, 2)
                    
            # Add review summary
            if self.feature_flags.is_enabled('store_reviews'):
                review_summary = self._get_review_summary(store_data['id'])
                store_data['review_summary'] = review_summary
                
            return store_data
            
        except Exception as e:
            self.logger.warning("Failed to enrich store data", 
                              store_id=store_data.get('id'),
                              error=str(e))
            return store_data

    def _add_store_status(self, store_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add current operational status to store data.
        
        Args:
            store_data: Store data
            
        Returns:
            Store data with status information
        """
        try:
            now = datetime.now()
            operating_hours = store_data.get('operating_hours', {})
            
            if operating_hours:
                today_hours = self._get_hours_for_day(operating_hours, now)
                if today_hours and not today_hours.get('closed'):
                    current_time = now.time()
                    open_time = datetime.strptime(today_hours['open'], '%H:%M').time()
                    close_time = datetime.strptime(today_hours['close'], '%H:%M').time()
                    
                    store_data['is_currently_open'] = open_time <= current_time <= close_time
                else:
                    store_data['is_currently_open'] = False
            else:
                store_data['is_currently_open'] = None  # Hours not specified
                
            return store_data
            
        except Exception as e:
            self.logger.warning("Failed to add store status", error=str(e))
            store_data['is_currently_open'] = None
            return store_data

    def _validate_operating_hours(self, operating_hours: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and normalize operating hours format.
        
        Args:
            operating_hours: Operating hours data
            
        Returns:
            Validated operating hours
        """
        days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
        validated_hours = {}
        
        for day in days:
            if day in operating_hours:
                day_hours = operating_hours[day]
                if isinstance(day_hours, dict):
                    if day_hours.get('closed'):
                        validated_hours[day] = {'closed': True}
                    elif 'open' in day_hours and 'close' in day_hours:
                        validated_hours[day] = {
                            'open': day_hours['open'],
                            'close': day_hours['close']
                        }
                        
        return validated_hours

    def _create_default_ecommerce_settings(self) -> Dict[str, Any]:
        """Create default e-commerce settings for new stores.
        
        Returns:
            Default e-commerce configuration
        """
        return {
            'currency': self.ecommerce_config['default_currency'],
            'tax_rate': str(self.ecommerce_config['tax_rate']),
            'free_shipping_threshold': str(self.ecommerce_config['shipping_threshold_free']),
            'inventory_notifications': True,
            'order_notifications': True,
            'payment_processing': False,  # Requires manual setup
            'shipping_zones': [],
            'return_policy_days': 30
        }

    def _validate_ecommerce_settings(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        """Validate e-commerce settings.
        
        Args:
            settings: E-commerce settings to validate
            
        Returns:
            Validated settings
        """
        validated = {}
        
        # Validate currency
        if 'currency' in settings:
            currency = settings['currency'].upper()
            if currency in ['USD', 'EUR', 'GBP', 'CAD', 'ILS']:  # Add more as needed
                validated['currency'] = currency
                
        # Validate tax rate
        if 'tax_rate' in settings:
            try:
                tax_rate = Decimal(str(settings['tax_rate']))
                if 0 <= tax_rate <= 1:  # 0-100%
                    validated['tax_rate'] = str(tax_rate)
            except (ValueError, TypeError):
                pass
                
        # Copy other validated settings
        for key in ['inventory_notifications', 'order_notifications', 'payment_processing']:
            if key in settings and isinstance(settings[key], bool):
                validated[key] = settings[key]
                
        return validated

    def _calculate_shipping_cost(self, store_id: int, subtotal: Decimal, 
                                shipping_address: Optional[Dict[str, Any]]) -> Decimal:
        """Calculate shipping cost for an order.
        
        Args:
            store_id: Store ID
            subtotal: Order subtotal
            shipping_address: Shipping address
            
        Returns:
            Shipping cost
        """
        try:
            # Free shipping threshold check
            if subtotal >= self.ecommerce_config['shipping_threshold_free']:
                return Decimal('0.00')
                
            # Default shipping cost (would be more sophisticated in practice)
            base_shipping = Decimal('5.99')
            
            # Add distance-based calculation if address provided
            if shipping_address and shipping_address.get('zip_code'):
                # Would calculate based on store location and shipping address
                pass
                
            return base_shipping
            
        except Exception as e:
            self.logger.warning("Failed to calculate shipping cost", error=str(e))
            return Decimal('5.99')  # Default fallback

    def _get_inventory_summary(self, store_id: int) -> Dict[str, Any]:
        """Get inventory summary for a store.
        
        Args:
            store_id: Store ID
            
        Returns:
            Inventory summary data
        """
        try:
            # This would query the products table
            return {
                'total_products': 0,
                'in_stock': 0,
                'low_stock': 0,
                'out_of_stock': 0,
                'categories': []
            }
        except Exception as e:
            self.logger.warning("Failed to get inventory summary", error=str(e))
            return {}

    def _get_review_summary(self, store_id: int) -> Dict[str, Any]:
        """Get review summary for a store.
        
        Args:
            store_id: Store ID
            
        Returns:
            Review summary data
        """
        try:
            # This would query the reviews table
            return {
                'average_rating': 0.0,
                'total_reviews': 0,
                'rating_distribution': {
                    '5': 0, '4': 0, '3': 0, '2': 0, '1': 0
                }
            }
        except Exception as e:
            self.logger.warning("Failed to get review summary", error=str(e))
            return {}

    def _get_hours_for_day(self, operating_hours: Dict[str, Any], date: datetime) -> Optional[Dict[str, Any]]:
        """Get operating hours for a specific day.
        
        Args:
            operating_hours: Store operating hours
            date: Date to check
            
        Returns:
            Hours for the day or None
        """
        day_name = date.strftime('%A').lower()
        return operating_hours.get(day_name)

    def _get_inventory_categories(self, inventory_items: List[Dict[str, Any]]) -> List[str]:
        """Extract unique categories from inventory items.
        
        Args:
            inventory_items: List of inventory items
            
        Returns:
            List of unique categories
        """
        categories = set()
        for item in inventory_items:
            if 'category' in item:
                categories.add(item['category'])
        return sorted(list(categories))

    def _initialize_store_inventory(self, store_id: int):
        """Initialize inventory system for new e-commerce store.
        
        Args:
            store_id: Store ID
        """
        try:
            # Create initial inventory structure
            # This would typically create records in products/inventory tables
            self.logger.info("Initialized store inventory", store_id=store_id)
        except Exception as e:
            self.logger.warning("Failed to initialize store inventory", 
                              store_id=store_id, 
                              error=str(e))

    def _archive_store_inventory(self, store_id: int):
        """Archive inventory when store is deleted.
        
        Args:
            store_id: Store ID
        """
        try:
            # Archive inventory data
            # This would typically update products table with archived status
            self.logger.info("Archived store inventory", store_id=store_id)
        except Exception as e:
            self.logger.warning("Failed to archive store inventory", 
                              store_id=store_id,
                              error=str(e))

    def _send_low_stock_alert(self, store_id: int, product_id: int, quantity: int):
        """Send low stock alert to store owner.
        
        Args:
            store_id: Store ID
            product_id: Product ID
            quantity: Current quantity
        """
        try:
            if self.feature_flags.is_enabled('inventory_alerts'):
                # Send notification (email, SMS, etc.)
                self.logger.info("Sent low stock alert", 
                               store_id=store_id,
                               product_id=product_id,
                               quantity=quantity)
        except Exception as e:
            self.logger.warning("Failed to send low stock alert", error=str(e))

    def _calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two coordinates using Haversine formula.
        
        Args:
            lat1, lon1: First coordinate
            lat2, lon2: Second coordinate
            
        Returns:
            Distance in kilometers
        """
        from math import radians, sin, cos, sqrt, atan2
        
        R = 6371  # Earth's radius in kilometers
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c

    def _invalidate_store_caches(self, store_id: Optional[int] = None):
        """Invalidate store-related caches.
        
        Args:
            store_id: Specific store ID or None for all
        """
        try:
            if store_id:
                # Invalidate specific store caches
                patterns = [
                    f"store_v5:store_details:{store_id}:*",
                    f"inventory:*:{store_id}:*",
                    f"analytics:analytics:{store_id}:*"
                ]
            else:
                # Invalidate all store-related caches
                patterns = [
                    "store_v5:*",
                    "inventory:*",
                    "analytics:*",
                    "entity_v5:stores:*"
                ]
                
            for pattern in patterns:
                self.redis_manager.delete_pattern(pattern)
                
            self.logger.debug("Invalidated store caches", 
                            store_id=store_id,
                            patterns=patterns)
                            
        except Exception as e:
            self.logger.warning("Failed to invalidate store caches", error=str(e))

    def _invalidate_inventory_caches(self, store_id: int):
        """Invalidate inventory-related caches for a store.
        
        Args:
            store_id: Store ID
        """
        try:
            patterns = [
                f"inventory:*:{store_id}:*",
                f"products:*:{store_id}:*"
            ]
            
            for pattern in patterns:
                self.redis_manager.delete_pattern(pattern)
                
            self.logger.debug("Invalidated inventory caches", store_id=store_id)
            
        except Exception as e:
            self.logger.warning("Failed to invalidate inventory caches", 
                              store_id=store_id,
                              error=str(e))
