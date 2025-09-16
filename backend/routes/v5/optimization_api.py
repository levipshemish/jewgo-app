#!/usr/bin/env python3
"""
Optimization API Endpoints for JewGo Backend
===========================================

This module provides API endpoints for:
- Performance monitoring dashboard
- Cache management and warming
- Database optimization recommendations
- System health and metrics

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-15
"""

from flask import Blueprint, jsonify, request
from datetime import datetime

from utils.logging_config import get_logger
from utils.optimization_integration import get_optimization_manager, get_optimization_dashboard
from middleware.auth_v5 import require_auth_v5
from middleware.rate_limit_v5 import rate_limit_v5

logger = get_logger(__name__)

# Create optimization API blueprint
optimization_api = Blueprint('optimization_api', __name__, url_prefix='/api/v5/optimization')


@optimization_api.route('/dashboard', methods=['GET'])
@require_auth_v5
@rate_limit_v5()
def get_dashboard():
    """Get comprehensive optimization dashboard."""
    try:
        dashboard = get_optimization_dashboard()
        return jsonify({
            'success': True,
            'data': dashboard,
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Failed to get optimization dashboard: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve optimization dashboard',
            'details': str(e)
        }), 500


@optimization_api.route('/status', methods=['GET'])
@require_auth_v5
@rate_limit_v5()
def get_optimization_status():
    """Get optimization system status."""
    try:
        manager = get_optimization_manager()
        status = manager.get_optimization_status()
        
        return jsonify({
            'success': True,
            'data': status,
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Failed to get optimization status: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve optimization status',
            'details': str(e)
        }), 500


@optimization_api.route('/cache/warm', methods=['POST'])
@require_auth_v5
@rate_limit_v5()
def warm_cache():
    """Warm cache using registered strategies."""
    try:
        data = request.get_json() or {}
        strategy = data.get('strategy', 'all')
        
        manager = get_optimization_manager()
        
        if strategy == 'all':
            results = manager.warm_all_caches()
        else:
            if manager.cache_manager and strategy in manager.cache_manager.warming_strategies:
                results = {strategy: manager.cache_manager.warm_cache(strategy)}
            else:
                return jsonify({
                    'success': False,
                    'error': f'Unknown cache warming strategy: {strategy}'
                }), 400
        
        return jsonify({
            'success': True,
            'data': {
                'strategy': strategy,
                'results': results,
                'timestamp': datetime.now().isoformat()
            }
        }), 200
    except Exception as e:
        logger.error(f"Failed to warm cache: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to warm cache',
            'details': str(e)
        }), 500


@optimization_api.route('/cache/metrics', methods=['GET'])
@require_auth_v5
@rate_limit_v5()
def get_cache_metrics():
    """Get detailed cache metrics."""
    try:
        manager = get_optimization_manager()
        
        if not manager.cache_manager:
            return jsonify({
                'success': False,
                'error': 'Cache manager not available'
            }), 503
        
        metrics = manager.cache_manager.get_metrics()
        
        return jsonify({
            'success': True,
            'data': metrics,
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Failed to get cache metrics: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve cache metrics',
            'details': str(e)
        }), 500


@optimization_api.route('/cache/reset', methods=['POST'])
@require_auth_v5
@rate_limit_v5()
def reset_cache_metrics():
    """Reset cache metrics."""
    try:
        manager = get_optimization_manager()
        
        if not manager.cache_manager:
            return jsonify({
                'success': False,
                'error': 'Cache manager not available'
            }), 503
        
        manager.cache_manager.reset_metrics()
        
        return jsonify({
            'success': True,
            'message': 'Cache metrics reset successfully',
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Failed to reset cache metrics: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to reset cache metrics',
            'details': str(e)
        }), 500


@optimization_api.route('/database/metrics', methods=['GET'])
@require_auth_v5
@rate_limit_v5()
def get_database_metrics():
    """Get database performance metrics."""
    try:
        manager = get_optimization_manager()
        
        if not manager.db_optimizer:
            return jsonify({
                'success': False,
                'error': 'Database optimizer not available'
            }), 503
        
        metrics = manager.db_optimizer.get_performance_metrics()
        
        return jsonify({
            'success': True,
            'data': metrics,
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Failed to get database metrics: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve database metrics',
            'details': str(e)
        }), 500


@optimization_api.route('/database/slow-queries', methods=['GET'])
@require_auth_v5
@rate_limit_v5()
def get_slow_queries():
    """Get slow query analysis."""
    try:
        manager = get_optimization_manager()
        
        if not manager.db_optimizer:
            return jsonify({
                'success': False,
                'error': 'Database optimizer not available'
            }), 503
        
        slow_queries = manager.db_optimizer.analyze_slow_queries()
        
        return jsonify({
            'success': True,
            'data': {
                'slow_queries': slow_queries,
                'count': len(slow_queries)
            },
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Failed to get slow queries: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve slow queries',
            'details': str(e)
        }), 500


@optimization_api.route('/database/index-recommendations', methods=['GET'])
@require_auth_v5
@rate_limit_v5()
def get_index_recommendations():
    """Get database index recommendations."""
    try:
        manager = get_optimization_manager()
        
        if not manager.db_optimizer:
            return jsonify({
                'success': False,
                'error': 'Database optimizer not available'
            }), 503
        
        recommendations = manager.db_optimizer.get_index_recommendations()
        
        return jsonify({
            'success': True,
            'data': {
                'recommendations': [rec.__dict__ for rec in recommendations],
                'count': len(recommendations)
            },
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Failed to get index recommendations: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve index recommendations',
            'details': str(e)
        }), 500


@optimization_api.route('/connection-pool/status', methods=['GET'])
@require_auth_v5
@rate_limit_v5()
def get_connection_pool_status():
    """Get connection pool status."""
    try:
        manager = get_optimization_manager()
        
        if not manager.connection_pool:
            return jsonify({
                'success': False,
                'error': 'Connection pool not available'
            }), 503
        
        status = manager.connection_pool.get_pool_status()
        health = manager.connection_pool.get_health_summary()
        
        return jsonify({
            'success': True,
            'data': {
                'pool_status': status,
                'health_summary': health
            },
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Failed to get connection pool status: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve connection pool status',
            'details': str(e)
        }), 500


@optimization_api.route('/performance/dashboard', methods=['GET'])
@require_auth_v5
@rate_limit_v5()
def get_performance_dashboard():
    """Get performance monitoring dashboard."""
    try:
        manager = get_optimization_manager()
        
        if not manager.performance_monitor:
            return jsonify({
                'success': False,
                'error': 'Performance monitor not available'
            }), 503
        
        dashboard = manager.performance_monitor.get_performance_dashboard()
        
        return jsonify({
            'success': True,
            'data': dashboard,
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Failed to get performance dashboard: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve performance dashboard',
            'details': str(e)
        }), 500


@optimization_api.route('/recommendations', methods=['GET'])
@require_auth_v5
@rate_limit_v5()
def get_recommendations():
    """Get performance optimization recommendations."""
    try:
        manager = get_optimization_manager()
        recommendations = manager.get_performance_recommendations()
        
        return jsonify({
            'success': True,
            'data': {
                'recommendations': recommendations,
                'count': len(recommendations),
                'high_priority': len([r for r in recommendations if r.get('priority') == 'high']),
                'medium_priority': len([r for r in recommendations if r.get('priority') == 'medium']),
                'low_priority': len([r for r in recommendations if r.get('priority') == 'low'])
            },
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Failed to get recommendations: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve recommendations',
            'details': str(e)
        }), 500


@optimization_api.route('/health', methods=['GET'])
def optimization_health():
    """Health check for optimization system."""
    try:
        manager = get_optimization_manager()
        
        health_status = {
            'status': 'healthy' if manager.initialized else 'unhealthy',
            'components': {
                'cache_manager': 'active' if manager.cache_manager else 'inactive',
                'db_optimizer': 'active' if manager.db_optimizer else 'inactive',
                'connection_pool': 'active' if manager.connection_pool else 'inactive',
                'performance_monitor': 'active' if manager.performance_monitor else 'inactive'
            },
            'timestamp': datetime.now().isoformat()
        }
        
        status_code = 200 if manager.initialized else 503
        
        return jsonify(health_status), status_code
    except Exception as e:
        logger.error(f"Optimization health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 503
