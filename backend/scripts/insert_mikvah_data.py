#!/usr/bin/env python3
"""Script to insert mikvah data into the database.
This script parses the provided mikvah data and inserts it into the mikvah table.
"""
import os
import re
import sys
from typing import Dict, List, Optional, Tuple
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Configure logging
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Mikvah data provided by user
MIKVAH_DATA = [
    {
        "name": "Alicia Bat Freida Mikvah",
        "address": "2655 NE 207th St, Ojus, FL 33180",
        "supervision": "–",
        "phone": "954‑258‑5611",
        "secondary_phone": "954‑245‑9304",
        "website": "kosherderech.com",
        "email": ""
    },
    {
        "name": "Anidjar Mikvah – Bnai Sephardim",
        "address": "3670 Stirling Rd, Hollywood, FL 33312",
        "supervision": "–",
        "phone": "850‑586‑1571",
        "secondary_phone": "",
        "website": "",
        "email": "mikveh@mybnai.com"
    },
    {
        "name": "Chabad of Greater Ft. Lauderdale Mikvah",
        "address": "6700 NW 44th St, Lauderhill, FL 33319",
        "supervision": "supervised by Rabbi Aron Lieberman",
        "phone": "954‑777‑9906",
        "secondary_phone": "954‑200‑4071",
        "website": "",
        "email": ""
    },
    {
        "name": "Coral Springs Mikvah – Chabad of Coral Springs",
        "address": "3925 N University Dr, Coral Springs, FL 33065",
        "supervision": "supervised by Rabbi Yossi Denburg",
        "phone": "754‑368‑1050",
        "secondary_phone": "",
        "website": "coralspringschabad.org",
        "email": ""
    },
    {
        "name": "Grace Cayre Ladies Mikvah (Safra Synagogue)",
        "address": "19275 Mystic Pointe Dr, Aventura, FL 33180",
        "supervision": "–",
        "phone": "305‑937‑4313",
        "secondary_phone": "786‑537‑4313",
        "website": "",
        "email": ""
    },
    {
        "name": "Mei Menachem Mikvah Israel",
        "address": "1295 E Hallandale Beach Blvd, Hallandale Beach, FL 33009",
        "supervision": "Chabad of Hallandale Beach; Rabbi Raphael Tennenhaus",
        "phone": "954‑851‑6286",
        "secondary_phone": "",
        "website": "",
        "email": ""
    },
    {
        "name": "Miami Beach Mikvah",
        "address": "2530 Pine Tree Dr, Miami Beach, FL 33140",
        "supervision": "–",
        "phone": "305‑672‑3500",
        "secondary_phone": "305‑534‑1931",
        "website": "mikvahmiamibeach.com",
        "email": ""
    },
    {
        "name": "Mikvah Ahava",
        "address": "2863 Stirling Rd, Hollywood, FL 33312",
        "supervision": "Bet Midrash Ohr Hachayim Hakadosh; Rabbi Nachom Rosenberg",
        "phone": "954‑295‑7788",
        "secondary_phone": "954‑907‑1541",
        "website": "betohr.com",
        "email": "Natalierazla@gmail.com"
    },
    {
        "name": "Mikvah Am Kadosh – Aventura Chabad",
        "address": "21001 Biscayne Blvd, Aventura, FL 33180",
        "supervision": "Aventura Chabad",
        "phone": "786‑277‑0336",
        "secondary_phone": "",
        "website": "",
        "email": "laivi@chabadfl.org"
    },
    {
        "name": "Mikvah Chabad – Chabad of Central Boca Raton",
        "address": "17950 N Military Trl, Boca Raton, FL 33496",
        "supervision": "supervised by Rabbi Moshe Denburg; entrance on south side",
        "phone": "561‑674‑0877",
        "secondary_phone": "urgent 561‑526‑5738",
        "website": "chabadcentralboca.com",
        "email": ""
    },
    {
        "name": "Mikvah Mei Menachem – Chabad of Palm Beach",
        "address": "844 Prosperity Farms Rd, North Palm Beach, FL 33408",
        "supervision": "supervised by Rabbi Shlomo Ezagui",
        "phone": "561‑624‑7004",
        "secondary_phone": "",
        "website": "jewishcommunitysynagogue.com",
        "email": "rsezagui@aol.com"
    },
    {
        "name": "Mikvah Mei Menachem – Chabad of Weston",
        "address": "18501 Tequesta Trace Park Ln, Weston, FL 33326",
        "supervision": "supervised by Rabbi Yisroel Spalter",
        "phone": "954‑349‑6565",
        "secondary_phone": "",
        "website": "",
        "email": ""
    },
    {
        "name": "Mikvah of Boca Raton Synagogue",
        "address": "7900 N Montoya Cir, Boca Del Mar, FL 33433",
        "supervision": "supervised by Rabbi Efrem Goldberg",
        "phone": "561‑394‑5854",
        "secondary_phone": "",
        "website": "",
        "email": ""
    },
    {
        "name": "Mikvah of Fort Lauderdale",
        "address": "3536 N Ocean Blvd, Fort Lauderdale, FL 33308",
        "supervision": "supervised by Rebbetzin Lipszyc; mikvah cost $35",
        "phone": "954‑568‑1190 ext 7",
        "secondary_phone": "",
        "website": "",
        "email": ""
    },
    {
        "name": "Mikvah of South Dade",
        "address": "7880 SW 112th St, Pinecrest, FL 33156",
        "supervision": "–",
        "phone": "305‑232‑6833",
        "secondary_phone": "",
        "website": "",
        "email": ""
    },
    {
        "name": "Mikvah Shulamit – Chabad of Plantation",
        "address": "455 SW 78th Ave, Plantation, FL 33324",
        "supervision": "supervised by Rabbi Mendy Posner",
        "phone": "954‑600‑7772",
        "secondary_phone": "954‑707‑1444",
        "website": "mikvah.org",
        "email": "mcposner@comcast.net"
    },
    {
        "name": "Mikvah Young Israel of Hollywood",
        "address": "3291 Stirling Rd, Hollywood, FL 33312",
        "supervision": "supervised by Rabbi Edward Davis; mikvah located in rear",
        "phone": "954‑963‑3952",
        "secondary_phone": "",
        "website": "yih.org",
        "email": ""
    },
    {
        "name": "North Miami Beach – Mikvah Jovita Cojab",
        "address": "1054 NE Miami Gardens Dr, North Miami Beach, FL 33179",
        "supervision": "–",
        "phone": "305‑949‑9650",
        "secondary_phone": "954‑478‑1625",
        "website": "",
        "email": ""
    },
    {
        "name": "The Mikvah at Bal Harbor (Shul of Bal Harbor)",
        "address": "9540 Collins Ave, Surfside, FL 33154",
        "supervision": "–",
        "phone": "305‑866‑1492",
        "secondary_phone": "305‑323‑2410",
        "website": "theshul.org",
        "email": ""
    },
    {
        "name": "The Young Family Mikvah Mei Menachem – Chabad of Greater Boynton",
        "address": "10655 El Clair Ranch Rd, Boynton Beach, FL 33437",
        "supervision": "supervised by Rabbis Sholom Ciment, Avroham Korf & Gerson Grossbaum",
        "phone": "561‑734‑2201",
        "secondary_phone": "561‑732‑4633",
        "website": "chabadboynton.com",
        "email": "rabbi@chabadboynton.com"
    }
]


def parse_address(address: str) -> Tuple[str, str, str, str]:
    """Parse address string to extract street, city, state, zip."""
    # Remove extra spaces and normalize
    address = re.sub(r'\s+', ' ', address.strip())
    
    # Pattern to match: Street, City, State ZIP
    pattern = r'^(.+),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$'
    match = re.match(pattern, address)
    
    if match:
        street = match.group(1).strip()
        city = match.group(2).strip()
        state = match.group(3).strip()
        zip_code = match.group(4).strip()
        return street, city, state, zip_code
    
    # Fallback: try to extract what we can
    parts = address.split(',')
    if len(parts) >= 3:
        street = parts[0].strip()
        city = parts[1].strip()
        state_zip = parts[2].strip()
        
        # Try to separate state and zip
        state_zip_match = re.match(r'([A-Z]{2})\s+(\d{5}(?:-\d{4})?)', state_zip)
        if state_zip_match:
            state = state_zip_match.group(1)
            zip_code = state_zip_match.group(2)
        else:
            state = state_zip
            zip_code = ""
        
        return street, city, state, zip_code
    
    # If all else fails, return the full address
    return address, "", "", ""


def clean_phone(phone: str) -> str:
    """Clean phone number by removing non-digit characters except + and -."""
    if not phone:
        return ""
    # Remove em dashes and other non-standard characters
    phone = phone.replace('‑', '-').replace('–', '-')
    return phone.strip()


def clean_website(website: str) -> str:
    """Clean website URL."""
    if not website:
        return ""
    website = website.strip()
    if website and not website.startswith(('http://', 'https://')):
        website = f"https://{website}"
    return website


def clean_email(email: str) -> str:
    """Clean email address."""
    if not email:
        return ""
    return email.strip().lower()


def get_mikvah_type(name: str, supervision: str) -> str:
    """Determine mikvah type based on name and supervision."""
    name_lower = name.lower()
    supervision_lower = supervision.lower()
    
    if 'ladies' in name_lower or 'women' in name_lower:
        return "women's"
    elif 'men' in name_lower:
        return "men's"
    elif 'chabad' in name_lower or 'chabad' in supervision_lower:
        return "community"
    else:
        return "community"


def get_mikvah_category(name: str, supervision: str) -> str:
    """Determine mikvah category based on name and supervision."""
    name_lower = name.lower()
    supervision_lower = supervision.lower()
    
    if 'chabad' in name_lower or 'chabad' in supervision_lower:
        return "chabad"
    elif 'synagogue' in name_lower or 'shul' in name_lower:
        return "synagogue"
    elif 'young israel' in name_lower:
        return "young_israel"
    else:
        return "community"


def extract_fee_amount(supervision: str) -> Optional[float]:
    """Extract fee amount from supervision notes if mentioned."""
    if not supervision:
        return None
    
    # Look for fee patterns like "$35", "cost $35", etc.
    fee_pattern = r'(?:cost\s+)?\$(\d+(?:\.\d{2})?)'
    match = re.search(fee_pattern, supervision.lower())
    if match:
        return float(match.group(1))
    return None


def insert_mikvah_data() -> bool:
    """Insert mikvah data into the database."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL environment variable is required")
        return False
    
    try:
        engine = create_engine(database_url)
        with engine.connect() as conn:
            trans = conn.begin()
            try:
                logger.info("Starting mikvah data insertion")
                
                inserted_count = 0
                skipped_count = 0
                
                for mikvah in MIKVAH_DATA:
                    # Parse address
                    street, city, state, zip_code = parse_address(mikvah["address"])
                    
                    # Clean data
                    phone = clean_phone(mikvah["phone"])
                    secondary_phone = clean_phone(mikvah["secondary_phone"])
                    website = clean_website(mikvah["website"])
                    email = clean_email(mikvah["email"])
                    
                    # Determine mikvah type and category
                    mikvah_type = get_mikvah_type(mikvah["name"], mikvah["supervision"])
                    mikvah_category = get_mikvah_category(mikvah["name"], mikvah["supervision"])
                    
                    # Extract fee if mentioned
                    fee_amount = extract_fee_amount(mikvah["supervision"])
                    
                    # Check if mikvah already exists (by name and address)
                    check_query = text("""
                        SELECT id FROM mikvah 
                        WHERE name = :name AND address = :address
                    """)
                    result = conn.execute(check_query, {
                        "name": mikvah["name"],
                        "address": mikvah["address"]
                    })
                    existing = result.fetchone()
                    
                    if existing:
                        logger.info(f"Skipping existing mikvah: {mikvah['name']}")
                        skipped_count += 1
                        continue
                    
                    # Insert new mikvah
                    insert_query = text("""
                        INSERT INTO mikvah (
                            name, address, city, state, zip_code, country,
                            phone_number, website, email,
                            mikvah_type, mikvah_category,
                            kosher_certification, admin_notes,
                            fee_amount, fee_currency,
                            is_active, is_verified, listing_type,
                            created_at, updated_at
                        ) VALUES (
                            :name, :address, :city, :state, :zip_code, :country,
                            :phone_number, :website, :email,
                            :mikvah_type, :mikvah_category,
                            :kosher_certification, :admin_notes,
                            :fee_amount, :fee_currency,
                            :is_active, :is_verified, :listing_type,
                            NOW(), NOW()
                        )
                    """)
                    
                    # Prepare admin notes with supervision info
                    admin_notes = ""
                    if mikvah["supervision"] and mikvah["supervision"] != "–":
                        admin_notes = f"Supervision: {mikvah['supervision']}"
                    if secondary_phone:
                        if admin_notes:
                            admin_notes += f" | Secondary phone: {secondary_phone}"
                        else:
                            admin_notes = f"Secondary phone: {secondary_phone}"
                    
                    conn.execute(insert_query, {
                        "name": mikvah["name"],
                        "address": mikvah["address"],
                        "city": city,
                        "state": state,
                        "zip_code": zip_code,
                        "country": "USA",
                        "phone_number": phone,
                        "website": website,
                        "email": email,
                        "mikvah_type": mikvah_type,
                        "mikvah_category": mikvah_category,
                        "kosher_certification": "Orthodox" if mikvah["supervision"] != "–" else None,
                        "admin_notes": admin_notes if admin_notes else None,
                        "fee_amount": fee_amount,
                        "fee_currency": "USD" if fee_amount else None,
                        "is_active": True,
                        "is_verified": True,
                        "listing_type": "mikvah"
                    })
                    
                    logger.info(f"Inserted mikvah: {mikvah['name']}")
                    inserted_count += 1
                
                trans.commit()
                logger.info(f"Successfully inserted {inserted_count} mikvah records")
                logger.info(f"Skipped {skipped_count} existing records")
                return True
                
            except Exception as e:
                trans.rollback()
                logger.error(f"Error inserting mikvah data: {e}")
                return False
                
    except SQLAlchemyError as e:
        logger.error(f"Database error: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return False


def main():
    """Main function to run the mikvah data insertion."""
    logger.info("Starting mikvah data insertion script")
    
    success = insert_mikvah_data()
    
    if success:
        logger.info("Mikvah data insertion completed successfully")
        sys.exit(0)
    else:
        logger.error("Mikvah data insertion failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
