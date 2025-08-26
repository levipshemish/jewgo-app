#!/usr/bin/env python3
"""
Detailed Certifying Agency Check
===============================

This script performs a detailed check of certifying agencies in the database,
looking for any variations, typos, or edge cases that might have been missed.

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


def detailed_certifying_agency_check():
    """Perform detailed analysis of certifying agencies."""
    
    logger.info("Starting detailed certifying agency check")
    
    try:
        # Get unified database connection manager
        db_manager = get_db_manager()
        
        # Connect to database
        if not db_manager.connect():
            logger.error("Failed to connect to database")
            return False

        with db_manager.session_scope() as session:
            print("\n" + "="*80)
            print("DETAILED CERTIFYING AGENCY ANALYSIS")
            print("="*80)
            
            # 1. Get all unique certifying agencies with exact counts
            result = session.execute(
                text("""
                    SELECT certifying_agency, COUNT(*) as count
                    FROM restaurants 
                    WHERE certifying_agency IS NOT NULL 
                    AND certifying_agency != ''
                    GROUP BY certifying_agency
                    ORDER BY certifying_agency
                """)
            )
            
            agencies = result.fetchall()
            
            print(f"\n📊 Found {len(agencies)} unique certifying agencies:")
            print("-" * 50)
            
            for agency, count in agencies:
                print(f"  '{agency}' - {count} restaurants")
            
            # 2. Check for case variations
            print(f"\n🔍 Checking for case variations...")
            result = session.execute(
                text("""
                    SELECT LOWER(certifying_agency) as lower_agency, 
                           COUNT(*) as count,
                           STRING_AGG(DISTINCT certifying_agency, ', ') as variations
                    FROM restaurants 
                    WHERE certifying_agency IS NOT NULL 
                    AND certifying_agency != ''
                    GROUP BY LOWER(certifying_agency)
                    HAVING COUNT(DISTINCT certifying_agency) > 1
                    ORDER BY lower_agency
                """)
            )
            
            case_variations = result.fetchall()
            
            if case_variations:
                print("⚠️  Found case variations:")
                for lower_agency, count, variations in case_variations:
                    print(f"  '{lower_agency}' has variations: {variations} ({count} total)")
            else:
                print("✅ No case variations found")
            
            # 3. Check for leading/trailing whitespace
            print(f"\n🔍 Checking for whitespace issues...")
            result = session.execute(
                text("""
                    SELECT certifying_agency, COUNT(*) as count
                    FROM restaurants 
                    WHERE certifying_agency IS NOT NULL 
                    AND certifying_agency != ''
                    AND (certifying_agency != TRIM(certifying_agency))
                    GROUP BY certifying_agency
                    ORDER BY certifying_agency
                """)
            )
            
            whitespace_issues = result.fetchall()
            
            if whitespace_issues:
                print("⚠️  Found whitespace issues:")
                for agency, count in whitespace_issues:
                    print(f"  '{agency}' has leading/trailing whitespace ({count} restaurants)")
            else:
                print("✅ No whitespace issues found")
            
            # 4. Check for null or empty values
            print(f"\n🔍 Checking for null/empty values...")
            result = session.execute(
                text("""
                    SELECT 
                        CASE 
                            WHEN certifying_agency IS NULL THEN 'NULL'
                            WHEN certifying_agency = '' THEN 'EMPTY'
                            ELSE 'OTHER'
                        END as status,
                        COUNT(*) as count
                    FROM restaurants 
                    WHERE certifying_agency IS NULL OR certifying_agency = ''
                    GROUP BY 
                        CASE 
                            WHEN certifying_agency IS NULL THEN 'NULL'
                            WHEN certifying_agency = '' THEN 'EMPTY'
                            ELSE 'OTHER'
                        END
                """)
            )
            
            null_empty = result.fetchall()
            
            if null_empty:
                print("⚠️  Found null/empty values:")
                for status, count in null_empty:
                    print(f"  {status}: {count} restaurants")
            else:
                print("✅ No null or empty values found")
            
            # 5. Check for potential data import errors
            print(f"\n🔍 Checking for potential data import errors...")
            suspicious_patterns = [
                "all items", "available", "yes", "no", "true", "false",
                "unknown", "none", "n/a", "null", "empty", "test"
            ]
            
            for pattern in suspicious_patterns:
                result = session.execute(
                    text("""
                        SELECT certifying_agency, COUNT(*) as count
                        FROM restaurants 
                        WHERE LOWER(certifying_agency) = :pattern
                        GROUP BY certifying_agency
                    """),
                    {"pattern": pattern}
                )
                
                matches = result.fetchall()
                if matches:
                    for agency, count in matches:
                        print(f"⚠️  Suspicious pattern found: '{agency}' ({count} restaurants)")
            
            # 6. Get detailed breakdown by agency and kosher category
            print(f"\n📊 Detailed breakdown by agency and kosher category:")
            print("-" * 60)
            
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
                    ORDER BY certifying_agency, kosher_category
                """)
            )
            
            breakdown = result.fetchall()
            
            current_agency = None
            for agency, category, count in breakdown:
                if agency != current_agency:
                    current_agency = agency
                    print(f"\n🏢 {agency}:")
                
                print(f"  - {category}: {count} restaurants")
            
            # 7. Summary
            print(f"\n" + "="*80)
            print("SUMMARY")
            print("="*80)
            
            total_restaurants = sum(count for _, count in agencies)
            expected_agencies = {"ORB", "Kosher Miami"}
            found_agencies = {agency for agency, _ in agencies}
            
            print(f"Total restaurants: {total_restaurants}")
            print(f"Unique agencies: {len(agencies)}")
            print(f"Expected agencies: {len(expected_agencies)}")
            print(f"Found agencies: {found_agencies}")
            
            if found_agencies == expected_agencies:
                print("✅ All agencies are as expected!")
            else:
                unexpected = found_agencies - expected_agencies
                missing = expected_agencies - found_agencies
                
                if unexpected:
                    print(f"⚠️  Unexpected agencies: {unexpected}")
                if missing:
                    print(f"⚠️  Missing agencies: {missing}")
            
            print("="*80)
            
        logger.info("Detailed certifying agency check completed successfully")
        return True

    except Exception as e:
        logger.exception("Error in detailed certifying agency check", error=str(e))
        return False


if __name__ == "__main__":
    print("🔍 Performing detailed certifying agency check...")
    
    success = detailed_certifying_agency_check()
    
    if success:
        print("\n✅ Detailed check completed successfully!")
    else:
        print("\n❌ Detailed check failed!")
        sys.exit(1)
