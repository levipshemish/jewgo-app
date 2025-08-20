#!/usr/bin/env python3
"""Health Check Routes for JewGo Backend.
========================================

Provides health check endpoints for monitoring and deployment verification.

Author: JewGo Development Team
Version: 2.0
"""

from datetime import datetime, timezone
from typing import Any, Dict

from database.database_manager_v3 import EnhancedDatabaseManager
from flask import Blueprint, current_app, jsonify
from sqlalchemy.exc import OperationalError
from utils.api_response import health_response
from utils.config_manager import ConfigManager

"""Health Check Routes for JewGo Backend.
========================================

Provides health check endpoints for monitoring and deployment verification.

Author: JewGo Development Team
Version: 2.0
"""

bp = Blueprint("health", __name__, url_prefix="/api/health")


@bp.route("/basic", methods=["GET"])
def basic():
    """Basic health check - no database dependency."""
    return health_response(status="ok")


@bp.route("/full", methods=["GET"])
def full():
    """Full health check with database connectivity and data validation."""
    warnings = []
    checks = {}

    try:
        # Get database manager from current app context
        db_manager = current_app.config.get("DB_MANAGER")

        if db_manager and hasattr(db_manager, "get_restaurants_count"):
            checks["db"] = "ok"

            # Get restaurant count
            try:
                restaurants_count = db_manager.get_restaurants_count()
                checks["restaurants_count"] = restaurants_count
            except OperationalError:
                # Database transport error - return degraded status
                checks["db"] = "fail"
                checks["restaurants_count"] = 0
                return health_response(
                    status="degraded",
                    checks=checks,
                    warnings=warnings,
                    error="db_unreachable",
                )
            except Exception:
                checks["restaurants_count"] = 0
                warnings.append("could_not_count_restaurants")

            # Get hours count (restaurants with hours data)
            try:
                # Count restaurants that have hours data
                hours_count = db_manager.get_restaurants_with_hours_count()
                checks["hours_count"] = hours_count
                if hours_count == 0:
                    warnings.append("no_hours_data")
            except OperationalError:
                # Database transport error - return degraded status
                checks["db"] = "fail"
                checks["hours_count"] = 0
                return health_response(
                    status="degraded",
                    checks=checks,
                    warnings=warnings,
                    error="db_unreachable",
                )
            except Exception:
                checks["hours_count"] = 0
                warnings.append("could_not_count_hours")
        else:
            # Fallback to direct database check
            db_url = ConfigManager.get_database_url()
            if db_url:
                db_manager = EnhancedDatabaseManager(db_url)
                if db_manager.connect():
                    checks["db"] = "ok"

                    # Get restaurant count
                    try:
                        restaurants_count = db_manager.get_restaurants_count()
                        checks["restaurants_count"] = restaurants_count
                    except OperationalError:
                        # Database transport error - return degraded status
                        checks["db"] = "fail"
                        checks["restaurants_count"] = 0
                        return health_response(
                            status="degraded",
                            checks=checks,
                            warnings=warnings,
                            error="db_unreachable",
                        )
                    except Exception:
                        checks["restaurants_count"] = 0
                        warnings.append("could_not_count_restaurants")

                    # Get hours count (restaurants with hours data)
                    try:
                        hours_count = db_manager.get_restaurants_with_hours_count()
                        checks["hours_count"] = hours_count
                        if hours_count == 0:
                            warnings.append("no_hours_data")
                    except OperationalError:
                        # Database transport error - return degraded status
                        checks["db"] = "fail"
                        checks["hours_count"] = 0
                        return health_response(
                            status="degraded",
                            checks=checks,
                            warnings=warnings,
                            error="db_unreachable",
                        )
                    except Exception:
                        checks["hours_count"] = 0
                        warnings.append("could_not_count_hours")
                else:
                    checks["db"] = "fail"
                    return health_response(
                        status="degraded",
                        checks=checks,
                        warnings=warnings,
                        error="db_unreachable",
                    )
            else:
                checks["db"] = "fail"
                return health_response(
                    status="degraded",
                    checks=checks,
                    warnings=warnings,
                    error="db_unreachable",
                )

        return health_response(status="ok", checks=checks, warnings=warnings)

    except OperationalError:
        # Database transport error - return degraded status without stack trace
        checks["db"] = "fail"
        return health_response(
            status="degraded", checks=checks, warnings=warnings, error="db_unreachable"
        )
    except Exception as e:
        checks["db"] = "fail"
        warnings.append(f"health_check_error: {str(e)}")

    return health_response(status="degraded", checks=checks, warnings=warnings)


@bp.route("/api/debug/marketplace-table", methods=["GET"])
def debug_marketplace_table():
    """Debug endpoint to check marketplace table status."""
    try:
        from database.database_manager_v3 import EnhancedDatabaseManager

        db_manager = EnhancedDatabaseManager()

        with db_manager.get_connection() as conn:
            with conn.cursor() as cursor:
                # Check if marketplace table exists
                cursor.execute(
                    """
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'marketplace'
                    );
                """
                )

                table_exists = cursor.fetchone()[0]

                if table_exists:
                    # Check if table has data
                    cursor.execute("SELECT COUNT(*) FROM marketplace")
                    count = cursor.fetchone()[0]

                    # Check table structure
                    cursor.execute(
                        """
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE table_name = 'marketplace' 
                        ORDER BY ordinal_position
                    """
                    )

                    columns = cursor.fetchall()
                    column_info = [{"name": col[0], "type": col[1]} for col in columns]

                    return jsonify(
                        {
                            "success": True,
                            "table_exists": True,
                            "record_count": count,
                            "columns": column_info,
                        }
                    )
                else:
                    # Check what tables exist
                    cursor.execute(
                        """
                        SELECT table_name 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        ORDER BY table_name
                    """
                    )

                    tables = cursor.fetchall()
                    table_names = [table[0] for table in tables]

                    return jsonify(
                        {
                            "success": True,
                            "table_exists": False,
                            "available_tables": table_names,
                        }
                    )

    except Exception as e:
        return jsonify({"success": False, "error": str(e), "table_exists": False}), 500
