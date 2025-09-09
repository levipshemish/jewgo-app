"""
Consolidated health endpoints for JewGo backend.
Provides fast probe endpoint and detailed health status.
"""

from flask import Blueprint, jsonify
from datetime import datetime, timezone
from sqlalchemy import text

health_bp = Blueprint("health", __name__, url_prefix="")

@health_bp.route("/healthz")
def healthz():
    """Fast health check for load balancers and probes."""
    return "ok", 200

@health_bp.route("/health")
def health():
    """Detailed health check with database and Redis status."""
    status = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ok": True
    }
    
    # Check database
    try:
        from backend.database.database_manager_v4 import DatabaseManager
        db_manager = DatabaseManager()
        with db_manager.get_session() as session:
            session.execute(text("SELECT 1"))
        status["db_ok"] = True
    except Exception as e:
        status["db_ok"] = False
        status["db_error"] = str(e)[:200]
        status["ok"] = False
    
    # Check Redis
    try:
        from backend.utils.redis_client import redis_client
        redis_client.ping()
        status["redis_ok"] = True
    except Exception as e:
        status["redis_ok"] = False
        status["redis_error"] = str(e)[:200]
        status["ok"] = False
    
    return jsonify(status), 200 if status["ok"] else 503
