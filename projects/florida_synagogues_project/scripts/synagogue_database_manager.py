#!/usr/bin/env python3
"""
Synagogue Database Manager for JewGo App
========================================

This module provides a comprehensive database management system for Florida synagogues,
integrating with the existing JewGo database infrastructure.

Author: JewGo Development Team
Version: 1.0
Last Updated: August 7, 2024
"""

import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

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
    and_,
    or_,
)
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker

# Import the existing database manager for consistency
try:
    from backend.database.database_manager_v3 import EnhancedDatabaseManager
except ImportError:
    # Fallback if backend is not available
    EnhancedDatabaseManager = None

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


class SynagogueDatabaseManager:
    """
    Enhanced Database Manager for Florida Synagogues.

    This class provides comprehensive database operations for synagogues,
    integrating with the existing JewGo database infrastructure.
    """

    def __init__(self, database_url: str = None):
        """Initialize the synagogue database manager."""
        if database_url:
            self.database_url = database_url
        else:
            # Try to get from environment or use default
            self.database_url = os.environ.get(
                "DATABASE_URL", "postgresql://username:password@localhost:5432/jewgo_db"
            )

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

    def get_session(self) -> Session:
        """Get database session."""
        return self.session

    def add_synagogue(self, synagogue_data: Dict[str, Any]) -> bool:
        """Add a new synagogue to the database."""
        try:
            synagogue = Synagogue(**synagogue_data)
            self.session.add(synagogue)
            self.session.commit()
            print(f"✅ Added synagogue: {synagogue_data.get('name', 'Unknown')}")
            return True

        except SQLAlchemyError as e:
            print(f"❌ Failed to add synagogue: {e}")
            self.session.rollback()
            return False

    def get_synagogues(self, limit: int = 100, offset: int = 0) -> List[Synagogue]:
        """Get all synagogues with pagination."""
        try:
            return self.session.query(Synagogue).limit(limit).offset(offset).all()
        except SQLAlchemyError as e:
            print(f"❌ Failed to get synagogues: {e}")
            return []

    def search_synagogues(
        self,
        query: str = None,
        city: str = None,
        affiliation: str = None,
        is_chabad: bool = None,
        is_young_israel: bool = None,
        is_sephardic: bool = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Search synagogues with various filters."""
        try:
            query_builder = self.session.query(Synagogue)

            # Apply filters
            if query:
                query_builder = query_builder.filter(
                    or_(
                        Synagogue.name.ilike(f"%{query}%"),
                        Synagogue.address.ilike(f"%{query}%"),
                        Synagogue.rabbi.ilike(f"%{query}%"),
                    )
                )

            if city:
                query_builder = query_builder.filter(Synagogue.city.ilike(f"%{city}%"))

            if affiliation:
                query_builder = query_builder.filter(
                    Synagogue.affiliation.ilike(f"%{affiliation}%")
                )

            if is_chabad is not None:
                query_builder = query_builder.filter(Synagogue.is_chabad == is_chabad)

            if is_young_israel is not None:
                query_builder = query_builder.filter(
                    Synagogue.is_young_israel == is_young_israel
                )

            if is_sephardic is not None:
                query_builder = query_builder.filter(
                    Synagogue.is_sephardic == is_sephardic
                )

            # Apply pagination
            synagogues = query_builder.limit(limit).offset(offset).all()

            # Convert to dictionaries
            return [self._synagogue_to_dict(synagogue) for synagogue in synagogues]

        except SQLAlchemyError as e:
            print(f"❌ Failed to search synagogues: {e}")
            return []

    def get_synagogues_by_city(
        self, city: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get all synagogues in a specific city."""
        try:
            synagogues = (
                self.session.query(Synagogue)
                .filter(Synagogue.city.ilike(f"%{city}%"))
                .limit(limit)
                .all()
            )

            return [self._synagogue_to_dict(synagogue) for synagogue in synagogues]

        except SQLAlchemyError as e:
            print(f"❌ Failed to get synagogues by city: {e}")
            return []

    def get_chabad_synagogues(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all Chabad synagogues."""
        try:
            synagogues = (
                self.session.query(Synagogue)
                .filter(Synagogue.is_chabad == True)
                .limit(limit)
                .all()
            )

            return [self._synagogue_to_dict(synagogue) for synagogue in synagogues]

        except SQLAlchemyError as e:
            print(f"❌ Failed to get Chabad synagogues: {e}")
            return []

    def get_young_israel_synagogues(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all Young Israel synagogues."""
        try:
            synagogues = (
                self.session.query(Synagogue)
                .filter(Synagogue.is_young_israel == True)
                .limit(limit)
                .all()
            )

            return [self._synagogue_to_dict(synagogue) for synagogue in synagogues]

        except SQLAlchemyError as e:
            print(f"❌ Failed to get Young Israel synagogues: {e}")
            return []

    def get_sephardic_synagogues(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get all Sephardic synagogues."""
        try:
            synagogues = (
                self.session.query(Synagogue)
                .filter(Synagogue.is_sephardic == True)
                .limit(limit)
                .all()
            )

            return [self._synagogue_to_dict(synagogue) for synagogue in synagogues]

        except SQLAlchemyError as e:
            print(f"❌ Failed to get Sephardic synagogues: {e}")
            return []

    def get_synagogue_by_id(self, synagogue_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific synagogue by ID."""
        try:
            synagogue = (
                self.session.query(Synagogue)
                .filter(Synagogue.id == synagogue_id)
                .first()
            )
            return self._synagogue_to_dict(synagogue) if synagogue else None

        except SQLAlchemyError as e:
            print(f"❌ Failed to get synagogue by ID: {e}")
            return None

    def get_synagogue_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a specific synagogue by name."""
        try:
            synagogue = (
                self.session.query(Synagogue)
                .filter(Synagogue.name.ilike(f"%{name}%"))
                .first()
            )
            return self._synagogue_to_dict(synagogue) if synagogue else None

        except SQLAlchemyError as e:
            print(f"❌ Failed to get synagogue by name: {e}")
            return None

    def update_synagogue(
        self, synagogue_id: int, synagogue_data: Dict[str, Any]
    ) -> bool:
        """Update an existing synagogue."""
        try:
            synagogue = (
                self.session.query(Synagogue)
                .filter(Synagogue.id == synagogue_id)
                .first()
            )
            if not synagogue:
                print(f"❌ Synagogue with ID {synagogue_id} not found")
                return False

            # Update fields
            for key, value in synagogue_data.items():
                if hasattr(synagogue, key):
                    setattr(synagogue, key, value)

            synagogue.updated_at = datetime.utcnow()
            self.session.commit()
            print(f"✅ Updated synagogue: {synagogue.name}")
            return True

        except SQLAlchemyError as e:
            print(f"❌ Failed to update synagogue: {e}")
            self.session.rollback()
            return False

    def delete_synagogue(self, synagogue_id: int) -> bool:
        """Delete a synagogue."""
        try:
            synagogue = (
                self.session.query(Synagogue)
                .filter(Synagogue.id == synagogue_id)
                .first()
            )
            if not synagogue:
                print(f"❌ Synagogue with ID {synagogue_id} not found")
                return False

            self.session.delete(synagogue)
            self.session.commit()
            print(f"✅ Deleted synagogue: {synagogue.name}")
            return True

        except SQLAlchemyError as e:
            print(f"❌ Failed to delete synagogue: {e}")
            self.session.rollback()
            return False

    def get_statistics(self) -> Dict[str, Any]:
        """Get comprehensive synagogue statistics."""
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
            cities = self.session.query(Synagogue.city).distinct().all()
            city_count = len(cities)

            # Affiliation breakdown
            affiliations = self.session.query(Synagogue.affiliation).distinct().all()
            affiliation_count = len(affiliations)

            # Top cities
            from sqlalchemy import func

            top_cities = (
                self.session.query(
                    Synagogue.city, func.count(Synagogue.id).label("count")
                )
                .group_by(Synagogue.city)
                .order_by(func.count(Synagogue.id).desc())
                .limit(10)
                .all()
            )

            return {
                "total_synagogues": total_count,
                "chabad_synagogues": chabad_count,
                "young_israel_synagogues": young_israel_count,
                "sephardic_synagogues": sephardic_count,
                "cities": city_count,
                "affiliations": affiliation_count,
                "affiliation_list": [aff[0] for aff in affiliations if aff[0]],
                "top_cities": [
                    {"city": city[0], "count": city[1]} for city in top_cities
                ],
            }

        except SQLAlchemyError as e:
            print(f"❌ Failed to get statistics: {e}")
            return {}

    def _synagogue_to_dict(self, synagogue: Synagogue) -> Dict[str, Any]:
        """Convert synagogue object to dictionary."""
        if not synagogue:
            return {}

        return {
            "id": synagogue.id,
            "name": synagogue.name,
            "address": synagogue.address,
            "city": synagogue.city,
            "state": synagogue.state,
            "zip_code": synagogue.zip_code,
            "rabbi": synagogue.rabbi,
            "affiliation": synagogue.affiliation,
            "phone": synagogue.phone,
            "email": synagogue.email,
            "website": synagogue.website,
            "social_media": synagogue.social_media,
            "shacharit": synagogue.shacharit,
            "mincha": synagogue.mincha,
            "maariv": synagogue.maariv,
            "shabbat": synagogue.shabbat,
            "sunday": synagogue.sunday,
            "weekday": synagogue.weekday,
            "kosher_info": synagogue.kosher_info,
            "parking": synagogue.parking,
            "accessibility": synagogue.accessibility,
            "additional_info": synagogue.additional_info,
            "url": synagogue.url,
            "data_quality_score": synagogue.data_quality_score,
            "is_chabad": synagogue.is_chabad,
            "is_young_israel": synagogue.is_young_israel,
            "is_sephardic": synagogue.is_sephardic,
            "has_address": synagogue.has_address,
            "has_zip": synagogue.has_zip,
            "latitude": synagogue.latitude,
            "longitude": synagogue.longitude,
            "created_at": (
                synagogue.created_at.isoformat() if synagogue.created_at else None
            ),
            "updated_at": (
                synagogue.updated_at.isoformat() if synagogue.updated_at else None
            ),
        }

    def health_check(self) -> bool:
        """Check database health."""
        try:
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except SQLAlchemyError:
            return False

    def close(self):
        """Close database connection."""
        if self.session:
            self.session.close()
        if self.engine:
            self.engine.dispose()
        print("🔌 Database connection closed")


def main():
    """Test the synagogue database manager."""
    print("🕍 Synagogue Database Manager Test")
    print("=" * 40)

    # Initialize manager
    manager = SynagogueDatabaseManager()

    # Connect to database
    if not manager.connect():
        print("❌ Failed to connect to database")
        return

    try:
        # Get statistics
        stats = manager.get_statistics()
        if stats:
            print("\n📊 Database Statistics:")
            print(f"Total Synagogues: {stats['total_synagogues']}")
            print(f"Chabad Synagogues: {stats['chabad_synagogues']}")
            print(f"Young Israel Synagogues: {stats['young_israel_synagogues']}")
            print(f"Sephardic Synagogues: {stats['sephardic_synagogues']}")
            print(f"Cities: {stats['cities']}")
            print(f"Affiliations: {stats['affiliations']}")

            if stats.get("top_cities"):
                print("\n🏙️ Top Cities:")
                for city in stats["top_cities"][:5]:
                    print(f"  {city['city']}: {city['count']} synagogues")

        # Test search
        print("\n🔍 Testing search functionality...")
        miami_synagogues = manager.get_synagogues_by_city("Miami", limit=5)
        print(f"Found {len(miami_synagogues)} synagogues in Miami")

        chabad_synagogues = manager.get_chabad_synagogues(limit=5)
        print(f"Found {len(chabad_synagogues)} Chabad synagogues")

        print("\n✅ Database manager test completed successfully!")

    except Exception as e:
        print(f"❌ Test failed: {e}")

    finally:
        manager.close()


if __name__ == "__main__":
    main()
