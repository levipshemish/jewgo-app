#!/usr/bin/env python3
"""Batch geocoding script for mikvahs.

This script geocodes mikvahs that don't have coordinates and updates the database.
It can be run manually or as part of a scheduled job.

Usage:
    python scripts/geocode_mikvahs.py [--limit 50] [--force-update] [--dry-run]
"""

import argparse
import os
import sys
import time
from typing import Dict, List, Any

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.database_manager_v5 import DatabaseManagerV5
from utils.geocoding import GeocodingService
from utils.logging_config import get_logger

logger = get_logger(__name__)

def geocode_mikvahs_batch(
    limit: int = 50, 
    force_update: bool = False, 
    dry_run: bool = False
) -> Dict[str, Any]:
    """
    Batch geocode mikvahs that don't have coordinates.
    
    Args:
        limit: Maximum number of mikvahs to process
        force_update: Whether to update mikvahs that already have coordinates
        dry_run: If True, don't actually update the database
        
    Returns:
        Dictionary with processing results
    """
    # Get database connection
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is required")
    
    # Initialize managers
    db_manager = DatabaseManagerV5(database_url)
    geocoding_service = GeocodingService()
    
    # Check if Google API key is available
    if not geocoding_service.api_key:
        raise ValueError("GOOGLE_PLACES_API_KEY environment variable is required")
    
    logger.info(f"Starting batch geocoding with limit={limit}, force_update={force_update}, dry_run={dry_run}")
    
    # Get mikvahs that need geocoding
    mikvahs = db_manager.get_mikvahs_for_geocoding(
        limit=limit, 
        include_with_coordinates=force_update
    )
    
    if not mikvahs:
        logger.info("No mikvahs found that need geocoding")
        return {
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'results': []
        }
    
    logger.info(f"Found {len(mikvahs)} mikvahs to process")
    
    processed = 0
    successful = 0
    failed = 0
    results = []
    
    for mikvah in mikvahs:
        processed += 1
        mikvah_id = mikvah['id']
        mikvah_name = mikvah.get('name', 'Unknown')
        
        try:
            logger.info(f"Processing mikvah {processed}/{len(mikvahs)}: {mikvah_name} (ID: {mikvah_id})")
            
            # Extract address components
            address = mikvah.get('address', '')
            city = mikvah.get('city', '')
            state = mikvah.get('state', '')
            zip_code = mikvah.get('zip_code')
            country = mikvah.get('country', 'USA')
            
            # Check if we have enough address info
            if not address and not city:
                failed += 1
                error_msg = 'Insufficient address information'
                logger.warning(f"Skipping {mikvah_name}: {error_msg}")
                results.append({
                    'mikvah_id': mikvah_id,
                    'name': mikvah_name,
                    'status': 'failed',
                    'error': error_msg
                })
                continue
            
            # Build full address for logging
            full_address = f"{address}, {city}, {state} {zip_code or ''}, {country}".strip()
            logger.info(f"Geocoding address: {full_address}")
            
            # Geocode the address
            coordinates = geocoding_service.geocode_address(address, city, state, zip_code, country)
            
            if coordinates:
                lat, lng = coordinates
                logger.info(f"Successfully geocoded {mikvah_name}: ({lat}, {lng})")
                
                if not dry_run:
                    # Update mikvah coordinates in database
                    update_success = db_manager.update_mikvah_coordinates(mikvah_id, lat, lng)
                    
                    if update_success:
                        successful += 1
                        results.append({
                            'mikvah_id': mikvah_id,
                            'name': mikvah_name,
                            'status': 'success',
                            'latitude': lat,
                            'longitude': lng,
                            'address': full_address
                        })
                        logger.info(f"✅ Updated coordinates for {mikvah_name}")
                    else:
                        failed += 1
                        error_msg = 'Database update failed'
                        results.append({
                            'mikvah_id': mikvah_id,
                            'name': mikvah_name,
                            'status': 'failed',
                            'error': error_msg
                        })
                        logger.error(f"❌ Failed to update database for {mikvah_name}")
                else:
                    # Dry run - just log what would be done
                    successful += 1
                    results.append({
                        'mikvah_id': mikvah_id,
                        'name': mikvah_name,
                        'status': 'success (dry-run)',
                        'latitude': lat,
                        'longitude': lng,
                        'address': full_address
                    })
                    logger.info(f"🔍 [DRY RUN] Would update {mikvah_name} with coordinates ({lat}, {lng})")
            else:
                failed += 1
                error_msg = 'Geocoding failed'
                logger.warning(f"❌ Failed to geocode {mikvah_name}: {error_msg}")
                results.append({
                    'mikvah_id': mikvah_id,
                    'name': mikvah_name,
                    'status': 'failed',
                    'error': error_msg,
                    'address': full_address
                })
            
            # Add delay to respect API rate limits (Google allows 50 requests/second)
            time.sleep(0.1)  # 100ms delay = max 10 requests/second (well under limit)
            
        except Exception as e:
            failed += 1
            error_msg = str(e)
            logger.error(f"❌ Error processing {mikvah_name}: {error_msg}")
            results.append({
                'mikvah_id': mikvah_id,
                'name': mikvah_name,
                'status': 'failed',
                'error': error_msg
            })
    
    # Final summary
    summary = {
        'processed': processed,
        'successful': successful,
        'failed': failed,
        'results': results
    }
    
    logger.info(f"""
    🎯 Batch geocoding completed!
    📊 Summary:
       • Processed: {processed} mikvahs
       • Successful: {successful} mikvahs
       • Failed: {failed} mikvahs
       • Success rate: {(successful/processed*100) if processed > 0 else 0:.1f}%
    """)
    
    return summary

def main():
    """Main function to run the geocoding script."""
    parser = argparse.ArgumentParser(description='Batch geocode mikvahs without coordinates')
    parser.add_argument('--limit', type=int, default=50, help='Maximum number of mikvahs to process (default: 50)')
    parser.add_argument('--force-update', action='store_true', help='Update mikvahs that already have coordinates')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without updating database')
    parser.add_argument('--verbose', '-v', action='store_true', help='Enable verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        import logging
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        # Run the geocoding
        results = geocode_mikvahs_batch(
            limit=args.limit,
            force_update=args.force_update,
            dry_run=args.dry_run
        )
        
        # Print results
        print(f"\n{'='*60}")
        print(f"MIKVAH GEOCODING RESULTS")
        print(f"{'='*60}")
        print(f"Processed: {results['processed']}")
        print(f"Successful: {results['successful']}")
        print(f"Failed: {results['failed']}")
        
        if results['failed'] > 0:
            print(f"\n❌ FAILED MIKVAHS:")
            for result in results['results']:
                if result['status'] == 'failed':
                    print(f"  • {result['name']} (ID: {result['mikvah_id']}) - {result['error']}")
        
        if results['successful'] > 0:
            print(f"\n✅ SUCCESSFUL MIKVAHS:")
            for result in results['results']:
                if 'success' in result['status']:
                    lat = result.get('latitude', 'N/A')
                    lng = result.get('longitude', 'N/A')
                    print(f"  • {result['name']} (ID: {result['mikvah_id']}) - ({lat}, {lng})")
        
        print(f"{'='*60}\n")
        
        # Exit with appropriate code
        sys.exit(0 if results['failed'] == 0 else 1)
        
    except Exception as e:
        logger.error(f"Script failed: {e}")
        print(f"❌ Script failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
