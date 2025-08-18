#!/usr/bin/env python3
"""
Simple Florida Synagogues PostgreSQL Import Script
==================================================

This script imports the Florida synagogues data into the JewGo PostgreSQL database.
Uses the Neon database directly.

Author: JewGo Development Team
Version: 1.0
Last Updated: August 7, 2024
"""

import csv
import os
import sys
from datetime import datetime
from typing import Dict, List, Any

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    create_engine,
    text,
)
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Direct Neon database URL
DATABASE_URL = "postgresql://username:password@host:5432/database_name?sslmode=require"

Base = declarative_base()


class Synagogue(Base):
    """
    Synagogue model for Florida synagogues data.
    """

    __tablename__ = "florida_synagogues"

    # Primary key and timestamps
    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Basic information
    name = Column(String(255), nullable=False, index=True)
    address = Column(String(500))
    city = Column(String(100), nullable=False, index=True)
    state = Column(String(50), default="FL", nullable=False)
    zip_code = Column(String(20))
    rabbi = Column(String(255))
    affiliation = Column(String(100), index=True)

    # Contact information
    phone = Column(String(50))
    email = Column(String(255))
    website = Column(String(500))
    social_media = Column(Text)

    # Prayer times
    shacharit = Column(Text)
    mincha = Column(Text)
    maariv = Column(Text)
    shabbat = Column(Text)
    sunday = Column(Text)
    weekday = Column(Text)

    # Additional information
    kosher_info = Column(Text)
    parking = Column(Text)
    accessibility = Column(Text)
    additional_info = Column(Text)
    url = Column(String(500))

    # Enhanced analysis
    data_quality_score = Column(Integer, default=1)
    is_chabad = Column(Boolean, default=False, index=True)
    is_young_israel = Column(Boolean, default=False, index=True)
    is_sephardic = Column(Boolean, default=False, index=True)
    has_address = Column(Boolean, default=False)
    has_zip = Column(Boolean, default=False)

    # Geographic coordinates (for future enhancement)
    latitude = Column(Float)
    longitude = Column(Float)

    def __repr__(self):
        return f"<Synagogue(name='{self.name}', city='{self.city}', affiliation='{self.affiliation}')>"


def main():
    """Main function to run the import process."""
    print("🕍 Florida Synagogues PostgreSQL Import (Simple)")
    print("=" * 60)

    # Initialize database connection
    print(f"🔌 Connecting to Neon database...")
    engine = create_engine(DATABASE_URL)

    try:
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Database connection established successfully")
    except SQLAlchemyError as e:
        print(f"❌ Database connection failed: {e}")
        return

    # Create table
    print("🏗️ Creating synagogues table...")
    try:
        Base.metadata.create_all(engine)
        print("✅ Synagogues table created successfully")
    except SQLAlchemyError as e:
        print(f"❌ Failed to create table: {e}")
        return

    # Create session
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Load CSV data
        csv_file = "../data/florida_synagogues_final.csv"
        print(f"📂 Loading data from: {csv_file}")

        data = []
        with open(csv_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)

        print(f"✅ Loaded {len(data)} synagogues from CSV")

        # Check if table is empty
        existing_count = session.query(Synagogue).count()
        if existing_count > 0:
            print(f"⚠️ Table already contains {existing_count} synagogues")
            response = input("Do you want to clear existing data and reimport? (y/N): ")
            if response.lower() == "y":
                session.query(Synagogue).delete()
                session.commit()
                print("🗑️ Cleared existing data")
            else:
                print("❌ Import cancelled")
                return

        # Import data
        print("📥 Importing synagogues into database...")
        imported_count = 0

        for row in data:
            # Clean and prepare data
            synagogue_data = {
                "name": row.get("Name", "").strip(),
                "address": row.get("Address", "").strip(),
                "city": row.get("City", "").strip(),
                "state": row.get("State", "FL").strip(),
                "zip_code": row.get("Zip", "").strip(),
                "rabbi": row.get("Rabbi", "").strip(),
                "affiliation": row.get("Affiliation", "").strip(),
                "phone": row.get("Phone", "").strip(),
                "email": row.get("Email", "").strip(),
                "website": row.get("Website", "").strip(),
                "social_media": row.get("Social_Media", "").strip(),
                "shacharit": row.get("Shacharit", "").strip(),
                "mincha": row.get("Mincha", "").strip(),
                "maariv": row.get("Maariv", "").strip(),
                "shabbat": row.get("Shabbat", "").strip(),
                "sunday": row.get("Sunday", "").strip(),
                "weekday": row.get("Weekday", "").strip(),
                "kosher_info": row.get("Kosher_Info", "").strip(),
                "parking": row.get("Parking", "").strip(),
                "accessibility": row.get("Accessibility", "").strip(),
                "additional_info": row.get("Additional_Info", "").strip(),
                "url": row.get("URL", "").strip(),
                "data_quality_score": int(row.get("Data_Quality_Score", 1)),
                "is_chabad": row.get("Is_Chabad", "No").lower() == "yes",
                "is_young_israel": row.get("Is_Young_Israel", "No").lower() == "yes",
                "is_sephardic": row.get("Is_Sephardic", "No").lower() == "yes",
                "has_address": row.get("Has_Address", "No").lower() == "yes",
                "has_zip": row.get("Has_Zip", "No").lower() == "yes",
            }

            # Skip empty rows
            if synagogue_data["name"]:
                synagogue = Synagogue(**synagogue_data)
                session.add(synagogue)
                imported_count += 1

                # Commit in batches
                if imported_count % 50 == 0:
                    session.commit()
                    print(f"📊 Imported {imported_count} synagogues...")

        # Final commit
        session.commit()
        print(f"✅ Successfully imported {imported_count} synagogues")

        # Create indexes
        print("🔍 Creating database indexes...")
        with engine.begin() as conn:
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_synagogues_city ON florida_synagogues(city)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_synagogues_affiliation ON florida_synagogues(affiliation)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_synagogues_chabad ON florida_synagogues(is_chabad)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_synagogues_young_israel ON florida_synagogues(is_young_israel)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_synagogues_sephardic ON florida_synagogues(is_sephardic)"
                )
            )
        print("✅ Database indexes created successfully")

        # Get statistics
        print("\n📊 Import Statistics:")
        total_count = session.query(Synagogue).count()
        chabad_count = (
            session.query(Synagogue).filter(Synagogue.is_chabad == True).count()
        )
        young_israel_count = (
            session.query(Synagogue).filter(Synagogue.is_young_israel == True).count()
        )
        sephardic_count = (
            session.query(Synagogue).filter(Synagogue.is_sephardic == True).count()
        )

        print(f"Total Synagogues: {total_count}")
        print(f"Chabad Synagogues: {chabad_count}")
        print(f"Young Israel Synagogues: {young_israel_count}")
        print(f"Sephardic Synagogues: {sephardic_count}")

        print("\n🎉 Import completed successfully!")

    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        session.rollback()

    finally:
        session.close()
        engine.dispose()
        print("🔌 Database connection closed")


if __name__ == "__main__":
    main()
