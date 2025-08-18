#!/usr/bin/env python3
"""
Florida Synagogues PostgreSQL Import Script
===========================================

This script imports the Florida synagogues data into the JewGo PostgreSQL database.
It creates a new table for synagogues and populates it with the cleaned data.

Author: JewGo Development Team
Version: 1.0
Last Updated: August 7, 2024
"""

import csv
import os
import sys
from datetime import datetime
from typing import Dict, List, Any

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))

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
    MetaData,
    Table,
)
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Import configuration
try:
    from config.config import get_config

    config = get_config()
    DATABASE_URL = config.SQLALCHEMY_DATABASE_URI
except ImportError:
    # Fallback configuration - use environment variable directly
    DATABASE_URL = os.environ.get("DATABASE_URL")
    if not DATABASE_URL:
        print("❌ DATABASE_URL environment variable not set")
        print(
            "Please set DATABASE_URL or run with: DATABASE_URL=your_url python import_to_postgres.py"
        )
        sys.exit(1)

Base = declarative_base()


class Synagogue(Base):
    """
    Synagogue model for Florida synagogues data.

    This model represents synagogues in the JewGo database.
    It contains comprehensive synagogue information including
    contact details, prayer times, and affiliation data.
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


class FloridaSynagoguesImporter:
    """
    Importer for Florida synagogues data into PostgreSQL.
    """

    def __init__(self, database_url: str = None):
        """Initialize the importer with database connection."""
        self.database_url = database_url or DATABASE_URL
        self.engine = None
        self.Session = None
        self.session = None

    def connect(self) -> bool:
        """Establish database connection."""
        try:
            print(
                f"🔌 Connecting to database: {self.database_url.split('@')[1] if '@' in self.database_url else 'local'}"
            )
            self.engine = create_engine(self.database_url)

            # Test connection
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))

            self.Session = sessionmaker(bind=self.engine)
            self.session = self.Session()
            print("✅ Database connection established successfully")
            return True

        except SQLAlchemyError as e:
            print(f"❌ Database connection failed: {e}")
            return False

    def create_table(self) -> bool:
        """Create the synagogues table if it doesn't exist."""
        try:
            print("🏗️ Creating synagogues table...")
            Base.metadata.create_all(self.engine)
            print("✅ Synagogues table created successfully")
            return True

        except SQLAlchemyError as e:
            print(f"❌ Failed to create table: {e}")
            return False

    def load_csv_data(self, csv_file: str) -> List[Dict[str, Any]]:
        """Load data from CSV file."""
        try:
            print(f"📂 Loading data from: {csv_file}")
            data = []

            with open(csv_file, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    data.append(row)

            print(f"✅ Loaded {len(data)} synagogues from CSV")
            return data

        except FileNotFoundError:
            print(f"❌ CSV file not found: {csv_file}")
            return []
        except Exception as e:
            print(f"❌ Error loading CSV: {e}")
            return []

    def clean_data(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Clean and prepare data for import."""
        cleaned_data = []

        for row in data:
            cleaned_row = {}

            # Clean basic information
            cleaned_row["name"] = row.get("Name", "").strip()
            cleaned_row["address"] = row.get("Address", "").strip()
            cleaned_row["city"] = row.get("City", "").strip()
            cleaned_row["state"] = row.get("State", "FL").strip()
            cleaned_row["zip_code"] = row.get("Zip", "").strip()
            cleaned_row["rabbi"] = row.get("Rabbi", "").strip()
            cleaned_row["affiliation"] = row.get("Affiliation", "").strip()

            # Clean contact information
            cleaned_row["phone"] = row.get("Phone", "").strip()
            cleaned_row["email"] = row.get("Email", "").strip()
            cleaned_row["website"] = row.get("Website", "").strip()
            cleaned_row["social_media"] = row.get("Social_Media", "").strip()

            # Clean prayer times
            cleaned_row["shacharit"] = row.get("Shacharit", "").strip()
            cleaned_row["mincha"] = row.get("Mincha", "").strip()
            cleaned_row["maariv"] = row.get("Maariv", "").strip()
            cleaned_row["shabbat"] = row.get("Shabbat", "").strip()
            cleaned_row["sunday"] = row.get("Sunday", "").strip()
            cleaned_row["weekday"] = row.get("Weekday", "").strip()

            # Clean additional information
            cleaned_row["kosher_info"] = row.get("Kosher_Info", "").strip()
            cleaned_row["parking"] = row.get("Parking", "").strip()
            cleaned_row["accessibility"] = row.get("Accessibility", "").strip()
            cleaned_row["additional_info"] = row.get("Additional_Info", "").strip()
            cleaned_row["url"] = row.get("URL", "").strip()

            # Clean enhanced analysis
            cleaned_row["data_quality_score"] = int(row.get("Data_Quality_Score", 1))
            cleaned_row["is_chabad"] = row.get("Is_Chabad", "No").lower() == "yes"
            cleaned_row["is_young_israel"] = (
                row.get("Is_Young_Israel", "No").lower() == "yes"
            )
            cleaned_row["is_sephardic"] = row.get("Is_Sephardic", "No").lower() == "yes"
            cleaned_row["has_address"] = row.get("Has_Address", "No").lower() == "yes"
            cleaned_row["has_zip"] = row.get("Has_Zip", "No").lower() == "yes"

            # Skip empty rows
            if cleaned_row["name"]:
                cleaned_data.append(cleaned_row)

        print(f"✅ Cleaned {len(cleaned_data)} synagogues")
        return cleaned_data

    def import_data(self, data: List[Dict[str, Any]]) -> bool:
        """Import data into the database."""
        try:
            print("📥 Importing synagogues into database...")

            # Check if table is empty
            existing_count = self.session.query(Synagogue).count()
            if existing_count > 0:
                print(f"⚠️ Table already contains {existing_count} synagogues")
                response = input(
                    "Do you want to clear existing data and reimport? (y/N): "
                )
                if response.lower() == "y":
                    self.session.query(Synagogue).delete()
                    self.session.commit()
                    print("🗑️ Cleared existing data")
                else:
                    print("❌ Import cancelled")
                    return False

            # Import new data
            imported_count = 0
            for row_data in data:
                synagogue = Synagogue(**row_data)
                self.session.add(synagogue)
                imported_count += 1

                # Commit in batches
                if imported_count % 50 == 0:
                    self.session.commit()
                    print(f"📊 Imported {imported_count} synagogues...")

            # Final commit
            self.session.commit()
            print(f"✅ Successfully imported {imported_count} synagogues")
            return True

        except SQLAlchemyError as e:
            print(f"❌ Import failed: {e}")
            self.session.rollback()
            return False

    def create_indexes(self) -> bool:
        """Create useful indexes for performance."""
        try:
            print("🔍 Creating database indexes...")

            # Create indexes for common queries
            with self.engine.connect() as conn:
                # City index
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS idx_synagogues_city ON florida_synagogues(city)"
                    )
                )

                # Affiliation index
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS idx_synagogues_affiliation ON florida_synagogues(affiliation)"
                    )
                )

                # Chabad index
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS idx_synagogues_chabad ON florida_synagogues(is_chabad)"
                    )
                )

                # Young Israel index
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS idx_synagogues_young_israel ON florida_synagogues(is_young_israel)"
                    )
                )

                # Sephardic index
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS idx_synagogues_sephardic ON florida_synagogues(is_sephardic)"
                    )
                )

                conn.commit()

            print("✅ Database indexes created successfully")
            return True

        except SQLAlchemyError as e:
            print(f"❌ Failed to create indexes: {e}")
            return False

    def get_statistics(self) -> Dict[str, Any]:
        """Get import statistics."""
        try:
            total_count = self.session.query(Synagogue).count()
            chabad_count = (
                self.session.query(Synagogue)
                .filter(Synagogue.is_chabad == True)
                .count()
            )
            young_israel_count = (
                self.session.query(Synagogue)
                .filter(Synagogue.is_young_israel == True)
                .count()
            )
            sephardic_count = (
                self.session.query(Synagogue)
                .filter(Synagogue.is_sephardic == True)
                .count()
            )

            # City breakdown
            cities = self.session.query(Synagogue.city).distinct().count()

            # Affiliation breakdown
            affiliations = self.session.query(Synagogue.affiliation).distinct().all()
            affiliation_count = len(affiliations)

            return {
                "total_synagogues": total_count,
                "chabad_synagogues": chabad_count,
                "young_israel_synagogues": young_israel_count,
                "sephardic_synagogues": sephardic_count,
                "cities": cities,
                "affiliations": affiliation_count,
                "affiliation_list": [aff[0] for aff in affiliations if aff[0]],
            }

        except SQLAlchemyError as e:
            print(f"❌ Failed to get statistics: {e}")
            return {}

    def close(self):
        """Close database connection."""
        if self.session:
            self.session.close()
        if self.engine:
            self.engine.dispose()
        print("🔌 Database connection closed")


def main():
    """Main function to run the import process."""
    print("🕍 Florida Synagogues PostgreSQL Import")
    print("=" * 50)

    # Initialize importer
    importer = FloridaSynagoguesImporter()

    # Connect to database
    if not importer.connect():
        print("❌ Failed to connect to database. Exiting.")
        return

    try:
        # Create table
        if not importer.create_table():
            print("❌ Failed to create table. Exiting.")
            return

        # Load CSV data
        csv_file = "../data/florida_synagogues_final.csv"
        data = importer.load_csv_data(csv_file)

        if not data:
            print("❌ No data to import. Exiting.")
            return

        # Clean data
        cleaned_data = importer.clean_data(data)

        if not cleaned_data:
            print("❌ No cleaned data to import. Exiting.")
            return

        # Import data
        if not importer.import_data(cleaned_data):
            print("❌ Failed to import data. Exiting.")
            return

        # Create indexes
        importer.create_indexes()

        # Get and display statistics
        stats = importer.get_statistics()
        if stats:
            print("\n📊 Import Statistics:")
            print(f"Total Synagogues: {stats['total_synagogues']}")
            print(f"Chabad Synagogues: {stats['chabad_synagogues']}")
            print(f"Young Israel Synagogues: {stats['young_israel_synagogues']}")
            print(f"Sephardic Synagogues: {stats['sephardic_synagogues']}")
            print(f"Cities: {stats['cities']}")
            print(f"Affiliations: {stats['affiliations']}")
            print(f"Affiliation Types: {', '.join(stats['affiliation_list'])}")

        print("\n🎉 Import completed successfully!")

    except Exception as e:
        print(f"❌ Unexpected error: {e}")

    finally:
        importer.close()


if __name__ == "__main__":
    main()
