"""
Performance metrics API endpoints for the JewGo backend.
Provides detailed performance monitoring and statistics.
"""

from flask import Blueprint, request, jsonify
import logging
from typing import Dict, Any
from utils.performance_metrics import get_performance_stats, performance_collector
from utils.api_caching import get_cache_stats
from utils.rbac import require_admin

# Setup logging
logger = logging.getLogger(__name__)

# Create blueprint
metrics_bp = Blueprint('metrics', __name__, url_prefix='/api/v4/metrics')

@metrics_bp.route('/performance', methods=['GET'])
@require_admin
def get_performance_metrics():
    """
    Get detailed performance metrics.
    
    Query Parameters:
    - time_window: Time window in minutes (default: 60)
    """
    try:
        time_window = request.args.get('time_window', type=int, default=60)
        time_window = max(1, min(time_window, 1440))  # Limit between 1 minute and 24 hours
        
        # Get performance stats
        stats = get_performance_stats(time_window)
        
        # Get cache stats
        cache_stats = get_cache_stats()
        
        response_data = {
            'success': True,
            'time_window_minutes': time_window,
            'performance': stats,
            'cache': cache_stats,
            'timestamp': stats['timestamp']
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error getting performance metrics: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@metrics_bp.route('/api', methods=['GET'])
@require_admin
def get_api_metrics():
    """
    Get API-specific performance metrics.
    
    Query Parameters:
    - time_window: Time window in minutes (default: 60)
    """
    try:
        time_window = request.args.get('time_window', type=int, default=60)
        time_window = max(1, min(time_window, 1440))
        
        api_stats = performance_collector.get_api_stats(time_window)
        
        return jsonify({
            'success': True,
            'time_window_minutes': time_window,
            'api_metrics': api_stats
        })
        
    except Exception as e:
        logger.error(f"Error getting API metrics: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@metrics_bp.route('/database', methods=['GET'])
@require_admin
def get_database_metrics():
    """
    Get database-specific performance metrics.
    
    Query Parameters:
    - time_window: Time window in minutes (default: 60)
    """
    try:
        time_window = request.args.get('time_window', type=int, default=60)
        time_window = max(1, min(time_window, 1440))
        
        db_stats = performance_collector.get_db_stats(time_window)
        
        return jsonify({
            'success': True,
            'time_window_minutes': time_window,
            'database_metrics': db_stats
        })
        
    except Exception as e:
        logger.error(f"Error getting database metrics: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@metrics_bp.route('/system', methods=['GET'])
@require_admin
def get_system_metrics():
    """
    Get system performance metrics.
    
    Query Parameters:
    - time_window: Time window in minutes (default: 60)
    """
    try:
        time_window = request.args.get('time_window', type=int, default=60)
        time_window = max(1, min(time_window, 1440))
        
        system_stats = performance_collector.get_system_stats(time_window)
        
        return jsonify({
            'success': True,
            'time_window_minutes': time_window,
            'system_metrics': system_stats
        })
        
    except Exception as e:
        logger.error(f"Error getting system metrics: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@metrics_bp.route('/cache', methods=['GET'])
@require_admin
def get_cache_metrics():
    """
    Get cache performance metrics.
    """
    try:
        cache_stats = get_cache_stats()
        
        return jsonify({
            'success': True,
            'cache_metrics': cache_stats
        })
        
    except Exception as e:
        logger.error(f"Error getting cache metrics: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@metrics_bp.route('/health', methods=['GET'])
def get_metrics_health():
    """
    Get metrics system health status.
    """
    try:
        # Get recent stats to check if metrics are being collected
        recent_stats = get_performance_stats(5)  # Last 5 minutes
        
        # Check if we have recent data
        has_recent_data = (
            recent_stats['api']['total_calls'] > 0 or
            recent_stats['database']['total_queries'] > 0 or
            recent_stats['system']['samples'] > 0
        )
        
        health_status = {
            'metrics_collection_active': has_recent_data,
            'api_calls_last_5min': recent_stats['api']['total_calls'],
            'db_queries_last_5min': recent_stats['database']['total_queries'],
            'system_samples_last_5min': recent_stats['system']['samples'],
            'cache_available': recent_stats.get('cache', {}).get('cache_available', False)
        }
        
        return jsonify({
            'success': True,
            'health': health_status
        })
        
    except Exception as e:
        logger.error(f"Error getting metrics health: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500
