#!/usr/bin/env python3
"""
V5 Security API Blueprint
=========================
This blueprint provides API endpoints for security management including:
- Security statistics and monitoring
- IP blocking and whitelisting
- Rate limit management
- Security event logs
- Anomaly detection status

Author: JewGo Development Team
Version: 1.0
Last Updated: 2025-01-27
"""

from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
from typing import Dict, Any

from utils.logging_config import get_logger
from middleware.auth_v5 import require_auth_v5
from middleware.rate_limit_v5 import rate_limit_v5
from security.advanced_security_manager import get_security_manager, SecurityLevel

logger = get_logger(__name__)

security_api = Blueprint('security_api_v5', __name__, url_prefix='/api/v5/security')

@security_api.route('/health', methods=['GET'])
@rate_limit_v5()
def security_health():
    """
    Health check for the Security API.
    Returns the status of the security system.
    """
    try:
        security_manager = get_security_manager()
        stats = security_manager.get_security_stats()
        
        return jsonify({
            "status": "active",
            "timestamp": datetime.now().isoformat(),
            "security_stats": stats,
            "message": "Security API is operational."
        }), 200
    except Exception as e:
        logger.error(f"Security health check failed: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"Failed to retrieve security health: {str(e)}"
        }), 500

@security_api.route('/stats', methods=['GET'])
@require_auth_v5
@rate_limit_v5()
def get_security_stats():
    """
    Get comprehensive security statistics.
    Requires authentication.
    """
    try:
        security_manager = get_security_manager()
        stats = security_manager.get_security_stats()
        
        return jsonify({
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "security_stats": stats,
            "message": "Security statistics retrieved successfully."
        }), 200
    except Exception as e:
        logger.error(f"Failed to get security stats: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"Failed to retrieve security statistics: {str(e)}"
        }), 500

@security_api.route('/events', methods=['GET'])
@require_auth_v5
@rate_limit_v5()
def get_security_events():
    """
    Get recent security events.
    Supports filtering by severity and time range.
    """
    try:
        # Get query parameters
        limit = request.args.get('limit', 100, type=int)
        severity = request.args.get('severity')
        hours = request.args.get('hours', 24, type=int)
        
        # Validate parameters
        if limit > 1000:
            limit = 1000
        if hours > 168:  # Max 1 week
            hours = 168
        
        security_manager = get_security_manager()
        events = security_manager.get_recent_security_events(limit)
        
        # Filter by severity if specified
        if severity:
            events = [e for e in events if e['severity'] == severity]
        
        # Filter by time range
        cutoff_time = datetime.now() - timedelta(hours=hours)
        events = [
            e for e in events 
            if datetime.fromisoformat(e['timestamp']) >= cutoff_time
        ]
        
        return jsonify({
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "events": events,
            "total_events": len(events),
            "filters": {
                "limit": limit,
                "severity": severity,
                "hours": hours
            },
            "message": "Security events retrieved successfully."
        }), 200
    except Exception as e:
        logger.error(f"Failed to get security events: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"Failed to retrieve security events: {str(e)}"
        }), 500

@security_api.route('/block-ip', methods=['POST'])
@require_auth_v5
@rate_limit_v5()
def block_ip():
    """
    Block an IP address.
    Requires authentication and admin privileges.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "JSON data required"
            }), 400
        
        ip = data.get('ip')
        duration = data.get('duration', 3600)  # Default 1 hour
        reason = data.get('reason', 'Manual block')
        
        if not ip:
            return jsonify({
                "success": False,
                "error": "IP address is required"
            }), 400
        
        # Validate duration
        if not isinstance(duration, int) or duration <= 0:
            return jsonify({
                "success": False,
                "error": "Duration must be a positive integer (seconds)"
            }), 400
        
        security_manager = get_security_manager()
        success = security_manager.block_ip(ip, duration, reason)
        
        if success:
            return jsonify({
                "success": True,
                "message": f"IP {ip} blocked for {duration} seconds",
                "details": {
                    "ip": ip,
                    "duration": duration,
                    "reason": reason
                }
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": f"Failed to block IP {ip}"
            }), 500
    except Exception as e:
        logger.error(f"Failed to block IP: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"Failed to block IP: {str(e)}"
        }), 500

@security_api.route('/unblock-ip', methods=['POST'])
@require_auth_v5
@rate_limit_v5()
def unblock_ip():
    """
    Unblock an IP address.
    Requires authentication and admin privileges.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "JSON data required"
            }), 400
        
        ip = data.get('ip')
        if not ip:
            return jsonify({
                "success": False,
                "error": "IP address is required"
            }), 400
        
        security_manager = get_security_manager()
        success = security_manager.unblock_ip(ip)
        
        if success:
            return jsonify({
                "success": True,
                "message": f"IP {ip} unblocked",
                "details": {"ip": ip}
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": f"Failed to unblock IP {ip}"
            }), 500
    except Exception as e:
        logger.error(f"Failed to unblock IP: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"Failed to unblock IP: {str(e)}"
        }), 500

@security_api.route('/whitelist-ip', methods=['POST'])
@require_auth_v5
@rate_limit_v5()
def whitelist_ip():
    """
    Add an IP address to the whitelist.
    Requires authentication and admin privileges.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "JSON data required"
            }), 400
        
        ip = data.get('ip')
        if not ip:
            return jsonify({
                "success": False,
                "error": "IP address is required"
            }), 400
        
        security_manager = get_security_manager()
        success = security_manager.whitelist_ip(ip)
        
        if success:
            return jsonify({
                "success": True,
                "message": f"IP {ip} added to whitelist",
                "details": {"ip": ip}
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": f"Failed to whitelist IP {ip}"
            }), 500
    except Exception as e:
        logger.error(f"Failed to whitelist IP: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"Failed to whitelist IP: {str(e)}"
        }), 500

@security_api.route('/rate-limits', methods=['GET'])
@require_auth_v5
@rate_limit_v5()
def get_rate_limits():
    """
    Get current rate limiting rules and their status.
    """
    try:
        security_manager = get_security_manager()
        rules = {}
        
        for rule_name, rule in security_manager.rate_limit_rules.items():
            rules[rule_name] = {
                "requests_per_minute": rule.requests_per_minute,
                "requests_per_hour": rule.requests_per_hour,
                "requests_per_day": rule.requests_per_day,
                "burst_limit": rule.burst_limit,
                "window_size": rule.window_size,
                "block_duration": rule.block_duration,
                "applies_to": rule.applies_to
            }
        
        return jsonify({
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "rate_limit_rules": rules,
            "message": "Rate limit rules retrieved successfully."
        }), 200
    except Exception as e:
        logger.error(f"Failed to get rate limits: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"Failed to retrieve rate limits: {str(e)}"
        }), 500

@security_api.route('/anomaly-detection', methods=['GET'])
@require_auth_v5
@rate_limit_v5()
def get_anomaly_detection_status():
    """
    Get anomaly detection configuration and status.
    """
    try:
        security_manager = get_security_manager()
        
        return jsonify({
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "anomaly_thresholds": security_manager.anomaly_thresholds,
            "active_fingerprints": len(security_manager.request_fingerprints),
            "message": "Anomaly detection status retrieved successfully."
        }), 200
    except Exception as e:
        logger.error(f"Failed to get anomaly detection status: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"Failed to retrieve anomaly detection status: {str(e)}"
        }), 500

@security_api.route('/test-security', methods=['POST'])
@require_auth_v5
@rate_limit_v5()
def test_security():
    """
    Test security features with a sample request.
    This endpoint is for testing and debugging security features.
    """
    try:
        data = request.get_json() or {}
        test_type = data.get('test_type', 'normal')
        
        # Simulate different types of requests for testing
        if test_type == 'sql_injection':
            # This should trigger SQL injection detection
            test_data = {"query": "SELECT * FROM users WHERE id = 1 OR 1=1"}
        elif test_type == 'xss':
            # This should trigger XSS detection
            test_data = {"content": "<script>alert('xss')</script>"}
        elif test_type == 'high_frequency':
            # This should trigger high frequency detection
            test_data = {"test": "high_frequency_request"}
        else:
            test_data = {"test": "normal_request"}
        
        # Get request data
        request_data = {
            'ip': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', ''),
            'endpoint': request.endpoint,
            'method': request.method,
            'json': test_data
        }
        
        security_manager = get_security_manager()
        
        # Test anomaly detection
        anomalies = security_manager.detect_anomalies(request_data)
        
        # Test rate limiting
        identifier = request_data['ip']
        allowed, rate_limit_result = security_manager.check_rate_limit(
            identifier, 'api_general', request_data
        )
        
        return jsonify({
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "test_type": test_type,
            "test_data": test_data,
            "anomalies_detected": len(anomalies),
            "anomalies": anomalies,
            "rate_limit_allowed": allowed,
            "rate_limit_result": rate_limit_result,
            "message": "Security test completed successfully."
        }), 200
    except Exception as e:
        logger.error(f"Security test failed: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"Security test failed: {str(e)}"
        }), 500
