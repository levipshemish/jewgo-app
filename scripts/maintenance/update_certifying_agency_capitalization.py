#!/usr/bin/env python3
"""
Update Certifying Agency Capitalization
======================================

This script updates the certifying agency values in the database to standardize capitalization:
- "Orb" → "ORB"
- "Kosher miami" → "Kosher Miami"

Author: JewGo Development Team
Version: 1.0
Updated: 2025
"""

import os
import sys
from sqlalchemy import text
import structlog
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add backend to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

from utils.database_connection_manager import get_db_manager
from utils.logging_config import get_logger

logger = get_logger(__name__)


def check_current_certifying_agencies():
    """Check current certifying agency values in the database."""
    try:
        db_manager = get_db_manager()
        
        if not db_manager.connect():
            logger.error("Failed to connect to database")
            return False

        with db_manager.session_scope() as session:
            # Get all unique certifying agency values with counts
            result = session.execute(
                text(
                    """
                SELECT certifying_agency, COUNT(*) as count
                FROM restaurants 
                WHERE certifying_agency IS NOT NULL
                GROUP BY certifying_agency
                ORDER BY count DESC
                """
                )
            )

            agencies = result.fetchall()
            
            print("Current certifying agency values:")
            logger.info("Current certifying agency values:")
            for agency, count in agencies:
                print(f"  '{agency}': {count} restaurants")
                logger.info(f"  '{agency}': {count} restaurants")
            
            return agencies

    except Exception as e:
        logger.error(f"Error checking certifying agencies: {e}")
        return False


def update_certifying_agency_capitalization():
    """Update certifying agency capitalization in the database."""
    
    logger.info("Starting certifying agency capitalization update")

    try:
        db_manager = get_db_manager()
        
        if not db_manager.connect():
            logger.error("Failed to connect to database")
            return False

        with db_manager.session_scope() as session:
            # Update "Orb" to "ORB"
            orb_result = session.execute(
                text(
                    """
                UPDATE restaurants 
                SET certifying_agency = 'ORB', updated_at = NOW()
                WHERE certifying_agency = 'Orb'
                """
                )
            )
            orb_updated = orb_result.rowcount
            print(f"Updated {orb_updated} restaurants from 'Orb' to 'ORB'")
            logger.info(f"Updated {orb_updated} restaurants from 'Orb' to 'ORB'")

            # Update "Kosher miami" to "Kosher Miami"
            kosher_miami_result = session.execute(
                text(
                    """
                UPDATE restaurants 
                SET certifying_agency = 'Kosher Miami', updated_at = NOW()
                WHERE certifying_agency = 'Kosher miami'
                """
                )
            )
            kosher_miami_updated = kosher_miami_result.rowcount
            print(f"Updated {kosher_miami_updated} restaurants from 'Kosher miami' to 'Kosher Miami'")
            logger.info(f"Updated {kosher_miami_updated} restaurants from 'Kosher miami' to 'Kosher Miami'")

            # Commit the changes
            session.commit()
            
            total_updated = orb_updated + kosher_miami_updated
            print(f"Total restaurants updated: {total_updated}")
            logger.info(f"Total restaurants updated: {total_updated}")

            return True  # Return True even if no updates were needed

    except Exception as e:
        logger.error(f"Error updating certifying agency capitalization: {e}")
        return False


def verify_capitalization_update():
    """Verify that the capitalization updates were applied correctly."""
    
    logger.info("Verifying capitalization updates...")
    
    try:
        db_manager = get_db_manager()
        
        if not db_manager.connect():
            logger.error("Failed to connect to database")
            return False

        with db_manager.session_scope() as session:
            # Check for any remaining lowercase "orb" or "kosher miami"
            result = session.execute(
                text(
                    """
                SELECT certifying_agency, COUNT(*) as count
                FROM restaurants 
                WHERE certifying_agency IN ('Orb', 'Kosher miami')
                GROUP BY certifying_agency
                """
                )
            )

            remaining_issues = result.fetchall()
            
            if remaining_issues:
                logger.warning("Found remaining capitalization issues:")
                for agency, count in remaining_issues:
                    logger.warning(f"  '{agency}': {count} restaurants")
                return False
            else:
                logger.info("✅ All certifying agency capitalization issues resolved")
                return True

    except Exception as e:
        logger.error(f"Error verifying capitalization updates: {e}")
        return False


def main():
    """Main function to run the capitalization update."""
    
    print("=== Certifying Agency Capitalization Update ===")
    logger.info("=== Certifying Agency Capitalization Update ===")
    
    # Step 1: Check current state
    print("Step 1: Checking current certifying agency values...")
    logger.info("Step 1: Checking current certifying agency values...")
    current_agencies = check_current_certifying_agencies()
    
    if current_agencies is False:
        print("Failed to check current certifying agencies")
        logger.error("Failed to check current certifying agencies")
        return False
    
    # Step 2: Update capitalization
    print("Step 2: Updating certifying agency capitalization...")
    logger.info("Step 2: Updating certifying agency capitalization...")
    update_success = update_certifying_agency_capitalization()
    
    if not update_success:
        print("Failed to update certifying agency capitalization")
        logger.error("Failed to update certifying agency capitalization")
        return False
    
    # Step 3: Verify updates
    print("Step 3: Verifying capitalization updates...")
    logger.info("Step 3: Verifying capitalization updates...")
    verify_success = verify_capitalization_update()
    
    if not verify_success:
        print("Verification failed - some capitalization issues remain")
        logger.error("Verification failed - some capitalization issues remain")
        return False
    
    # Step 4: Show final state
    print("Step 4: Final certifying agency values:")
    logger.info("Step 4: Final certifying agency values:")
    final_agencies = check_current_certifying_agencies()
    
    print("=== Capitalization Update Complete ===")
    logger.info("=== Capitalization Update Complete ===")
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
