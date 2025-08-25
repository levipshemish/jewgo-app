#!/usr/bin/env python3
"""Test script for marketplace categories endpoint."""

import json
import sys
import os

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from routes.api_v4 import get_marketplace_categories

def test_marketplace_categories():
    """Test the marketplace categories endpoint."""
    try:
        # Mock Flask request context
        from flask import Flask
        app = Flask(__name__)
        
        with app.test_request_context():
            # Call the endpoint function
            response = get_marketplace_categories()
            
            # Convert response to dict
            if hasattr(response, 'json'):
                data = response.json
            else:
                data = response
            
            print("✅ Marketplace categories endpoint test successful!")
            print(f"Response structure: {type(data)}")
            print(f"Success: {data.get('success', 'N/A')}")
            print(f"Data type: {type(data.get('data', 'N/A'))}")
            
            if data.get('data'):
                categories = data['data']
                print(f"Number of categories: {len(categories)}")
                for i, category in enumerate(categories[:3]):  # Show first 3
                    print(f"  Category {i+1}: {category.get('name', 'N/A')} (ID: {category.get('id', 'N/A')})")
                    subcategories = category.get('subcategories', [])
                    print(f"    Subcategories: {len(subcategories)}")
            
            return True
            
    except Exception as e:
        print(f"❌ Error testing marketplace categories: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_marketplace_categories()
    sys.exit(0 if success else 1)
