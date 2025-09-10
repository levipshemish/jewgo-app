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
        # Since we can't run docker commands from within the container,
        # we'll provide a simplified status based on what we can determine
        containers = []
        
        # Check if we can connect to other services to determine their status
        import requests
        import socket
        
        # Check backend (ourselves)
        containers.append({
            "name": "jewgo_backend",
            "status": "running",  # If we're responding, we're running
            "image": "jewgo-app-backend:latest",
            "ports": "5000/tcp",
            "created": "unknown",
            "uptime": "unknown",
            "health": "healthy",
            "recent_errors": []
        })
        
        # Check Redis
        try:
            import redis
            r = redis.Redis(host='jewgo_redis', port=6379, decode_responses=True)
            r.ping()
            redis_status = "running"
            redis_health = "healthy"
            redis_errors = []
        except Exception as e:
            redis_status = "stopped"
            redis_health = "unhealthy"
            redis_errors = [str(e)]
        
        containers.append({
            "name": "jewgo_redis",
            "status": redis_status,
            "image": "redis:7-alpine",
            "ports": "6379/tcp",
            "created": "unknown",
            "uptime": "unknown",
            "health": redis_health,
            "recent_errors": redis_errors
        })
        
        # Check PostgreSQL
        try:
            from database.database_manager_v4 import DatabaseManager
            db = DatabaseManager()
            if db.connect() and db.health_check():
                postgres_status = "running"
                postgres_health = "healthy"
                postgres_errors = []
            else:
                postgres_status = "stopped"
                postgres_health = "unhealthy"
                postgres_errors = ["Database connection failed"]
        except Exception as e:
            postgres_status = "stopped"
            postgres_health = "unhealthy"
            postgres_errors = [str(e)]
        
        containers.append({
            "name": "jewgo_postgres",
            "status": postgres_status,
            "image": "postgres:15",
            "ports": "5432/tcp",
            "created": "unknown",
            "uptime": "unknown",
            "health": postgres_health,
            "recent_errors": postgres_errors
        })
        
        # Check webhook (try to connect to it)
        try:
            response = requests.get("http://jewgo_webhook:8080/health", timeout=5)
            if response.status_code == 200:
                webhook_status = "running"
                webhook_health = "healthy"
                webhook_errors = []
            else:
                webhook_status = "running"
                webhook_health = "unhealthy"
                webhook_errors = [f"HTTP {response.status_code}"]
        except Exception as e:
            webhook_status = "stopped"
            webhook_health = "unhealthy"
            webhook_errors = [str(e)]
        
        containers.append({
            "name": "jewgo_webhook",
            "status": webhook_status,
            "image": "jewgo-app-webhook:latest",
            "ports": "8080/tcp",
            "created": "unknown",
            "uptime": "unknown",
            "health": webhook_health,
            "recent_errors": webhook_errors
        })
        
        # Check Nginx (try to connect to it)
        try:
            response = requests.get("http://jewgo_nginx/health", timeout=5)
            if response.status_code == 200:
                nginx_status = "running"
                nginx_health = "healthy"
                nginx_errors = []
            else:
                nginx_status = "running"
                nginx_health = "unhealthy"
                nginx_errors = [f"HTTP {response.status_code}"]
        except Exception as e:
            nginx_status = "stopped"
            nginx_health = "unhealthy"
            nginx_errors = [str(e)]
        
        containers.append({
            "name": "jewgo_nginx",
            "status": nginx_status,
            "image": "nginx:alpine",
            "ports": "80/tcp, 443/tcp",
            "created": "unknown",
            "uptime": "unknown",
            "health": nginx_health,
            "recent_errors": nginx_errors
        })
        
        return jsonify({
            "success": True,
            "data": {
                "containers": containers,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "total_containers": len(containers)
            }
        })
        
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
