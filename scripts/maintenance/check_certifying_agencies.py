#!/usr/bin/env python3
"""
Check Certifying Agencies
========================

This script checks the database for certifying agencies that are not "Kosher Miami" or "ORB".

Author: JewGo Development Team
Version: 1.0
Updated: 2025
"""

import os
import sys
from sqlalchemy import text
from collections import Counter
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add backend to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

from utils.database_connection_manager import get_db_manager
from utils.logging_config import get_logger

logger = get_logger(__name__)


def check_certifying_agencies():
    """Check database for certifying agencies that are not Kosher Miami or ORB."""
    
    logger.info("Starting certifying agency check")
    
    try:
        # Get unified database connection manager
        db_manager = get_db_manager()
        
        # Connect to database
        if not db_manager.connect():
            logger.error("Failed to connect to database")
            return False

        with db_manager.session_scope() as session:
            # Get all unique certifying agencies
            result = session.execute(
                text("""
                    SELECT DISTINCT certifying_agency, COUNT(*) as count
                    FROM restaurants 
                    WHERE certifying_agency IS NOT NULL 
                    AND certifying_agency != ''
                    GROUP BY certifying_agency
                    ORDER BY count DESC
                """)
            )
            
            agencies = result.fetchall()
            
            logger.info(f"Found {len(agencies)} unique certifying agencies")
            
            # Define expected agencies
            expected_agencies = {"ORB", "Kosher Miami", "N/A"}
            
            # Check for unexpected agencies
            unexpected_agencies = []
            total_restaurants = 0
            
            print("\n" + "="*60)
            print("CERTIFYING AGENCY ANALYSIS")
            print("="*60)
            
            for agency, count in agencies:
                total_restaurants += count
                
                if agency not in expected_agencies:
                    unexpected_agencies.append((agency, count))
                    print(f"⚠️  UNEXPECTED: {agency} - {count} restaurants")
                else:
                    print(f"✅ EXPECTED: {agency} - {count} restaurants")
            
            print("\n" + "-"*60)
            print(f"Total restaurants: {total_restaurants}")
            print(f"Expected agencies: {len(agencies) - len(unexpected_agencies)}")
            print(f"Unexpected agencies: {len(unexpected_agencies)}")
            
            if unexpected_agencies:
                print("\n" + "="*60)
                print("DETAILED ANALYSIS OF UNEXPECTED AGENCIES")
                print("="*60)
                
                for agency, count in unexpected_agencies:
                    print(f"\n🔍 Agency: {agency} ({count} restaurants)")
                    
                    # Get details for this agency
                    details_result = session.execute(
                        text("""
                            SELECT id, name, city, state, kosher_category, 
                                   created_at, updated_at
                            FROM restaurants 
                            WHERE certifying_agency = :agency
                            ORDER BY name
                        """),
                        {"agency": agency}
                    )
                    
                    details = details_result.fetchall()
                    
                    for detail in details:
                        restaurant_id, name, city, state, kosher_category, created_at, updated_at = detail
                        print(f"  - {name} (ID: {restaurant_id})")
                        print(f"    Location: {city}, {state}")
                        print(f"    Category: {kosher_category}")
                        print(f"    Created: {created_at}")
                        print(f"    Updated: {updated_at}")
                        print()
                
                # Provide recommendations
                print("\n" + "="*60)
                print("RECOMMENDATIONS")
                print("="*60)
                
                for agency, count in unexpected_agencies:
                    if agency.lower() in ['all items', 'available', 'yes', 'no']:
                        print(f"• {agency} appears to be a data import error - should be 'ORB' or 'Kosher Miami'")
                    elif agency.lower() in ['unknown', 'n/a', 'none']:
                        print(f"• {agency} should be standardized to 'N/A'")
                    else:
                        print(f"• {agency} may be a valid agency - verify if this should be kept or corrected")
                
                print("\n• Consider running cleanup script to standardize agency names")
                print("• Review data import processes to prevent future inconsistencies")
                
            else:
                print("\n✅ All certifying agencies are as expected!")
                print("• No unexpected agencies found")
                print("• Database is clean and consistent")
            
            print("\n" + "="*60)
            
        logger.info("Certifying agency check completed successfully")
        return True

    except Exception as e:
        logger.exception("Error in certifying agency check", error=str(e))
        return False


def get_agency_statistics():
    """Get detailed statistics about certifying agencies."""
    
    try:
        db_manager = get_db_manager()
        
        if not db_manager.connect():
            logger.error("Failed to connect to database")
            return False

        with db_manager.session_scope() as session:
            # Get statistics by agency and kosher category
            result = session.execute(
                text("""
                    SELECT 
                        certifying_agency,
                        kosher_category,
                        COUNT(*) as count
                    FROM restaurants 
                    WHERE certifying_agency IS NOT NULL 
                    AND certifying_agency != ''
                    GROUP BY certifying_agency, kosher_category
                    ORDER BY certifying_agency, count DESC
                """)
            )
            
            stats = result.fetchall()
            
            print("\n" + "="*60)
            print("DETAILED AGENCY STATISTICS")
            print("="*60)
            
            current_agency = None
            for agency, category, count in stats:
                if agency != current_agency:
                    current_agency = agency
                    print(f"\n📊 {agency}:")
                
                print(f"  - {category}: {count} restaurants")
            
            print("\n" + "="*60)
            
        return True

    except Exception as e:
        logger.exception("Error getting agency statistics", error=str(e))
        return False


if __name__ == "__main__":
    print("🔍 Checking certifying agencies in database...")
    
    success = check_certifying_agencies()
    
    if success:
        get_agency_statistics()
        print("\n✅ Check completed successfully!")
    else:
        print("\n❌ Check failed!")
        sys.exit(1)
