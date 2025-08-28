#!/usr/bin/env python3
"""Shtetl Message Service.

Comprehensive service for managing Jewish community marketplace messaging.
Handles message creation, threading, notifications, and communication between customers and store owners.

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-08-28
"""

import uuid
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict

from utils.logging_config import get_logger
from utils.response_helpers import success_response, error_response
from utils.cache_manager_v4 import CacheManagerV4
from utils.config_manager import ConfigManager

logger = get_logger(__name__)


@dataclass
class MessageData:
    """Message data structure."""
    # Basic message information
    message_id: str
    store_id: str
    store_name: str
    sender_user_id: str
    sender_name: str
    sender_email: str
    sender_type: str  # customer, store_owner, admin
    recipient_user_id: str
    recipient_name: str
    recipient_email: str
    recipient_type: str  # customer, store_owner, admin
    
    # Message content
    subject: Optional[str] = None
    message_text: str = ""
    message_type: str = "general"  # general, inquiry, support, order, kosher, etc.
    priority: str = "normal"  # low, normal, high, urgent
    
    # Related entities
    order_id: Optional[str] = None
    product_id: Optional[str] = None
    listing_id: Optional[str] = None
    
    # Threading
    parent_message_id: Optional[str] = None
    thread_id: Optional[str] = None
    is_reply: bool = False
    
    # Kosher features
    kosher_related: bool = False
    kosher_question_type: Optional[str] = None
    hechsher_inquiry: bool = False
    shabbos_related: bool = False
    holiday_related: bool = False
    community_question: bool = False
    
    # Categories
    category: Optional[str] = None
    tags: List[str] = None
    keywords: Optional[str] = None
    
    # Attachments
    has_attachments: bool = False
    attachment_urls: List[str] = None
    attachment_types: List[str] = None
    
    # Timing
    scheduled_send_time: Optional[datetime] = None
    is_scheduled: bool = False
    timezone: Optional[str] = None
    
    # Analytics
    source: Optional[str] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    location_data: Optional[Dict] = None


@dataclass
class MessageAnalytics:
    """Message analytics data structure."""
    total_messages: int = 0
    messages_today: int = 0
    messages_this_week: int = 0
    messages_this_month: int = 0
    unread_messages: int = 0
    kosher_messages: int = 0
    urgent_messages: int = 0
    customer_messages: int = 0
    store_owner_messages: int = 0
    admin_messages: int = 0
    average_response_time_hours: float = 0.0
    response_rate_percentage: float = 0.0


class ShtetlMessageService:
    """Service for managing Shtetl marketplace messages."""
    
    def __init__(self, db_manager, cache_manager: CacheManagerV4, config: ConfigManager):
        """Initialize the message service."""
        self.db_manager = db_manager
        self.cache_manager = cache_manager
        self.config = config
        self.logger = get_logger(__name__)
        
        logger.info("ShtetlMessageService initialized successfully - v1.0")
    
    def create_message(self, message_data: MessageData) -> Tuple[bool, str, Optional[str]]:
        """Create a new message."""
        try:
            # Generate message ID
            message_id = str(uuid.uuid4())
            message_data.message_id = message_id
            
            # Generate thread ID if not provided
            if not message_data.thread_id:
                if message_data.parent_message_id:
                    # Get thread ID from parent message
                    parent_query = "SELECT thread_id FROM shtetl_messages WHERE message_id = %s"
                    parent_result = self.db_manager.execute_query(parent_query, (message_data.parent_message_id,), fetch_one=True)
                    if parent_result:
                        message_data.thread_id = parent_result.get('thread_id')
                    else:
                        message_data.thread_id = str(uuid.uuid4())
                else:
                    message_data.thread_id = str(uuid.uuid4())
            
            # Validate required fields
            if not message_data.store_id or not message_data.sender_user_id or not message_data.recipient_user_id:
                return False, "Store ID, sender user ID, and recipient user ID are required", None
            
            if not message_data.message_text.strip():
                return False, "Message text is required", None
            
            # Insert message into database
            query = """
                INSERT INTO shtetl_messages (
                    message_id, store_id, store_name, sender_user_id, sender_name, sender_email, sender_type,
                    recipient_user_id, recipient_name, recipient_email, recipient_type, subject, message_text,
                    message_type, priority, order_id, product_id, listing_id, parent_message_id, thread_id,
                    is_reply, kosher_related, kosher_question_type, hechsher_inquiry, shabbos_related,
                    holiday_related, community_question, category, tags, keywords, has_attachments,
                    attachment_urls, attachment_types, scheduled_send_time, is_scheduled, timezone,
                    source, user_agent, ip_address, location_data
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """
            
            params = (
                message_data.message_id, message_data.store_id, message_data.store_name,
                message_data.sender_user_id, message_data.sender_name, message_data.sender_email,
                message_data.sender_type, message_data.recipient_user_id, message_data.recipient_name,
                message_data.recipient_email, message_data.recipient_type, message_data.subject,
                message_data.message_text, message_data.message_type, message_data.priority,
                message_data.order_id, message_data.product_id, message_data.listing_id,
                message_data.parent_message_id, message_data.thread_id, message_data.is_reply,
                message_data.kosher_related, message_data.kosher_question_type, message_data.hechsher_inquiry,
                message_data.shabbos_related, message_data.holiday_related, message_data.community_question,
                message_data.category, json.dumps(message_data.tags or []), message_data.keywords,
                message_data.has_attachments, json.dumps(message_data.attachment_urls or []),
                json.dumps(message_data.attachment_types or []), message_data.scheduled_send_time,
                message_data.is_scheduled, message_data.timezone, message_data.source,
                message_data.user_agent, message_data.ip_address, json.dumps(message_data.location_data or {})
            )
            
            self.db_manager.execute_query(query, params)
            
            # Update reply count for parent message
            if message_data.parent_message_id:
                self._update_reply_count(message_data.parent_message_id)
            
            # Clear cache
            self.cache_manager.delete(f"store_messages:{message_data.store_id}")
            self.cache_manager.delete(f"user_messages:{message_data.sender_user_id}")
            self.cache_manager.delete(f"user_messages:{message_data.recipient_user_id}")
            
            logger.info(f"Created message {message_id} from {message_data.sender_user_id} to {message_data.recipient_user_id}")
            return True, "Message sent successfully", message_id
            
        except Exception as e:
            self.logger.error(f"Error creating message: {e}")
            return False, f"Failed to send message: {str(e)}", None
    
    def get_message(self, message_id: str) -> Optional[Dict]:
        """Get message by ID."""
        try:
            query = """
                SELECT * FROM shtetl_messages WHERE message_id = %s
            """
            
            result = self.db_manager.execute_query(query, (message_id,), fetch_one=True)
            return result
            
        except Exception as e:
            self.logger.error(f"Error getting message {message_id}: {e}")
            return None
    
    def get_store_messages(self, store_id: str, limit: int = 50, offset: int = 0, 
                          status: Optional[str] = None, user_id: Optional[str] = None) -> List[Dict]:
        """Get messages for a store."""
        try:
            cache_key = f"store_messages:{store_id}:{limit}:{offset}:{status}:{user_id}"
            cached_result = self.cache_manager.get(cache_key)
            if cached_result:
                return cached_result
            
            query = """
                SELECT * FROM shtetl_messages 
                WHERE store_id = %s
            """
            params = [store_id]
            
            if status:
                query += " AND message_status = %s"
                params.append(status)
            
            if user_id:
                query += " AND (sender_user_id = %s OR recipient_user_id = %s)"
                params.extend([user_id, user_id])
            
            query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            results = self.db_manager.execute_query(query, tuple(params), fetch_all=True)
            
            # Cache the result
            self.cache_manager.set(cache_key, results, ttl=300)  # 5 minutes
            
            return results if results else []
            
        except Exception as e:
            self.logger.error(f"Error getting messages for store {store_id}: {e}")
            return []
    
    def get_user_messages(self, user_id: str, limit: int = 50, offset: int = 0, 
                         unread_only: bool = False) -> List[Dict]:
        """Get messages for a user."""
        try:
            cache_key = f"user_messages:{user_id}:{limit}:{offset}:{unread_only}"
            cached_result = self.cache_manager.get(cache_key)
            if cached_result:
                return cached_result
            
            query = """
                SELECT * FROM shtetl_messages 
                WHERE recipient_user_id = %s
            """
            params = [user_id]
            
            if unread_only:
                query += " AND message_status = 'sent'"
            
            query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            results = self.db_manager.execute_query(query, tuple(params), fetch_all=True)
            
            # Cache the result
            self.cache_manager.set(cache_key, results, ttl=300)  # 5 minutes
            
            return results if results else []
            
        except Exception as e:
            self.logger.error(f"Error getting messages for user {user_id}: {e}")
            return []
    
    def get_message_thread(self, thread_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Get all messages in a thread."""
        try:
            cache_key = f"message_thread:{thread_id}:{limit}:{offset}"
            cached_result = self.cache_manager.get(cache_key)
            if cached_result:
                return cached_result
            
            query = """
                SELECT * FROM shtetl_messages 
                WHERE thread_id = %s
                ORDER BY created_at ASC
                LIMIT %s OFFSET %s
            """
            
            results = self.db_manager.execute_query(query, (thread_id, limit, offset), fetch_all=True)
            
            # Cache the result
            self.cache_manager.set(cache_key, results, ttl=300)  # 5 minutes
            
            return results if results else []
            
        except Exception as e:
            self.logger.error(f"Error getting message thread {thread_id}: {e}")
            return []
    
    def mark_message_read(self, message_id: str, user_id: str) -> bool:
        """Mark a message as read."""
        try:
            query = """
                UPDATE shtetl_messages 
                SET message_status = 'read', read_at = NOW(), updated_at = NOW()
                WHERE message_id = %s AND recipient_user_id = %s
            """
            
            self.db_manager.execute_query(query, (message_id, user_id))
            
            # Clear cache
            self.cache_manager.delete_pattern(f"user_messages:*")
            self.cache_manager.delete_pattern(f"store_messages:*")
            
            logger.info(f"Marked message {message_id} as read by user {user_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error marking message {message_id} as read: {e}")
            return False
    
    def mark_message_replied(self, message_id: str) -> bool:
        """Mark a message as replied to."""
        try:
            query = """
                UPDATE shtetl_messages 
                SET message_status = 'replied', replied_at = NOW(), updated_at = NOW()
                WHERE message_id = %s
            """
            
            self.db_manager.execute_query(query, (message_id,))
            
            # Clear cache
            self.cache_manager.delete_pattern(f"user_messages:*")
            self.cache_manager.delete_pattern(f"store_messages:*")
            
            logger.info(f"Marked message {message_id} as replied")
            return True
            
        except Exception as e:
            self.logger.error(f"Error marking message {message_id} as replied: {e}")
            return False
    
    def archive_message(self, message_id: str, user_id: str) -> bool:
        """Archive a message."""
        try:
            query = """
                UPDATE shtetl_messages 
                SET message_status = 'archived', archived_at = NOW(), updated_at = NOW()
                WHERE message_id = %s AND (sender_user_id = %s OR recipient_user_id = %s)
            """
            
            self.db_manager.execute_query(query, (message_id, user_id, user_id))
            
            # Clear cache
            self.cache_manager.delete_pattern(f"user_messages:*")
            self.cache_manager.delete_pattern(f"store_messages:*")
            
            logger.info(f"Archived message {message_id} by user {user_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error archiving message {message_id}: {e}")
            return False
    
    def get_store_analytics(self, store_id: str, start_date: Optional[datetime] = None, 
                           end_date: Optional[datetime] = None) -> MessageAnalytics:
        """Get message analytics for a store."""
        try:
            analytics = MessageAnalytics()
            
            # Base query
            base_query = "SELECT * FROM shtetl_messages WHERE store_id = %s"
            params = [store_id]
            
            if start_date and end_date:
                base_query += " AND created_at >= %s AND created_at <= %s"
                params.extend([start_date, end_date])
            
            # Total messages
            total_query = f"""
                SELECT COUNT(*) as total_messages
                FROM shtetl_messages 
                WHERE store_id = %s
            """
            
            if start_date and end_date:
                total_query += " AND created_at >= %s AND created_at <= %s"
                total_params = [store_id, start_date, end_date]
            else:
                total_params = [store_id]
            
            total_result = self.db_manager.execute_query(total_query, tuple(total_params), fetch_one=True)
            if total_result:
                analytics.total_messages = int(total_result.get('total_messages', 0))
            
            # Unread messages
            unread_query = f"""
                SELECT COUNT(*) as unread_count
                FROM shtetl_messages 
                WHERE store_id = %s AND message_status = 'sent'
            """
            
            if start_date and end_date:
                unread_query += " AND created_at >= %s AND created_at <= %s"
                unread_params = [store_id, start_date, end_date]
            else:
                unread_params = [store_id]
            
            unread_result = self.db_manager.execute_query(unread_query, tuple(unread_params), fetch_one=True)
            if unread_result:
                analytics.unread_messages = int(unread_result.get('unread_count', 0))
            
            # Kosher messages
            kosher_query = f"""
                SELECT COUNT(*) as kosher_count
                FROM shtetl_messages 
                WHERE store_id = %s AND kosher_related = true
            """
            
            if start_date and end_date:
                kosher_query += " AND created_at >= %s AND created_at <= %s"
                kosher_params = [store_id, start_date, end_date]
            else:
                kosher_params = [store_id]
            
            kosher_result = self.db_manager.execute_query(kosher_query, tuple(kosher_params), fetch_one=True)
            if kosher_result:
                analytics.kosher_messages = int(kosher_result.get('kosher_count', 0))
            
            # Urgent messages
            urgent_query = f"""
                SELECT COUNT(*) as urgent_count
                FROM shtetl_messages 
                WHERE store_id = %s AND priority = 'urgent'
            """
            
            if start_date and end_date:
                urgent_query += " AND created_at >= %s AND created_at <= %s"
                urgent_params = [store_id, start_date, end_date]
            else:
                urgent_params = [store_id]
            
            urgent_result = self.db_manager.execute_query(urgent_query, tuple(urgent_params), fetch_one=True)
            if urgent_result:
                analytics.urgent_messages = int(urgent_result.get('urgent_count', 0))
            
            # Message types breakdown
            type_query = f"""
                SELECT sender_type, COUNT(*) as count
                FROM shtetl_messages 
                WHERE store_id = %s
                GROUP BY sender_type
            """
            
            if start_date and end_date:
                type_query += " AND created_at >= %s AND created_at <= %s"
                type_params = [store_id, start_date, end_date]
            else:
                type_params = [store_id]
            
            type_results = self.db_manager.execute_query(type_query, tuple(type_params), fetch_all=True)
            
            for result in type_results:
                sender_type = result.get('sender_type')
                count = int(result.get('count', 0))
                
                if sender_type == 'customer':
                    analytics.customer_messages = count
                elif sender_type == 'store_owner':
                    analytics.store_owner_messages = count
                elif sender_type == 'admin':
                    analytics.admin_messages = count
            
            return analytics
            
        except Exception as e:
            self.logger.error(f"Error getting message analytics for store {store_id}: {e}")
            return MessageAnalytics()
    
    def search_messages(self, store_id: str, search_term: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Search messages by text."""
        try:
            query = """
                SELECT * FROM shtetl_messages 
                WHERE store_id = %s 
                AND (
                    subject ILIKE %s OR 
                    message_text ILIKE %s OR 
                    sender_name ILIKE %s OR 
                    recipient_name ILIKE %s OR
                    keywords ILIKE %s
                )
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """
            
            search_pattern = f"%{search_term}%"
            params = (store_id, search_pattern, search_pattern, search_pattern, 
                     search_pattern, search_pattern, limit, offset)
            
            results = self.db_manager.execute_query(query, params, fetch_all=True)
            return results if results else []
            
        except Exception as e:
            self.logger.error(f"Error searching messages for store {store_id}: {e}")
            return []
    
    def _update_reply_count(self, parent_message_id: str) -> None:
        """Update reply count for a parent message."""
        try:
            query = """
                UPDATE shtetl_messages 
                SET reply_count = reply_count + 1, updated_at = NOW()
                WHERE message_id = %s
            """
            
            self.db_manager.execute_query(query, (parent_message_id,))
            
        except Exception as e:
            self.logger.error(f"Error updating reply count for message {parent_message_id}: {e}")
    
    def get_unread_count(self, user_id: str) -> int:
        """Get unread message count for a user."""
        try:
            query = """
                SELECT COUNT(*) as unread_count
                FROM shtetl_messages 
                WHERE recipient_user_id = %s AND message_status = 'sent'
            """
            
            result = self.db_manager.execute_query(query, (user_id,), fetch_one=True)
            return int(result.get('unread_count', 0)) if result else 0
            
        except Exception as e:
            self.logger.error(f"Error getting unread count for user {user_id}: {e}")
            return 0
