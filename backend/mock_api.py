from flask import Blueprint, jsonify
import json

mock_bp = Blueprint('mock_api', __name__)

@mock_bp.route('/api/v4/marketplace/listings', methods=['GET'])
def mock_marketplace_listings():
    """Mock marketplace listings endpoint"""
    sample_data = {
        "success": True,
        "data": [
            {
                "id": 1,
                "title": "Kosher Challah Bread",
                "description": "Fresh homemade challah bread, perfect for Shabbat",
                "price": 8.99,
                "category": "Baked Goods",
                "seller": "Sarah's Kitchen",
                "location": "Miami, FL",
                "image_url": "https://example.com/challah.jpg",
                "created_at": "2025-08-21T04:00:00Z"
            },
            {
                "id": 2,
                "title": "Handmade Kippah",
                "description": "Beautiful handcrafted kippah made from silk",
                "price": 15.00,
                "category": "Accessories",
                "seller": "Jewish Crafts",
                "location": "Miami, FL",
                "image_url": "https://example.com/kippah.jpg",
                "created_at": "2025-08-21T03:30:00Z"
            },
            {
                "id": 3,
                "title": "Shabbat Candles Set",
                "description": "Traditional Shabbat candles, set of 6",
                "price": 12.50,
                "category": "Home & Garden",
                "seller": "Jewish Traditions",
                "location": "Miami, FL",
                "image_url": "https://example.com/candles.jpg",
                "created_at": "2025-08-21T03:00:00Z"
            }
        ],
        "total": 3,
        "page": 1,
        "per_page": 10
    }
    return jsonify(sample_data)

@mock_bp.route('/api/v4/marketplace/categories', methods=['GET'])
def mock_marketplace_categories():
    """Mock marketplace categories endpoint"""
    sample_categories = {
        "success": True,
        "data": [
            {"id": 1, "name": "Baked Goods", "description": "Fresh breads and pastries"},
            {"id": 2, "name": "Accessories", "description": "Jewish accessories and clothing"},
            {"id": 3, "name": "Home & Garden", "description": "Home decor and garden items"},
            {"id": 4, "name": "Books", "description": "Jewish books and literature"},
            {"id": 5, "name": "Food & Beverages", "description": "Kosher food and drinks"}
        ]
    }
    return jsonify(sample_categories)

@mock_bp.route('/api/v4/restaurants', methods=['GET'])
def mock_restaurants():
    """Mock restaurants endpoint"""
    sample_restaurants = {
        "success": True,
        "data": [
            {
                "id": 1,
                "name": "Kosher Deli Miami",
                "description": "Authentic kosher deli with traditional Jewish cuisine",
                "address": "123 Main St, Miami, FL",
                "phone": "(305) 555-0123",
                "rating": 4.5,
                "cuisine": "Jewish Deli",
                "kosher_certification": "OU",
                "image_url": "https://example.com/deli.jpg"
            },
            {
                "id": 2,
                "name": "Shalom Restaurant",
                "description": "Modern Israeli cuisine in a warm, welcoming atmosphere",
                "address": "456 Ocean Dr, Miami, FL",
                "phone": "(305) 555-0456",
                "rating": 4.2,
                "cuisine": "Israeli",
                "kosher_certification": "Star-K",
                "image_url": "https://example.com/shalom.jpg"
            }
        ],
        "total": 2,
        "page": 1,
        "per_page": 10
    }
    return jsonify(sample_restaurants)

@mock_bp.route('/api/v4/health', methods=['GET'])
def mock_health():
    """Mock health endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "jewgo-backend-mock",
        "version": "4.1",
        "database": "mock",
        "timestamp": "2025-08-21T04:00:00Z"
    })
