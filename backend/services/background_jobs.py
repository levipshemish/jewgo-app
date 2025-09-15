#!/usr/bin/env python3
"""
Background Jobs for JewGo Backend
=================================

This module defines common background jobs for the JewGo application:
- Restaurant data updates and synchronization
- Cache warming and invalidation
- Database maintenance and optimization
- Email notifications and alerts
- Data analytics and reporting
- External API synchronization

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-15
"""

import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from utils.logging_config import get_logger
from services.job_queue_manager import job, JobPriority, get_job_queue_manager
from database.connection_manager import get_connection_manager
from cache.redis_manager_v5 import get_redis_manager_v5
from utils.optimization_integration import get_optimization_manager

logger = get_logger(__name__)


@job("restaurant_data_sync", priority=JobPriority.HIGH)
def sync_restaurant_data(restaurant_ids: List[int] = None, batch_size: int = 10):
    """Sync restaurant data with external sources."""
    logger.info(f"Starting restaurant data sync for {len(restaurant_ids) if restaurant_ids else 'all'} restaurants")
    
    try:
        connection_manager = get_connection_manager()
        redis_manager = get_redis_manager_v5()
        
        # Get restaurants to sync
        if restaurant_ids:
            restaurants = restaurant_ids
        else:
            # Get all active restaurants
            with connection_manager.get_session() as session:
                result = session.execute("""
                    SELECT id FROM restaurants 
                    WHERE status = 'active' 
                    ORDER BY updated_at ASC 
                    LIMIT 100
                """)
                restaurants = [row[0] for row in result.fetchall()]
        
        # Process in batches
        for i in range(0, len(restaurants), batch_size):
            batch = restaurants[i:i + batch_size]
            
            for restaurant_id in batch:
                try:
                    # Update restaurant data (placeholder for actual sync logic)
                    with connection_manager.get_session() as session:
                        session.execute("""
                            UPDATE restaurants 
                            SET updated_at = NOW() 
                            WHERE id = :restaurant_id
                        """, {'restaurant_id': restaurant_id})
                        session.commit()
                    
                    # Invalidate cache
                    cache_key = f"restaurant:{restaurant_id}"
                    redis_manager.delete(cache_key)
                    
                    logger.info(f"Synced restaurant {restaurant_id}")
                    
                except Exception as e:
                    logger.error(f"Error syncing restaurant {restaurant_id}: {e}")
            
            # Small delay between batches
            time.sleep(0.1)
        
        logger.info(f"Completed restaurant data sync for {len(restaurants)} restaurants")
        return {"synced_count": len(restaurants), "status": "success"}
        
    except Exception as e:
        logger.error(f"Restaurant data sync failed: {e}")
        raise


@job("cache_warming", priority=JobPriority.NORMAL)
def warm_cache(cache_type: str = "popular", limit: int = 100):
    """Warm up cache with frequently accessed data."""
    logger.info(f"Starting cache warming for {cache_type} data")
    
    try:
        optimization_manager = get_optimization_manager()
        if not optimization_manager or not optimization_manager.cache_manager:
            logger.warning("Cache manager not available for warming")
            return {"status": "skipped", "reason": "cache_manager_not_available"}
        
        cache_manager = optimization_manager.cache_manager
        connection_manager = get_connection_manager()
        
        warmed_count = 0
        
        if cache_type == "popular":
            # Warm popular restaurants
            with connection_manager.get_session() as session:
                result = session.execute("""
                    SELECT id, name, city, state, kosher_category 
                    FROM restaurants 
                    WHERE status = 'active' 
                    ORDER BY created_at DESC 
                    LIMIT :limit
                """, {'limit': limit})
                
                for row in result.fetchall():
                    restaurant_id, name, city, state, kosher_category = row
                    
                    # Cache restaurant data
                    cache_key = f"restaurant:{restaurant_id}"
                    cache_data = {
                        'id': restaurant_id,
                        'name': name,
                        'city': city,
                        'state': state,
                        'kosher_category': kosher_category
                    }
                    
                    cache_manager.set(cache_key, cache_data, ttl=3600)
                    warmed_count += 1
        
        elif cache_type == "search":
            # Warm search results
            popular_searches = [
                "kosher restaurant",
                "dairy restaurant",
                "meat restaurant",
                "pas yisroel",
                "cholov yisroel"
            ]
            
            for search_term in popular_searches:
                cache_key = f"search:{search_term}"
                # Placeholder for actual search results
                cache_data = {"term": search_term, "results": []}
                cache_manager.set(cache_key, cache_data, ttl=1800)
                warmed_count += 1
        
        logger.info(f"Cache warming completed: {warmed_count} items warmed")
        return {"warmed_count": warmed_count, "cache_type": cache_type, "status": "success"}
        
    except Exception as e:
        logger.error(f"Cache warming failed: {e}")
        raise


@job("database_maintenance", priority=JobPriority.LOW)
def database_maintenance(maintenance_type: str = "vacuum"):
    """Perform database maintenance tasks."""
    logger.info(f"Starting database maintenance: {maintenance_type}")
    
    try:
        connection_manager = get_connection_manager()
        
        if maintenance_type == "vacuum":
            # Analyze tables for query optimization
            with connection_manager.get_session() as session:
                tables = ['restaurants', 'synagogues', 'mikvah', 'stores']
                
                for table in tables:
                    try:
                        session.execute(f"ANALYZE {table}")
                        logger.info(f"Analyzed table: {table}")
                    except Exception as e:
                        logger.warning(f"Could not analyze table {table}: {e}")
                
                session.commit()
        
        elif maintenance_type == "cleanup":
            # Clean up old data
            with connection_manager.get_session() as session:
                # Clean up old cache entries (if stored in DB)
                session.execute("""
                    DELETE FROM etag_cache_v5 
                    WHERE created_at < NOW() - INTERVAL '7 days'
                """)
                
                # Clean up old audit logs
                session.execute("""
                    DELETE FROM audit_log_v5 
                    WHERE timestamp < NOW() - INTERVAL '30 days'
                """)
                
                session.commit()
                logger.info("Cleaned up old data")
        
        logger.info(f"Database maintenance completed: {maintenance_type}")
        return {"maintenance_type": maintenance_type, "status": "success"}
        
    except Exception as e:
        logger.error(f"Database maintenance failed: {e}")
        raise


@job("performance_analysis", priority=JobPriority.NORMAL)
def performance_analysis(analysis_type: str = "queries"):
    """Analyze system performance and generate reports."""
    logger.info(f"Starting performance analysis: {analysis_type}")
    
    try:
        optimization_manager = get_optimization_manager()
        if not optimization_manager:
            logger.warning("Optimization manager not available")
            return {"status": "skipped", "reason": "optimization_manager_not_available"}
        
        analysis_results = {}
        
        if analysis_type == "queries":
            # Analyze slow queries
            connection_manager = get_connection_manager()
            
            with connection_manager.get_session() as session:
                # Get query performance stats (PostgreSQL specific)
                result = session.execute("""
                    SELECT query, mean_time, calls, total_time
                    FROM pg_stat_statements 
                    WHERE mean_time > 1000  -- queries taking more than 1 second
                    ORDER BY mean_time DESC 
                    LIMIT 10
                """)
                
                slow_queries = []
                for row in result.fetchall():
                    slow_queries.append({
                        'query': row[0][:200] + '...' if len(row[0]) > 200 else row[0],
                        'mean_time_ms': round(row[1], 2),
                        'calls': row[2],
                        'total_time_ms': round(row[3], 2)
                    })
                
                analysis_results['slow_queries'] = slow_queries
        
        elif analysis_type == "cache":
            # Analyze cache performance
            if optimization_manager.cache_manager:
                cache_stats = optimization_manager.cache_manager.get_stats()
                analysis_results['cache_stats'] = cache_stats
        
        elif analysis_type == "system":
            # Analyze system resources
            if optimization_manager.performance_monitor:
                system_metrics = optimization_manager.performance_monitor.get_system_metrics()
                analysis_results['system_metrics'] = system_metrics
        
        logger.info(f"Performance analysis completed: {analysis_type}")
        return {"analysis_type": analysis_type, "results": analysis_results, "status": "success"}
        
    except Exception as e:
        logger.error(f"Performance analysis failed: {e}")
        raise


@job("email_notifications", priority=JobPriority.HIGH)
def send_email_notifications(notification_type: str, recipients: List[str], **kwargs):
    """Send email notifications to users."""
    logger.info(f"Sending {notification_type} notifications to {len(recipients)} recipients")
    
    try:
        # Placeholder for email sending logic
        # In a real implementation, this would integrate with an email service
        
        sent_count = 0
        failed_count = 0
        
        for recipient in recipients:
            try:
                # Simulate email sending
                time.sleep(0.1)  # Simulate network delay
                
                # Log the notification (in production, this would send actual emails)
                logger.info(f"Sent {notification_type} notification to {recipient}")
                sent_count += 1
                
            except Exception as e:
                logger.error(f"Failed to send notification to {recipient}: {e}")
                failed_count += 1
        
        logger.info(f"Email notifications completed: {sent_count} sent, {failed_count} failed")
        return {
            "notification_type": notification_type,
            "sent_count": sent_count,
            "failed_count": failed_count,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Email notifications failed: {e}")
        raise


@job("data_export", priority=JobPriority.LOW)
def export_data(export_type: str, format: str = "json", filters: Dict[str, Any] = None):
    """Export data for analytics or backup purposes."""
    logger.info(f"Starting data export: {export_type} in {format} format")
    
    try:
        connection_manager = get_connection_manager()
        export_data = []
        
        if export_type == "restaurants":
            with connection_manager.get_session() as session:
                query = "SELECT * FROM restaurants WHERE status = 'active'"
                params = {}
                
                if filters:
                    if 'city' in filters:
                        query += " AND city = :city"
                        params['city'] = filters['city']
                    
                    if 'state' in filters:
                        query += " AND state = :state"
                        params['state'] = filters['state']
                
                result = session.execute(query, params)
                
                for row in result.fetchall():
                    export_data.append(dict(row._mapping))
        
        elif export_type == "analytics":
            # Export analytics data
            with connection_manager.get_session() as session:
                # Get restaurant counts by category
                result = session.execute("""
                    SELECT kosher_category, COUNT(*) as count
                    FROM restaurants 
                    WHERE status = 'active'
                    GROUP BY kosher_category
                """)
                
                for row in result.fetchall():
                    export_data.append({
                        'category': row[0],
                        'count': row[1]
                    })
        
        # In a real implementation, this would save to a file or upload to cloud storage
        logger.info(f"Data export completed: {len(export_data)} records exported")
        return {
            "export_type": export_type,
            "format": format,
            "record_count": len(export_data),
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Data export failed: {e}")
        raise


@job("external_api_sync", priority=JobPriority.NORMAL)
def sync_external_apis(api_name: str, sync_type: str = "full"):
    """Synchronize data with external APIs."""
    logger.info(f"Starting external API sync: {api_name} ({sync_type})")
    
    try:
        if api_name == "google_places":
            # Sync with Google Places API
            # This would integrate with the existing Google Places service
            logger.info("Syncing with Google Places API")
            
            # Placeholder for actual Google Places sync
            time.sleep(2)  # Simulate API calls
            
        elif api_name == "kosher_certifications":
            # Sync kosher certification data
            logger.info("Syncing kosher certification data")
            
            # Placeholder for kosher certification sync
            time.sleep(1)
        
        logger.info(f"External API sync completed: {api_name}")
        return {
            "api_name": api_name,
            "sync_type": sync_type,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"External API sync failed: {e}")
        raise


def schedule_common_jobs():
    """Schedule common recurring jobs."""
    job_manager = get_job_queue_manager()
    
    # Schedule restaurant data sync every 6 hours
    job_manager.schedule_recurring_job(
        "restaurant_data_sync",
        "0 */6 * * *",  # Every 6 hours
        priority=JobPriority.HIGH
    )
    
    # Schedule cache warming every 2 hours
    job_manager.schedule_recurring_job(
        "cache_warming",
        "0 */2 * * *",  # Every 2 hours
        priority=JobPriority.NORMAL
    )
    
    # Schedule database maintenance daily at 2 AM
    job_manager.schedule_recurring_job(
        "database_maintenance",
        "0 2 * * *",  # Daily at 2 AM
        priority=JobPriority.LOW
    )
    
    # Schedule performance analysis every 4 hours
    job_manager.schedule_recurring_job(
        "performance_analysis",
        "0 */4 * * *",  # Every 4 hours
        priority=JobPriority.NORMAL
    )
    
    logger.info("Scheduled common recurring jobs")


def initialize_background_jobs():
    """Initialize the background job system."""
    try:
        # Get job queue manager
        job_manager = get_job_queue_manager()
        
        # Start workers
        job_manager.start_workers(num_workers=3)
        
        # Schedule common jobs
        schedule_common_jobs()
        
        logger.info("Background job system initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize background job system: {e}")
        return False
