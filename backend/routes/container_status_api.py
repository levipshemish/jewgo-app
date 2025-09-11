#!/usr/bin/env python3
"""
Container Status API for JewGo Backend
=====================================
Provides endpoints for monitoring Docker container status.
"""

from flask import Blueprint, jsonify
import subprocess
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

container_status_bp = Blueprint('container_status', __name__)


@container_status_bp.route('/api/container-status', methods=['GET'])
def get_container_status():
    """Get status of all Docker containers."""
    try:
        # Get container list
        result = subprocess.run(
            ['docker', 'ps', '-a', '--format', 'json'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            return jsonify({"error": "Failed to get container list"}), 500
        
        containers = []
        for line in result.stdout.strip().split('\n'):
            if line:
                try:
                    container_data = json.loads(line)
                    containers.append({
                        'name': container_data.get('Names', 'unknown'),
                        'status': container_data.get('State', 'unknown'),
                        'image': container_data.get('Image', 'unknown'),
                        'created': container_data.get('CreatedAt', 'unknown'),
                        'ports': container_data.get('Ports', ''),
                        'uptime': 'unknown',
                        'health': 'unknown',
                        'recent_errors': []
                    })
                except json.JSONDecodeError:
                    continue
        
        return jsonify({
            "success": True,
            "source": "real",
            "data": {
                "containers": containers,
                "timestamp": datetime.utcnow().isoformat(),
                "total_containers": len(containers)
            }
        })
        
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Timeout getting container status"}), 500
    except Exception as e:
        logger.error(f"Error getting container status: {e}")
        return jsonify({"error": f"Failed to get container status: {str(e)}"}), 500


@container_status_bp.route('/api/container-logs/<container_name>', methods=['GET'])
def get_container_logs(container_name):
    """Get recent logs for a specific container."""
    try:
        result = subprocess.run(
            ['docker', 'logs', '--tail', '50', container_name],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            return jsonify({"error": f"Failed to get logs for {container_name}"}), 500
        
        logs = result.stdout.split('\n')
        return jsonify({
            "success": True,
            "data": {
                "container": container_name,
                "logs": logs,
                "timestamp": datetime.utcnow().isoformat()
            }
        })
        
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Timeout getting container logs"}), 500
    except Exception as e:
        logger.error(f"Error getting container logs: {e}")
        return jsonify({"error": f"Failed to get container logs: {str(e)}"}), 500
