#!/usr/bin/env python3
"""Simple API v4 routes for testing."""

from flask import Blueprint, jsonify
from datetime import datetime, timezone

# Create a simple blueprint
api_v4_simple = Blueprint("api_v4_simple", __name__, url_prefix="/api/v4")

@api_v4_simple.route("/test", methods=["GET"])
def test():
    """Simple test endpoint."""
    return jsonify({
        "success": True,
        "message": "API v4 simple test endpoint is working",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

@api_v4_simple.route("/marketplace/categories", methods=["GET"])
def marketplace_categories():
    """Simple marketplace categories endpoint."""
    return jsonify({
        "success": True,
        "data": {
            "categories": [],
            "subcategories": []
        },
        "message": "Simple marketplace categories endpoint"
    })
