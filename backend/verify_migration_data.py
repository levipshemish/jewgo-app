#!/usr/bin/env python3
"""
Migration Data Verification Script
=================================

This script verifies that all essential data has been successfully migrated
from Neon to Oracle Cloud PostgreSQL.
"""

import os
import sys
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def connect_to_oracle_db():
    """Connect to Oracle Cloud PostgreSQL database."""
    oracle_url = "postgresql://app_user:Jewgo123@141.148.50.111:5432/app_db?sslmode=require"
    
    try:
        engine = create_engine(
            oracle_url,
            echo=False,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 30}
        )
        return engine
    except Exception as e:
        logger.error(f"Failed to connect to Oracle Cloud database: {e}")
        return None

def get_table_row_counts(engine):
    """Get row counts for all tables in the database."""
    tables = [
        'restaurants',
        'restaurant_images', 
        'reviews',
        'florida_synagogues',
        'google_places_data',
        'marketplace',
        'marketplace_subcategories',
        'review_flags',
        'users',
        'accounts',
        'sessions',
        'verification_tokens'
    ]
    
    counts = {}
    
    for table in tables:
        try:
            with engine.connect() as conn:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                counts[table] = count
                logger.info(f"✅ {table}: {count} rows")
        except SQLAlchemyError as e:
            logger.warning(f"⚠️  {table}: Error - {e}")
            counts[table] = 0
    
    return counts

def verify_restaurant_data(engine):
    """Verify restaurant data integrity."""
    logger.info("\n🔍 Verifying Restaurant Data...")
    
    try:
        with engine.connect() as conn:
            # Check total restaurants
            result = conn.execute(text("SELECT COUNT(*) FROM restaurants"))
            total_restaurants = result.scalar()
            logger.info(f"   Total restaurants: {total_restaurants}")
            
            # Check restaurants with images
            result = conn.execute(text("""
                SELECT COUNT(DISTINCT r.id) 
                FROM restaurants r 
                JOIN restaurant_images ri ON r.id = ri.restaurant_id
            """))
            restaurants_with_images = result.scalar()
            logger.info(f"   Restaurants with images: {restaurants_with_images}")
            
            # Check sample restaurant data
            result = conn.execute(text("""
                SELECT id, name, city, state, kosher_certification 
                FROM restaurants 
                LIMIT 5
            """))
            sample_restaurants = result.fetchall()
            logger.info("   Sample restaurants:")
            for row in sample_restaurants:
                logger.info(f"     - {row[0]}: {row[1]} ({row[2]}, {row[3]}) - {row[4]}")
            
            return total_restaurants > 0
            
    except SQLAlchemyError as e:
        logger.error(f"❌ Error verifying restaurant data: {e}")
        return False

def verify_image_data(engine):
    """Verify restaurant image data integrity."""
    logger.info("\n🖼️  Verifying Image Data...")
    
    try:
        with engine.connect() as conn:
            # Check total images
            result = conn.execute(text("SELECT COUNT(*) FROM restaurant_images"))
            total_images = result.scalar()
            logger.info(f"   Total images: {total_images}")
            
            # Check images by type
            result = conn.execute(text("""
                SELECT image_type, COUNT(*) 
                FROM restaurant_images 
                GROUP BY image_type
            """))
            image_types = result.fetchall()
            logger.info("   Images by type:")
            for row in image_types:
                logger.info(f"     - {row[0]}: {row[1]}")
            
            return total_images > 0
            
    except SQLAlchemyError as e:
        logger.error(f"❌ Error verifying image data: {e}")
        return False

def verify_synagogue_data(engine):
    """Verify synagogue data integrity."""
    logger.info("\n🕍 Verifying Synagogue Data...")
    
    try:
        with engine.connect() as conn:
            # Check total synagogues
            result = conn.execute(text("SELECT COUNT(*) FROM florida_synagogues"))
            total_synagogues = result.scalar()
            logger.info(f"   Total synagogues: {total_synagogues}")
            
            # Check sample synagogue data
            result = conn.execute(text("""
                SELECT name, city, state, denomination 
                FROM florida_synagogues 
                LIMIT 5
            """))
            sample_synagogues = result.fetchall()
            logger.info("   Sample synagogues:")
            for row in sample_synagogues:
                logger.info(f"     - {row[0]} ({row[1]}, {row[2]}) - {row[3]}")
            
            return total_synagogues > 0
            
    except SQLAlchemyError as e:
        logger.error(f"❌ Error verifying synagogue data: {e}")
        return False

def verify_marketplace_data(engine):
    """Verify marketplace data integrity."""
    logger.info("\n🛒 Verifying Marketplace Data...")
    
    try:
        with engine.connect() as conn:
            # Check marketplace items
            result = conn.execute(text("SELECT COUNT(*) FROM marketplace"))
            total_items = result.scalar()
            logger.info(f"   Total marketplace items: {total_items}")
            
            # Check categories
            result = conn.execute(text("SELECT COUNT(*) FROM marketplace_subcategories"))
            total_categories = result.scalar()
            logger.info(f"   Total categories: {total_categories}")
            
            # Check sample marketplace data
            result = conn.execute(text("""
                SELECT title, price, category 
                FROM marketplace 
                LIMIT 3
            """))
            sample_items = result.fetchall()
            logger.info("   Sample marketplace items:")
            for row in sample_items:
                logger.info(f"     - {row[0]} - ${row[1]} ({row[2]})")
            
            return total_items > 0
            
    except SQLAlchemyError as e:
        logger.error(f"❌ Error verifying marketplace data: {e}")
        return False

def verify_review_data(engine):
    """Verify review data integrity."""
    logger.info("\n⭐ Verifying Review Data...")
    
    try:
        with engine.connect() as conn:
            # Check total reviews
            result = conn.execute(text("SELECT COUNT(*) FROM reviews"))
            total_reviews = result.scalar()
            logger.info(f"   Total reviews: {total_reviews}")
            
            # Check review flags
            result = conn.execute(text("SELECT COUNT(*) FROM review_flags"))
            total_flags = result.scalar()
            logger.info(f"   Total review flags: {total_flags}")
            
            return True
            
    except SQLAlchemyError as e:
        logger.error(f"❌ Error verifying review data: {e}")
        return False

def verify_google_places_data(engine):
    """Verify Google Places data integrity."""
    logger.info("\n🗺️  Verifying Google Places Data...")
    
    try:
        with engine.connect() as conn:
            # Check total places
            result = conn.execute(text("SELECT COUNT(*) FROM google_places_data"))
            total_places = result.scalar()
            logger.info(f"   Total Google Places entries: {total_places}")
            
            # Check sample data
            result = conn.execute(text("""
                SELECT name, place_id, types 
                FROM google_places_data 
                LIMIT 3
            """))
            sample_places = result.fetchall()
            logger.info("   Sample Google Places data:")
            for row in sample_places:
                logger.info(f"     - {row[0]} ({row[1]}) - {row[2]}")
            
            return total_places > 0
            
    except SQLAlchemyError as e:
        logger.error(f"❌ Error verifying Google Places data: {e}")
        return False

def main():
    """Main verification function."""
    print("🔍 Oracle Cloud PostgreSQL Migration Data Verification")
    print("=" * 60)
    
    # Connect to Oracle Cloud database
    engine = connect_to_oracle_db()
    if not engine:
        print("❌ Failed to connect to Oracle Cloud database")
        return False
    
    print("✅ Connected to Oracle Cloud PostgreSQL database")
    
    # Get table row counts
    print("\n📊 Table Row Counts:")
    print("-" * 30)
    counts = get_table_row_counts(engine)
    
    # Verify essential data
    verification_results = []
    
    verification_results.append(verify_restaurant_data(engine))
    verification_results.append(verify_image_data(engine))
    verification_results.append(verify_synagogue_data(engine))
    verification_results.append(verify_marketplace_data(engine))
    verification_results.append(verify_review_data(engine))
    verification_results.append(verify_google_places_data(engine))
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 MIGRATION VERIFICATION SUMMARY")
    print("=" * 60)
    
    total_rows = sum(counts.values())
    print(f"📊 Total rows across all tables: {total_rows}")
    
    essential_tables = ['restaurants', 'restaurant_images', 'florida_synagogues', 'marketplace']
    essential_data_present = all(counts.get(table, 0) > 0 for table in essential_tables)
    
    if essential_data_present:
        print("✅ Essential data is present in Oracle Cloud database")
    else:
        print("❌ Some essential data is missing")
    
    if all(verification_results):
        print("✅ All data verification checks passed")
    else:
        print("⚠️  Some verification checks failed")
    
    print("\n🎯 Migration Status:")
    if essential_data_present and all(verification_results):
        print("✅ SUCCESS: Oracle Cloud database is ready for production use!")
        print("   You can now update your Render DATABASE_URL to use Oracle Cloud")
    else:
        print("❌ ISSUES: Some data may be missing or corrupted")
        print("   Please review the verification results above")
    
    return essential_data_present and all(verification_results)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
