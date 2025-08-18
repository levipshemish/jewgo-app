#!/usr/bin/env python3
"""Fix Malformed JSON Data in Database.
====================================

This script identifies and fixes malformed JSON data in the database
that's causing parsing errors in database_manager_v4.py.

The script will:
1. Scan for malformed JSON in specials, google_reviews, and review.images fields
2. Attempt to fix common JSON formatting issues
3. Log all changes for audit purposes
4. Provide a summary of fixes applied

Author: JewGo Development Team
Version: 1.0
"""

import json
import os
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

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


def is_valid_json(json_str: str) -> bool:
    """Check if a string is valid JSON."""
    if not json_str or not isinstance(json_str, str):
        return False
    
    try:
        json.loads(json_str)
        return True
    except (json.JSONDecodeError, TypeError):
        return False


def fix_common_json_issues(json_str: str) -> Optional[str]:
    """Attempt to fix common JSON formatting issues."""
    if not json_str or not isinstance(json_str, str):
        return None
    
    # Remove leading/trailing whitespace
    json_str = json_str.strip()
    
    # If it's already valid JSON, return as is
    if is_valid_json(json_str):
        return json_str
    
    # Common fixes for malformed JSON
    
    # Fix 1: Add quotes around unquoted property names
    # Pattern: {property: value} -> {"property": value}
    import re
    
    # Fix unquoted property names
    json_str = re.sub(r'(\w+):', r'"\1":', json_str)
    
    # Fix single quotes to double quotes
    json_str = json_str.replace("'", '"')
    
    # Fix trailing commas
    json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
    
    # Try to parse again
    try:
        json.loads(json_str)
        return json_str
    except json.JSONDecodeError:
        pass
    
    # Fix 2: Handle array-like strings that might be comma-separated
    if json_str.startswith('[') and json_str.endswith(']'):
        # Try to fix array elements
        try:
            # Remove brackets and split by comma
            content = json_str[1:-1].strip()
            if content:
                # Try to parse as individual elements
                elements = []
                for element in content.split(','):
                    element = element.strip()
                    if element:
                        # Try to parse each element
                        try:
                            parsed = json.loads(element)
                            elements.append(parsed)
                        except json.JSONDecodeError:
                            # If it's a string, wrap in quotes
                            if not element.startswith('"'):
                                element = f'"{element}"'
                            try:
                                parsed = json.loads(element)
                                elements.append(parsed)
                            except json.JSONDecodeError:
                                # Skip invalid elements
                                continue
                
                if elements:
                    return json.dumps(elements)
        except Exception:
            pass
    
    # Fix 3: Handle object-like strings
    if json_str.startswith('{') and json_str.endswith('}'):
        try:
            # Try to fix common object issues
            # Replace single quotes with double quotes
            json_str = json_str.replace("'", '"')
            
            # Try to parse
            json.loads(json_str)
            return json_str
        except json.JSONDecodeError:
            pass
    
    # If all fixes fail, return None
    return None


def scan_and_fix_restaurant_json_fields(db_manager: DatabaseManager) -> Dict[str, int]:
    """Scan and fix malformed JSON in restaurant fields."""
    fixes_applied = {
        'specials': 0,
        'google_reviews': 0,
        'total_restaurants_checked': 0
    }
    
    try:
        # Get all restaurants as dictionaries
        restaurants = db_manager.get_restaurants(limit=10000, as_dict=True)
        fixes_applied['total_restaurants_checked'] = len(restaurants)
        
        logger.info(f"Scanning {len(restaurants)} restaurants for malformed JSON")
        
        for restaurant in restaurants:
            restaurant_id = restaurant.get('id')
            if not restaurant_id:
                continue
            
            # Check and fix specials field
            specials = restaurant.get('specials')
            if specials and not is_valid_json(specials):
                fixed_specials = fix_common_json_issues(specials)
                if fixed_specials:
                    try:
                        # Update the database
                        db_manager.restaurant_repo.update_restaurant(
                            restaurant_id, 
                            {'specials': fixed_specials}
                        )
                        fixes_applied['specials'] += 1
                        logger.info(f"Fixed specials JSON for restaurant {restaurant_id}")
                    except Exception as e:
                        logger.error(f"Failed to update specials for restaurant {restaurant_id}: {e}")
                else:
                    logger.warning(f"Could not fix specials JSON for restaurant {restaurant_id}: {specials[:100]}...")
            
            # Check and fix google_reviews field
            google_reviews = restaurant.get('google_reviews')
            if google_reviews and not is_valid_json(google_reviews):
                fixed_reviews = fix_common_json_issues(google_reviews)
                if fixed_reviews:
                    try:
                        # Update the database
                        db_manager.restaurant_repo.update_restaurant(
                            restaurant_id, 
                            {'google_reviews': fixed_reviews}
                        )
                        fixes_applied['google_reviews'] += 1
                        logger.info(f"Fixed google_reviews JSON for restaurant {restaurant_id}")
                    except Exception as e:
                        logger.error(f"Failed to update google_reviews for restaurant {restaurant_id}: {e}")
                else:
                    logger.warning(f"Could not fix google_reviews JSON for restaurant {restaurant_id}: {google_reviews[:100]}...")
        
        return fixes_applied
        
    except Exception as e:
        logger.exception(f"Error scanning restaurant JSON fields: {e}")
        return fixes_applied


def scan_and_fix_review_json_fields(db_manager: DatabaseManager) -> Dict[str, int]:
    """Scan and fix malformed JSON in review fields."""
    fixes_applied = {
        'review_images': 0,
        'total_reviews_checked': 0
    }
    
    try:
        # Get all reviews as dictionaries
        reviews = db_manager.get_reviews(limit=10000)
        fixes_applied['total_reviews_checked'] = len(reviews)
        
        logger.info(f"Scanning {len(reviews)} reviews for malformed JSON")
        
        for review in reviews:
            review_id = review.get('id')
            if not review_id:
                continue
            
            # Check and fix images field
            images = review.get('images')
            if images and not is_valid_json(images):
                fixed_images = fix_common_json_issues(images)
                if fixed_images:
                    try:
                        # Update the database
                        db_manager.review_repo.update_review(
                            review_id, 
                            {'images': fixed_images}
                        )
                        fixes_applied['review_images'] += 1
                        logger.info(f"Fixed images JSON for review {review_id}")
                    except Exception as e:
                        logger.error(f"Failed to update images for review {review_id}: {e}")
                else:
                    logger.warning(f"Could not fix images JSON for review {review_id}: {images[:100]}...")
        
        return fixes_applied
        
    except Exception as e:
        logger.exception(f"Error scanning review JSON fields: {e}")
        return fixes_applied


def main():
    """Main function to run the JSON fix script."""
    logger.info("Starting JSON data fix script")
    
    try:
        # Initialize database manager
        db_manager = DatabaseManager()
        
        # Connect to the database
        db_manager.connection_manager.connect()
        
        # Scan and fix restaurant JSON fields
        logger.info("=== Scanning Restaurant JSON Fields ===")
        restaurant_fixes = scan_and_fix_restaurant_json_fields(db_manager)
        
        # Scan and fix review JSON fields
        logger.info("=== Scanning Review JSON Fields ===")
        review_fixes = scan_and_fix_review_json_fields(db_manager)
        
        # Print summary
        logger.info("=== JSON Fix Summary ===")
        logger.info(f"Restaurants checked: {restaurant_fixes['total_restaurants_checked']}")
        logger.info(f"Specials fixed: {restaurant_fixes['specials']}")
        logger.info(f"Google reviews fixed: {restaurant_fixes['google_reviews']}")
        logger.info(f"Reviews checked: {review_fixes['total_reviews_checked']}")
        logger.info(f"Review images fixed: {review_fixes['review_images']}")
        
        total_fixes = (
            restaurant_fixes['specials'] + 
            restaurant_fixes['google_reviews'] + 
            review_fixes['review_images']
        )
        
        logger.info(f"Total JSON fixes applied: {total_fixes}")
        
        if total_fixes > 0:
            logger.info("✅ JSON data has been fixed successfully")
        else:
            logger.info("ℹ️ No malformed JSON data found")
        
    except Exception as e:
        logger.exception(f"Error running JSON fix script: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
