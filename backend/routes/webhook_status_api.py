"""
Webhook Status API endpoints for monitoring webhook health and activity
"""

from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta
import subprocess
import json
import os

webhook_status_bp = Blueprint('webhook_status', __name__)

@webhook_status_bp.route('/webhook/status', methods=['GET'])
def get_webhook_status():
    """Get comprehensive webhook status information"""
    try:
        # Check if webhook container is running
        webhook_container_status = check_webhook_container()
        
        # Get recent webhook logs
        recent_logs = get_recent_webhook_logs()
        
        # Get webhook configuration status
        webhook_configured = check_webhook_configuration()
        
        # Get deployment history
        deployment_history = get_deployment_history()
        
        status_data = {
            "webhook_configured": webhook_configured,
            "container_status": webhook_container_status,
            "recent_activity": recent_logs,
            "deployment_history": deployment_history,
            "last_check": datetime.utcnow().isoformat(),
            "status": "healthy" if webhook_container_status.get("running", False) else "unhealthy"
        }
        
        return jsonify({
            "success": True,
            "data": status_data
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def check_webhook_container():
    """Check if webhook container is running and get its status"""
    try:
        # Check if webhook container is running
        result = subprocess.run(
            ['docker', 'ps', '--filter', 'name=jewgo_webhook', '--format', 'json'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0 and result.stdout.strip():
            container_info = json.loads(result.stdout.strip())
            return {
                "running": True,
                "container_id": container_info.get("ID", ""),
                "status": container_info.get("Status", ""),
                "created": container_info.get("CreatedAt", ""),
                "ports": container_info.get("Ports", "")
            }
        else:
            return {
                "running": False,
                "error": "Container not found or not running"
            }
            
    except Exception as e:
        return {
            "running": False,
            "error": f"Failed to check container status: {str(e)}"
        }

def get_recent_webhook_logs():
    """Get recent webhook activity from logs"""
    try:
        # Get last 20 lines of webhook logs
        result = subprocess.run(
            ['docker', 'logs', '--tail', '20', 'jewgo_webhook'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            logs = result.stdout.strip().split('\n')
            recent_activity = []
            
            for log_line in logs[-10:]:  # Last 10 lines
                if log_line.strip():
                    recent_activity.append({
                        "timestamp": datetime.utcnow().isoformat(),  # Approximate
                        "message": log_line.strip(),
                        "type": "info"
                    })
            
            return {
                "recent_logs": recent_activity,
                "total_logs": len(logs)
            }
        else:
            return {
                "recent_logs": [],
                "error": "Failed to retrieve logs"
            }
            
    except Exception as e:
        return {
            "recent_logs": [],
            "error": f"Failed to get logs: {str(e)}"
        }

def check_webhook_configuration():
    """Check if webhook is properly configured"""
    try:
        # Check if webhook secret is set
        webhook_secret = os.getenv('GITHUB_WEBHOOK_SECRET')
        
        # Check if webhook endpoint is accessible
        webhook_url = "https://api.jewgo.app/webhook"
        
        return {
            "secret_configured": bool(webhook_secret),
            "endpoint_url": webhook_url,
            "configured": bool(webhook_secret)
        }
        
    except Exception as e:
        return {
            "secret_configured": False,
            "endpoint_url": "",
            "configured": False,
            "error": str(e)
        }

def get_deployment_history():
    """Get recent deployment history"""
    try:
        # Get recent git commits
        result = subprocess.run(
            ['git', 'log', '--oneline', '-10', '--since=7 days ago'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0:
            commits = []
            for line in result.stdout.strip().split('\n'):
                if line.strip():
                    parts = line.split(' ', 1)
                    if len(parts) >= 2:
                        commits.append({
                            "hash": parts[0],
                            "message": parts[1],
                            "timestamp": datetime.utcnow().isoformat()  # Approximate
                        })
            
            return {
                "recent_commits": commits,
                "total_commits": len(commits)
            }
        else:
            return {
                "recent_commits": [],
                "error": "Failed to get git history"
            }
            
    except Exception as e:
        return {
            "recent_commits": [],
            "error": f"Failed to get deployment history: {str(e)}"
        }

@webhook_status_bp.route('/webhook/test', methods=['POST'])
def test_webhook():
    """Test webhook functionality"""
    try:
        # Trigger a test deployment
        result = subprocess.run(
            ['docker', 'exec', 'jewgo_webhook', 'python3', '/app/webhook-handler.py', '--test'],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        return jsonify({
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
