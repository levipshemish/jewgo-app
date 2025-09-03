#!/usr/bin/env python3
"""Import synagogues from CSV to new shuls table.
This script transforms data from the florida_synagogues CSV format
into the new comprehensive shuls table structure.
"""
import csv
import psycopg2
import os
import sys
import time
import requests
from typing import Dict, Any, Optional, Tuple
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def clean_synagogue_data(row: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Clean and transform synagogue data from CSV to new table format."""
    
    # Basic cleaning
    name = row.get('Name', '').strip()
    if not name or 'Refresh page' in name or len(name) < 3:
        return None
    
    # Extract zip code from address if available
    address = row.get('Address', '').strip()
    zip_code = None
    if address and ', FL ' in address:
        try:
            zip_part = address.split(', FL ')[1].split(',')[0]
            if zip_part.isdigit() and len(zip_part) == 5:
                zip_code = zip_part
        except:
            pass
    
    # Determine denomination and type
    denomination = 'orthodox'  # Default
    shul_type = 'traditional'
    shul_category = 'ashkenazi'
    
    if row.get('Is_Chabad') == 'Yes':
        shul_type = 'chabad'
        denomination = 'orthodox'
        shul_category = 'chabad'
    elif row.get('Is_Young_Israel') == 'Yes':
        shul_type = 'young_israel'
        denomination = 'orthodox'
        shul_category = 'ashkenazi'
    elif row.get('Is_Sephardic') == 'Yes':
        shul_type = 'sephardic'
        denomination = 'orthodox'
        shul_category = 'sephardic'
    
    # Map affiliation to denomination
    affiliation = row.get('Affiliation', '').strip().lower()
    if 'conservative' in affiliation:
        denomination = 'conservative'
        shul_type = 'conservative'
    elif 'reform' in affiliation:
        denomination = 'reform'
        shul_type = 'reform'
    elif 'orthodox' in affiliation:
        denomination = 'orthodox'
        shul_type = 'orthodox'
    elif 'modern orthodox' in affiliation:
        denomination = 'orthodox'
        shul_type = 'modern_orthodox'
    
    # Determine services based on type
    has_daily_minyan = shul_type in ['chabad', 'orthodox', 'modern_orthodox']
    has_shabbat_services = True  # Assume yes for synagogues
    has_holiday_services = True
    has_women_section = True
    has_mechitza = denomination == 'orthodox'
    
    # Quality score
    quality_score = int(row.get('Data_Quality_Score', 0))
    is_verified = quality_score >= 3
    
    # Create tags for search
    tags = [shul_type, denomination, shul_category]
    if row.get('City'):
        tags.append(row['City'].strip().lower())
    if shul_type == 'chabad':
        tags.append('chabad')
    if shul_type == 'young_israel':
        tags.append('young_israel')
    if shul_type == 'sephardic':
        tags.append('sephardic')
    
    # Remove duplicates and empty tags
    tags = list(set([tag for tag in tags if tag and tag.strip()]))
    
    return {
        'name': name,
        'description': f"{denomination.title()} synagogue in {row.get('City', 'Florida')}",
        'address': address,
        'city': row.get('City', '').strip(),
        'state': 'FL',
        'zip_code': zip_code,
        'country': 'USA',
        'latitude': None,  # Will be populated by geocoding
        'longitude': None,  # Will be populated by geocoding
        'phone_number': row.get('Phone', '').strip(),
        'email': row.get('Email', '').strip(),
        'website': row.get('Website', '').strip(),
        'shul_type': shul_type,
        'shul_category': shul_category,
        'denomination': denomination,
        'business_hours': '',  # Will be filled later
        'has_daily_minyan': has_daily_minyan,
        'has_shabbat_services': has_shabbat_services,
        'has_holiday_services': has_holiday_services,
        'has_women_section': has_women_section,
        'has_mechitza': has_mechitza,
        'has_separate_entrance': False,  # Default
        'rabbi_name': row.get('Rabbi', '').strip(),
        'religious_authority': affiliation if affiliation else denomination,
        'community_affiliation': row.get('City', '').strip(),
        'has_parking': True,  # Assume yes for most synagogues
        'has_disabled_access': True,  # Assume yes for most synagogues
        'has_kiddush_facilities': True,  # Assume yes for most synagogues
        'has_social_hall': True,  # Assume yes for most synagogues
        'has_library': True,  # Assume yes for most synagogues
        'has_hebrew_school': True,  # Assume yes for most synagogues
        'has_adult_education': True,  # Assume yes for most synagogues
        'has_youth_programs': True,  # Assume yes for most synagogues
        'has_senior_programs': True,  # Assume yes for most synagogues
        'accepts_visitors': True,  # Assume yes for most synagogues
        'membership_required': False,  # Default
        'is_active': True,
        'is_verified': is_verified,
        'tags': tags,
        'listing_type': 'shul',
        'rating': 4.0 if is_verified else 3.5,  # Default ratings
        'review_count': 0,
        'star_rating': 4.0 if is_verified else 3.5,
        'google_rating': None,
        'image_url': None,  # Will be added later
        'logo_url': None,  # Will be added later
        'distance': None,  # Will be calculated based on user location
        'distance_miles': None
    }

def geocode_address(address: str, city: str, state: str, zip_code: str, country: str = 'USA', google_api_key: str = None) -> Optional[Tuple[float, float]]:
    """Geocode an address using Google Geocoding API."""
    if not google_api_key:
        logger.warning("No Google API key provided, skipping geocoding")
        return None
        
    try:
        # Build the full address
        if zip_code:
            full_address = f"{address}, {city}, {state} {zip_code}, {country}"
        else:
            full_address = f"{address}, {city}, {state}, {country}"
        
        # Make API request
        geocoding_url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            'address': full_address,
            'key': google_api_key
        }
        
        response = requests.get(geocoding_url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if data['status'] == 'OK' and data['results']:
            location = data['results'][0]['geometry']['location']
            lat = location['lat']
            lng = location['lng']
            
            logger.info(f"Successfully geocoded: {full_address} -> ({lat}, {lng})")
            return (lat, lng)
        else:
            logger.warning(f"Geocoding failed for {full_address}: {data['status']}")
            return None
            
    except Exception as e:
        logger.error(f"Error geocoding {address}: {e}")
        return None

def import_synagogues():
    """Import synagogues from CSV to new shuls table."""
    csv_path = 'data/florida_shuls_full_20250807_171818.csv'
    
    if not os.path.exists(csv_path):
        logger.error(f"CSV file not found: {csv_path}")
        return False
    
    # Database connection
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        logger.error("DATABASE_URL environment variable not set")
        return False
    
    # Google API key for geocoding
    google_api_key = os.environ.get('GOOGLE_PLACES_API_KEY')
    if not google_api_key:
        logger.warning("GOOGLE_PLACES_API_KEY not set - coordinates will not be populated")
    
    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        
        logger.info("Starting synagogue import...")
        
        # Check if shuls table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'shuls'
            );
        """)
        
        table_exists = cursor.fetchone()
        if not table_exists or not table_exists[0]:
            logger.error("Shuls table does not exist. Please run the migration first.")
            return False
        
        # Check if table is empty
        cursor.execute("SELECT COUNT(*) FROM shuls")
        count_result = cursor.fetchone()
        existing_count = count_result[0] if count_result else 0
        
        if existing_count > 0:
            logger.warning(f"Shuls table already contains {existing_count} records.")
            response = input("Do you want to continue and add new records? (y/N): ")
            if response.lower() != 'y':
                logger.info("Import cancelled.")
                return False
        
        logger.info(f"Opening CSV file: {csv_path}")
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            logger.info(f"CSV headers: {reader.fieldnames}")
            
            imported = 0
            skipped = 0
            errors = 0
            
            for row_num, row in enumerate(reader, 1):
                try:
                    cleaned_data = clean_synagogue_data(row)
                    if not cleaned_data:
                        skipped += 1
                        continue
                    
                    # Geocode address if we have an API key and valid address data
                    if (google_api_key and 
                        cleaned_data['address'] and 
                        cleaned_data['city'] and 
                        cleaned_data['state']):
                        
                        coordinates = geocode_address(
                            cleaned_data['address'],
                            cleaned_data['city'],
                            cleaned_data['state'],
                            cleaned_data['zip_code'],
                            cleaned_data['country'],
                            google_api_key
                        )
                        
                        if coordinates:
                            cleaned_data['latitude'] = coordinates[0]
                            cleaned_data['longitude'] = coordinates[1]
                        
                        # Rate limiting - be nice to Google API
                        time.sleep(0.1)
                    
                    # Insert into shuls table
                    columns = ', '.join(cleaned_data.keys())
                    placeholders = ', '.join([f'%({k})s' for k in cleaned_data.keys()])
                    
                    query = f"""
                    INSERT INTO shuls ({columns})
                    VALUES ({placeholders})
                    """
                    
                    cursor.execute(query, cleaned_data)
                    imported += 1
                    
                    if imported % 10 == 0:
                        logger.info(f"Imported {imported} synagogues...")
                        conn.commit()  # Commit every 10 records
                        
                except Exception as e:
                    logger.error(f"Error processing row {row_num}: {e}")
                    errors += 1
                    continue
            
            conn.commit()  # Final commit
            logger.info(f"Import complete: {imported} imported, {skipped} skipped, {errors} errors")
            
            # Update search vectors for imported records
            logger.info("Updating search vectors...")
            cursor.execute("UPDATE shuls SET search_vector = to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(city, '') || ' ' || COALESCE(shul_type, '') || ' ' || COALESCE(denomination, ''))")
            conn.commit()
            logger.info("Search vectors updated successfully.")
            
            return True
            
    except Exception as e:
        logger.error(f"Error during import: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        if 'conn' in locals():
            conn.rollback()
        return False
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

def main():
    """Main function to run the import."""
    logger.info("Starting synagogue data import...")
    
    success = import_synagogues()
    
    if success:
        logger.info("Synagogue import completed successfully!")
        sys.exit(0)
    else:
        logger.error("Synagogue import failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
