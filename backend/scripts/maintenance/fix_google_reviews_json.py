#!/usr/bin/env python3
"""Fix Google Reviews JSON Formatting Issues.
==========================================

This script specifically targets the malformed JSON in the google_reviews field
that contains unquoted property names and other formatting issues.

The script will:
1. Identify restaurants with malformed google_reviews JSON
2. Fix the specific formatting issues (unquoted property names, etc.)
3. Update the database with properly formatted JSON
4. Log all changes for audit purposes

Author: JewGo Development Team
Version: 1.0
"""

import json
import os
import sys
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))
except ImportError:
    # If python-dotenv is not available, try to load .env manually
    env_file = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value

from database.database_manager_v4 import DatabaseManager
from utils.logging_config import get_logger

logger = get_logger(__name__)


def fix_google_reviews_json(json_str: str) -> Optional[str]:
    """Fix specific formatting issues in Google reviews JSON."""
    if not json_str or not isinstance(json_str, str):
        return None
    
    # Remove leading/trailing whitespace
    json_str = json_str.strip()
    
    # If it's already valid JSON, return as is
    try:
        json.loads(json_str)
        return json_str
    except json.JSONDecodeError:
        pass
    
    # Fix 1: Add quotes around unquoted property names
    # Pattern: {property: value} -> {"property": value}
    # This handles the specific case we found: {author: 'RS', rating: 5, text: '...'}
    
    # First, let's try to fix the most common pattern
    # Replace unquoted property names with quoted ones
    json_str = re.sub(r'(\w+):', r'"\1":', json_str)
    
    # Fix single quotes to double quotes for string values
    json_str = json_str.replace("'", '"')
    
    # Fix trailing commas
    json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
    
    # Try to parse again
    try:
        json.loads(json_str)
        return json_str
    except json.JSONDecodeError:
        pass
    
    # Fix 2: Handle specific Google reviews format
    # The data appears to be a list of review objects
    if json_str.startswith('[') and json_str.endswith(']'):
        try:
            # Try to fix each object in the array
            # Remove brackets and split by object boundaries
            content = json_str[1:-1].strip()
            
            # Split by object boundaries (look for closing braces followed by commas or end)
            objects = re.split(r'},?\s*', content)
            fixed_objects = []
            
            for obj in objects:
                if not obj.strip():
                    continue
                
                # Add closing brace if missing
                if not obj.strip().endswith('}'):
                    obj = obj.strip() + '}'
                
                # Fix property names
                obj = re.sub(r'(\w+):', r'"\1":', obj)
                obj = obj.replace("'", '"')
                
                # Try to parse the object
                try:
                    parsed_obj = json.loads(obj)
                    fixed_objects.append(parsed_obj)
                except json.JSONDecodeError:
                    # If we can't parse it, skip this object
                    logger.warning(f"Could not parse object: {obj[:100]}...")
                    continue
            
            if fixed_objects:
                return json.dumps(fixed_objects)
        except Exception as e:
            logger.warning(f"Error fixing array format: {e}")
    
    # If all fixes fail, return None
    return None


def scan_and_fix_google_reviews(db_manager: DatabaseManager) -> Dict[str, int]:
    """Scan and fix malformed Google reviews JSON."""
    fixes_applied = {
        'google_reviews_fixed': 0,
        'total_restaurants_checked': 0,
        'restaurants_with_issues': 0
    }
    
    try:
        # Get all restaurants as dictionaries
        restaurants = db_manager.get_restaurants(limit=10000, as_dict=True)
        fixes_applied['total_restaurants_checked'] = len(restaurants)
        
        logger.info(f"Scanning {len(restaurants)} restaurants for malformed Google reviews JSON")
        
        for restaurant in restaurants:
            restaurant_id = restaurant.get('id')
            if not restaurant_id:
                continue
            
            # Check google_reviews field
            google_reviews = restaurant.get('google_reviews')
            if not google_reviews:
                continue
            
            # Check if it's valid JSON
            try:
                json.loads(google_reviews)
                # If it's valid, skip
                continue
            except (json.JSONDecodeError, TypeError):
                # Found malformed JSON
                fixes_applied['restaurants_with_issues'] += 1
                
                # Try to fix it
                fixed_reviews = fix_google_reviews_json(google_reviews)
                if fixed_reviews:
                    try:
                        # Update the database
                        db_manager.restaurant_repo.update_restaurant(
                            restaurant_id, 
                            {'google_reviews': fixed_reviews}
                        )
                        fixes_applied['google_reviews_fixed'] += 1
                        logger.info(f"Fixed Google reviews JSON for restaurant {restaurant_id}")
                    except Exception as e:
                        logger.error(f"Failed to update Google reviews for restaurant {restaurant_id}: {e}")
                else:
                    logger.warning(f"Could not fix Google reviews JSON for restaurant {restaurant_id}: {google_reviews[:100]}...")
        
        return fixes_applied
        
    except Exception as e:
        logger.exception(f"Error scanning Google reviews JSON: {e}")
        return fixes_applied


def main():
    """Main function to run the Google reviews JSON fix script."""
    logger.info("Starting Google reviews JSON fix script")
    
    try:
        # Initialize database manager
        db_manager = DatabaseManager()
        
        # Connect to the database
        db_manager.connection_manager.connect()
        
        # Scan and fix Google reviews JSON
        logger.info("=== Scanning Google Reviews JSON ===")
        fixes = scan_and_fix_google_reviews(db_manager)
        
        # Print summary
        logger.info("=== Google Reviews JSON Fix Summary ===")
        logger.info(f"Restaurants checked: {fixes['total_restaurants_checked']}")
        logger.info(f"Restaurants with malformed JSON: {fixes['restaurants_with_issues']}")
        logger.info(f"Google reviews fixed: {fixes['google_reviews_fixed']}")
        
        if fixes['google_reviews_fixed'] > 0:
            logger.info("✅ Google reviews JSON has been fixed successfully")
        else:
            logger.info("ℹ️ No Google reviews JSON issues found or could be fixed")
        
    except Exception as e:
        logger.exception(f"Error running Google reviews JSON fix script: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
