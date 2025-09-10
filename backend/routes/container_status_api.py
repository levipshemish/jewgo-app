#!/usr/bin/env python3
"""
Container Status API for JewGo Backend.
Provides real-time container status information.
"""

import subprocess
import json
from datetime import datetime, timezone
from flask import Blueprint, jsonify
from utils.logging_config import get_logger

logger = get_logger(__name__)
container_status_bp = Blueprint("container_status", __name__)

@container_status_bp.route("/api/container-status", methods=["GET"])
def get_container_status():
    """Get real-time status of all containers."""
    try:
        # Get container information using docker ps
        result = subprocess.run(
            ["docker", "ps", "-a", "--format", "json"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            logger.error(f"Failed to get container status: {result.stderr}")
            return jsonify({
                "success": False,
                "error": "Failed to get container status",
                "details": result.stderr
            }), 500
        
        containers = []
        for line in result.stdout.strip().split('\n'):
            if line.strip():
                try:
                    container_data = json.loads(line)
                    # Parse container information
                    container_info = {
                        "name": container_data.get("Names", ""),
                        "status": container_data.get("State", ""),
                        "image": container_data.get("Image", ""),
                        "ports": container_data.get("Ports", ""),
                        "created": container_data.get("CreatedAt", ""),
                        "uptime": _calculate_uptime(container_data.get("CreatedAt", "")),
                        "health": _get_container_health(container_data.get("Names", "")),
                        "recent_errors": _get_recent_errors(container_data.get("Names", ""))
                    }
                    containers.append(container_info)
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse container data: {e}")
                    continue
        
        return jsonify({
            "success": True,
            "data": {
                "containers": containers,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "total_containers": len(containers)
            }
        })
        
    except subprocess.TimeoutExpired:
        logger.error("Timeout getting container status")
        return jsonify({
            "success": False,
            "error": "Timeout getting container status"
        }), 500
    except Exception as e:
        logger.error(f"Error getting container status: {e}")
        return jsonify({
            "success": False,
            "error": "Failed to get container status",
            "details": str(e)
        }), 500

def _calculate_uptime(created_at: str) -> str:
    """Calculate container uptime from creation time."""
    try:
        from datetime import datetime
        # Parse Docker's timestamp format
        created = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        uptime = now - created
        
        days = uptime.days
        hours, remainder = divmod(uptime.seconds, 3600)
        minutes, _ = divmod(remainder, 60)
        
        if days > 0:
            return f"{days}d {hours}h {minutes}m"
        elif hours > 0:
            return f"{hours}h {minutes}m"
        else:
            return f"{minutes}m"
    except Exception:
        return "unknown"

def _get_container_health(container_name: str) -> str:
    """Get container health status."""
    try:
        result = subprocess.run(
            ["docker", "inspect", container_name, "--format", "{{.State.Health.Status}}"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            health = result.stdout.strip()
            return health if health else "unknown"
        else:
            return "unknown"
    except Exception:
        return "unknown"

def _get_recent_errors(container_name: str) -> list:
    """Get recent errors from container logs."""
    try:
        result = subprocess.run(
            ["docker", "logs", "--tail", "10", container_name],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            logs = result.stdout.strip().split('\n')
            # Filter for error-like messages
            errors = []
            for log_line in logs[-5:]:  # Last 5 lines
                if any(keyword in log_line.lower() for keyword in ['error', 'failed', 'exception', 'timeout']):
                    errors.append(log_line.strip())
            return errors
        else:
            return []
    except Exception:
        return []
