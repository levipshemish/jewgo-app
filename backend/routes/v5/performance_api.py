#!/usr/bin/env python3
"""
Performance Monitoring API for JewGo Backend
============================================

Provides REST API endpoints for performance monitoring and metrics:
- Real-time performance metrics
- Performance trends and analytics
- Alert management
- Performance recommendations

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-27
"""

from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
from typing import Dict, Any

from utils.logging_config import get_logger
from services.performance_monitor_v2 import get_performance_monitor_v2
from services.enhanced_health_service import get_health_service

logger = get_logger(__name__)

# Create blueprint
performance_api = Blueprint('performance_api', __name__, url_prefix='/api/v5/performance')


@performance_api.route('/metrics', methods=['GET'])
def get_performance_metrics():
    """Get current performance metrics."""
    try:
        monitor = get_performance_monitor_v2()
        dashboard_data = monitor.get_performance_dashboard()
        
        return jsonify({
            'success': True,
            'data': dashboard_data,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get performance metrics: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve performance metrics',
            'message': str(e)
        }), 500


@performance_api.route('/health', methods=['GET'])
def get_performance_health():
    """Get performance health status."""
    try:
        health_service = get_health_service()
        health_status = health_service.get_overall_status()
        
        return jsonify({
            'success': True,
            'data': health_status,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get performance health: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve performance health',
            'message': str(e)
        }), 500


@performance_api.route('/alerts', methods=['GET'])
def get_performance_alerts():
    """Get active performance alerts."""
    try:
        monitor = get_performance_monitor_v2()
        dashboard_data = monitor.get_performance_dashboard()
        
        alerts_data = {
            'active_alerts': dashboard_data.get('active_alerts', []),
            'alert_history': dashboard_data.get('alert_history', []),
            'total_active': len(dashboard_data.get('active_alerts', [])),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return jsonify({
            'success': True,
            'data': alerts_data
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get performance alerts: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve performance alerts',
            'message': str(e)
        }), 500


@performance_api.route('/trends/<metric_name>', methods=['GET'])
def get_performance_trends(metric_name: str):
    """Get performance trends for a specific metric."""
    try:
        hours = request.args.get('hours', 24, type=int)
        hours = min(max(hours, 1), 168)  # Limit between 1 hour and 1 week
        
        monitor = get_performance_monitor_v2()
        trends = monitor.collector.get_metric_trends(metric_name, hours)
        
        return jsonify({
            'success': True,
            'data': {
                'metric_name': metric_name,
                'time_range_hours': hours,
                'data_points': len(trends),
                'trends': trends
            },
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get performance trends for {metric_name}: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to retrieve trends for metric {metric_name}',
            'message': str(e)
        }), 500


@performance_api.route('/business-metrics', methods=['GET'])
def get_business_metrics():
    """Get business-specific performance metrics."""
    try:
        monitor = get_performance_monitor_v2()
        summary = monitor.collector.get_performance_summary(hours=1)
        
        business_metrics = summary.get('business_metrics', {})
        
        return jsonify({
            'success': True,
            'data': {
                'metrics': business_metrics,
                'timestamp': datetime.utcnow().isoformat()
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get business metrics: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve business metrics',
            'message': str(e)
        }), 500


@performance_api.route('/recommendations', methods=['GET'])
def get_performance_recommendations():
    """Get performance optimization recommendations."""
    try:
        monitor = get_performance_monitor_v2()
        summary = monitor.collector.get_performance_summary(hours=1)
        
        recommendations = []
        
        # Analyze performance data and generate recommendations
        requests_data = summary.get('requests', {})
        system_data = summary.get('system', {})
        
        # Response time recommendations
        avg_response_time = requests_data.get('avg_response_time_ms', 0)
        if avg_response_time > 1000:
            recommendations.append({
                'type': 'performance',
                'priority': 'high',
                'title': 'High Response Time',
                'description': f'Average response time is {avg_response_time:.1f}ms, consider optimizing database queries or adding caching',
                'action': 'Review slow queries and implement caching strategies'
            })
        
        # Error rate recommendations
        error_rate = requests_data.get('error_rate_percent', 0)
        if error_rate > 2:
            recommendations.append({
                'type': 'reliability',
                'priority': 'high',
                'title': 'High Error Rate',
                'description': f'Error rate is {error_rate:.1f}%, investigate error causes',
                'action': 'Review error logs and implement better error handling'
            })
        
        # CPU usage recommendations
        cpu_percent = system_data.get('cpu_percent', 0)
        if cpu_percent > 70:
            recommendations.append({
                'type': 'resource',
                'priority': 'medium',
                'title': 'High CPU Usage',
                'description': f'CPU usage is {cpu_percent:.1f}%, consider scaling or optimization',
                'action': 'Monitor CPU-intensive operations and consider horizontal scaling'
            })
        
        # Memory usage recommendations
        memory_percent = system_data.get('memory_percent', 0)
        if memory_percent > 80:
            recommendations.append({
                'type': 'resource',
                'priority': 'medium',
                'title': 'High Memory Usage',
                'description': f'Memory usage is {memory_percent:.1f}%, monitor for memory leaks',
                'action': 'Check for memory leaks and consider increasing memory limits'
            })
        
        return jsonify({
            'success': True,
            'data': {
                'recommendations': recommendations,
                'total_recommendations': len(recommendations),
                'high_priority': len([r for r in recommendations if r['priority'] == 'high']),
                'timestamp': datetime.utcnow().isoformat()
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to get performance recommendations: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to generate performance recommendations',
            'message': str(e)
        }), 500


@performance_api.route('/record-business-metric', methods=['POST'])
def record_business_metric():
    """Record a business-specific metric."""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'JSON data required'
            }), 400
        
        metric_name = data.get('metric_name')
        value = data.get('value')
        labels = data.get('labels', {})
        
        if not metric_name or value is None:
            return jsonify({
                'success': False,
                'error': 'metric_name and value are required'
            }), 400
        
        monitor = get_performance_monitor_v2()
        monitor.record_business_metric(metric_name, value, labels)
        
        return jsonify({
            'success': True,
            'message': f'Business metric {metric_name} recorded successfully',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to record business metric: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to record business metric',
            'message': str(e)
        }), 500


# Error handlers
@performance_api.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Performance API endpoint not found'
    }), 404


@performance_api.errorhandler(500)
def internal_error(error):
    logger.error(f"Performance API internal error: {error}")
    return jsonify({
        'success': False,
        'error': 'Internal server error in performance API'
    }), 500