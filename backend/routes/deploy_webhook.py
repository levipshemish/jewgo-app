#!/usr/bin/env python3
"""
Deployment Webhook Routes for JewGo Backend
==========================================
This module provides webhook endpoints for triggering deployments
and checking deployment status.
Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""
import os
import subprocess
import time
from datetime import datetime
from typing import Any, Dict
from flask import Blueprint, jsonify, request
from utils.logging_config import get_logger

logger = get_logger(__name__)
deploy_bp = Blueprint("deploy", __name__, url_prefix="/api/deploy")

# Simple authentication token (in production, use proper authentication)
DEPLOY_TOKEN = os.getenv("DEPLOY_WEBHOOK_TOKEN", "jewgo_deploy_2024_secure_token")


def authenticate_deploy_request():
    """Authenticate deployment webhook requests."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return False
    
    token = auth_header.replace("Bearer ", "")
    return token == DEPLOY_TOKEN


@deploy_bp.route("/status", methods=["GET"])
def deployment_status() -> Dict[str, Any]:
    """Get current deployment status."""
    try:
        # Test API endpoints directly
        health_status = "unknown"
        api_status = "unknown"
        
        # Test internal health endpoint
        try:
            import requests
            response = requests.get("http://localhost:8000/health", timeout=5)
            health_status = "healthy" if response.status_code == 200 else "unhealthy"
        except Exception as e:
            logger.warning(f"Health check failed: {e}")
            health_status = "error"
        
        # Test API v4 endpoint
        try:
            import requests
            response = requests.get("http://localhost:8000/api/v4/test/health", timeout=5)
            api_status = "healthy" if response.status_code == 200 else "unhealthy"
        except Exception as e:
            logger.warning(f"API v4 check failed: {e}")
            api_status = "error"
        
        return jsonify({
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "health_check": health_status,
            "api_check": api_status,
            "deployment_ready": health_status == "healthy" and api_status == "healthy",
            "message": "Deployment status check completed - Auto-deploy test v1.0"
        })
        
    except Exception as e:
        logger.exception("Failed to get deployment status")
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500


@deploy_bp.route("/trigger", methods=["POST"])
def trigger_deployment() -> Dict[str, Any]:
    """Trigger a backend deployment."""
    if not authenticate_deploy_request():
        return jsonify({
            "status": "error",
            "message": "Unauthorized"
        }), 401
    
    try:
        # Get deployment parameters
        data = request.get_json() or {}
        force_rebuild = data.get("force_rebuild", False)
        
        logger.info(f"Deployment triggered by webhook. Force rebuild: {force_rebuild}")
        
        # Run deployment script
        deploy_script = "/srv/jewgo-app/scripts/deploy-backend.sh"
        
        if force_rebuild:
            # Force rebuild by pulling latest images
            result = subprocess.run(
                [deploy_script, "deploy"],
                capture_output=True,
                text=True,
                timeout=300,  # 5 minutes timeout
                cwd="/srv/jewgo-app"
            )
        else:
            # Regular deployment
            result = subprocess.run(
                [deploy_script, "deploy"],
                capture_output=True,
                text=True,
                timeout=300,  # 5 minutes timeout
                cwd="/srv/jewgo-app"
            )
        
        if result.returncode == 0:
            return jsonify({
                "status": "success",
                "message": "Deployment completed successfully",
                "timestamp": datetime.utcnow().isoformat(),
                "output": result.stdout
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Deployment failed",
                "timestamp": datetime.utcnow().isoformat(),
                "error": result.stderr,
                "output": result.stdout
            }), 500
            
    except subprocess.TimeoutExpired:
        logger.error("Deployment timed out")
        return jsonify({
            "status": "error",
            "message": "Deployment timed out",
            "timestamp": datetime.utcnow().isoformat()
        }), 500
    except Exception as e:
        logger.exception("Failed to trigger deployment")
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500


@deploy_bp.route("/test", methods=["POST"])
def test_deployment() -> Dict[str, Any]:
    """Test current deployment."""
    if not authenticate_deploy_request():
        return jsonify({
            "status": "error",
            "message": "Unauthorized"
        }), 401
    
    try:
        # Run deployment test
        deploy_script = "/srv/jewgo-app/scripts/deploy-backend.sh"
        result = subprocess.run(
            [deploy_script, "test"],
            capture_output=True,
            text=True,
            timeout=60,  # 1 minute timeout
            cwd="/srv/jewgo-app"
        )
        
        if result.returncode == 0:
            return jsonify({
                "status": "success",
                "message": "Deployment test passed",
                "timestamp": datetime.utcnow().isoformat(),
                "output": result.stdout
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Deployment test failed",
                "timestamp": datetime.utcnow().isoformat(),
                "error": result.stderr,
                "output": result.stdout
            }), 500
            
    except Exception as e:
        logger.exception("Failed to test deployment")
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500


@deploy_bp.route("/rollback", methods=["POST"])
def rollback_deployment() -> Dict[str, Any]:
    """Rollback to previous deployment."""
    if not authenticate_deploy_request():
        return jsonify({
            "status": "error",
            "message": "Unauthorized"
        }), 401
    
    try:
        data = request.get_json() or {}
        backup_path = data.get("backup_path")
        
        if not backup_path:
            return jsonify({
                "status": "error",
                "message": "backup_path is required"
            }), 400
        
        # Run rollback
        deploy_script = "/srv/jewgo-app/scripts/deploy-backend.sh"
        result = subprocess.run(
            [deploy_script, "rollback", backup_path],
            capture_output=True,
            text=True,
            timeout=300,  # 5 minutes timeout
            cwd="/srv/jewgo-app"
        )
        
        if result.returncode == 0:
            return jsonify({
                "status": "success",
                "message": "Rollback completed successfully",
                "timestamp": datetime.utcnow().isoformat(),
                "output": result.stdout
            })
        else:
            return jsonify({
                "status": "error",
                "message": "Rollback failed",
                "timestamp": datetime.utcnow().isoformat(),
                "error": result.stderr,
                "output": result.stdout
            }), 500
            
    except Exception as e:
        logger.exception("Failed to rollback deployment")
        return jsonify({
            "status": "error",
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500
