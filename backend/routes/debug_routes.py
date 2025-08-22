#!/usr/bin/env python3
"""Debug Routes for JewGo Backend.
================================

Provides debug endpoints for database schema inspection and troubleshooting.

Author: JewGo Development Team
Version: 1.0
"""

from flask import Blueprint, current_app, jsonify
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
import logging

logger = logging.getLogger(__name__)

debug_bp = Blueprint("debug", __name__, url_prefix="/api/debug")


@debug_bp.route("/schema", methods=["GET"])
def inspect_schema():
    """Inspect database schema and return table information."""
    try:
        # Get database manager from current app context
        db_manager = current_app.config.get("DB_MANAGER")
        
        if not db_manager or not hasattr(db_manager, 'connection_manager'):
            return jsonify({
                "success": False,
                "error": "Database manager not available"
            }), 500

        schema_info = {}
        
        with db_manager.connection_manager.get_session_context() as session:
            # Get all tables
            tables_query = """
                SELECT 
                    table_name,
                    table_type
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """
            
            result = session.execute(text(tables_query))
            tables = result.fetchall()
            
            schema_info["tables"] = []
            
            for table in tables:
                table_name = table[0]
                table_type = table[1]
                
                # Get column information for each table
                columns_query = """
                    SELECT 
                        column_name,
                        data_type,
                        is_nullable,
                        column_default
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = :table_name
                    ORDER BY ordinal_position
                """
                
                columns_result = session.execute(text(columns_query), {"table_name": table_name})
                columns = columns_result.fetchall()
                
                table_info = {
                    "name": table_name,
                    "type": table_type,
                    "columns": [
                        {
                            "name": col[0],
                            "type": col[1],
                            "nullable": col[2] == "YES",
                            "default": col[3]
                        }
                        for col in columns
                    ]
                }
                
                # Get row count for each table
                try:
                    count_query = f'SELECT COUNT(*) FROM "{table_name}"'
                    count_result = session.execute(text(count_query))
                    row_count = count_result.scalar()
                    table_info["row_count"] = row_count
                except Exception as e:
                    table_info["row_count"] = f"Error: {str(e)}"
                
                schema_info["tables"].append(table_info)
            
            # Get database version
            version_query = "SELECT version()"
            version_result = session.execute(text(version_query))
            schema_info["database_version"] = version_result.scalar()
            
        return jsonify({
            "success": True,
            "data": schema_info
        })
        
    except Exception as e:
        logger.exception("Error inspecting database schema")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@debug_bp.route("/marketplace-tables", methods=["GET"])
def inspect_marketplace_tables():
    """Specifically inspect marketplace-related tables."""
    try:
        db_manager = current_app.config.get("DB_MANAGER")
        
        if not db_manager or not hasattr(db_manager, 'connection_manager'):
            return jsonify({
                "success": False,
                "error": "Database manager not available"
            }), 500

        marketplace_info = {}
        
        with db_manager.connection_manager.get_session_context() as session:
            # Check for marketplace table
            marketplace_query = """
                SELECT 
                    table_name,
                    column_name,
                    data_type,
                    is_nullable
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name ILIKE '%marketplace%'
                ORDER BY table_name, ordinal_position
            """
            
            result = session.execute(text(marketplace_query))
            columns = result.fetchall()
            
            marketplace_info["marketplace_tables"] = {}
            
            for col in columns:
                table_name = col[0]
                column_name = col[1]
                data_type = col[2]
                is_nullable = col[3] == "YES"
                
                if table_name not in marketplace_info["marketplace_tables"]:
                    marketplace_info["marketplace_tables"][table_name] = []
                
                marketplace_info["marketplace_tables"][table_name].append({
                    "column": column_name,
                    "type": data_type,
                    "nullable": is_nullable
                })
            
            # Check for any table with 'listings' in the name
            listings_query = """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name ILIKE '%listing%'
            """
            
            listings_result = session.execute(text(listings_query))
            listings_tables = [row[0] for row in listings_result.fetchall()]
            marketplace_info["listings_tables"] = listings_tables
            
        return jsonify({
            "success": True,
            "data": marketplace_info
        })
        
    except Exception as e:
        logger.exception("Error inspecting marketplace tables")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
