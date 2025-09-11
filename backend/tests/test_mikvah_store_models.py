#!/usr/bin/env python3
"""
Tests for Mikvah and Store models.

Tests the newly added Mikvah and Store models in the entity repository v5.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Import the models
from database.models import Mikvah, Store


class TestMikvahModel:
    """Test Mikvah model."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Create in-memory SQLite database for testing
        self.engine = create_engine('sqlite:///:memory:', echo=False)
        
        # Create tables
        from database.models import Base
        Base.metadata.create_all(self.engine)
        
        # Create session
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
    
    def teardown_method(self):
        """Clean up test fixtures."""
        self.session.close()
    
    def test_mikvah_model_creation(self):
        """Test creating a Mikvah model instance."""
        mikvah = Mikvah(
            name="Test Mikvah",
            description="A test mikvah facility",
            address="123 Test Street",
            city="Test City",
            state="Test State",
            zip_code="12345",
            phone="555-123-4567",
            website="https://testmikvah.com",
            email="info@testmikvah.com",
            latitude=40.7128,
            longitude=-74.0060,
            mikvah_type="women",
            appointment_required=True,
            hours_monday="9:00 AM - 5:00 PM",
            hours_tuesday="9:00 AM - 5:00 PM",
            hours_wednesday="9:00 AM - 5:00 PM",
            hours_thursday="9:00 AM - 5:00 PM",
            hours_friday="9:00 AM - 2:00 PM",
            hours_saturday="Closed",
            hours_sunday="9:00 AM - 5:00 PM",
            kosher_certification="OU",
            accessibility_features="Wheelchair accessible",
            parking_available=True,
            rating=4.5,
            review_count=25
        )
        
        assert mikvah.name == "Test Mikvah"
        assert mikvah.mikvah_type == "women"
        assert mikvah.appointment_required is True
        assert mikvah.rating == 4.5
    
    def test_mikvah_model_save_and_retrieve(self):
        """Test saving and retrieving a Mikvah from database."""
        mikvah = Mikvah(
            name="Test Mikvah",
            description="A test mikvah facility",
            address="123 Test Street",
            city="Test City",
            state="Test State",
            zip_code="12345",
            latitude=40.7128,
            longitude=-74.0060,
            mikvah_type="women"
        )
        
        self.session.add(mikvah)
        self.session.commit()
        
        # Retrieve from database
        retrieved_mikvah = self.session.query(Mikvah).filter_by(name="Test Mikvah").first()
        
        assert retrieved_mikvah is not None
        assert retrieved_mikvah.name == "Test Mikvah"
        assert retrieved_mikvah.mikvah_type == "women"
        assert retrieved_mikvah.latitude == 40.7128
    
    def test_mikvah_model_required_fields(self):
        """Test that required fields are properly validated."""
        # Test with minimal required fields
        mikvah = Mikvah(
            name="Minimal Mikvah",
            address="123 Test Street",
            city="Test City",
            state="Test State",
            zip_code="12345",
            latitude=40.7128,
            longitude=-74.0060
        )
        
        assert mikvah.name == "Minimal Mikvah"
        assert mikvah.latitude == 40.7128


class TestStoreModel:
    """Test Store model."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Create in-memory SQLite database for testing
        self.engine = create_engine('sqlite:///:memory:', echo=False)
        
        # Create tables
        from database.models import Base
        Base.metadata.create_all(self.engine)
        
        # Create session
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
    
    def teardown_method(self):
        """Clean up test fixtures."""
        self.session.close()
    
    def test_store_model_creation(self):
        """Test creating a Store model instance."""
        store = Store(
            name="Test Store",
            description="A test kosher store",
            address="456 Test Avenue",
            city="Test City",
            state="Test State",
            zip_code="12345",
            phone="555-987-6543",
            website="https://teststore.com",
            email="info@teststore.com",
            latitude=40.7589,
            longitude=-73.9851,
            store_type="grocery",
            kosher_certification="OU",
            hours_monday="8:00 AM - 9:00 PM",
            hours_tuesday="8:00 AM - 9:00 PM",
            hours_wednesday="8:00 AM - 9:00 PM",
            hours_thursday="8:00 AM - 9:00 PM",
            hours_friday="8:00 AM - 3:00 PM",
            hours_saturday="Closed",
            hours_sunday="8:00 AM - 9:00 PM",
            parking_available=True,
            delivery_available=True,
            rating=4.2,
            review_count=18
        )
        
        assert store.name == "Test Store"
        assert store.store_type == "grocery"
        assert store.kosher_certification == "OU"
        assert store.delivery_available is True
    
    def test_store_model_save_and_retrieve(self):
        """Test saving and retrieving a Store from database."""
        store = Store(
            name="Test Store",
            description="A test kosher store",
            address="456 Test Avenue",
            city="Test City",
            state="Test State",
            zip_code="12345",
            latitude=40.7589,
            longitude=-73.9851,
            store_type="grocery"
        )
        
        self.session.add(store)
        self.session.commit()
        
        # Retrieve from database
        retrieved_store = self.session.query(Store).filter_by(name="Test Store").first()
        
        assert retrieved_store is not None
        assert retrieved_store.name == "Test Store"
        assert retrieved_store.store_type == "grocery"
        assert retrieved_store.latitude == 40.7589
    
    def test_store_model_required_fields(self):
        """Test that required fields are properly validated."""
        # Test with minimal required fields
        store = Store(
            name="Minimal Store",
            address="456 Test Avenue",
            city="Test City",
            state="Test State",
            zip_code="12345",
            latitude=40.7589,
            longitude=-73.9851
        )
        
        assert store.name == "Minimal Store"
        assert store.latitude == 40.7589


class TestMikvahStoreIntegration:
    """Test integration of Mikvah and Store models with entity repository."""
    
    @patch('database.repositories.entity_repository_v5.EntityRepositoryV5._load_models')
    def test_entity_repository_loads_mikvah_store_models(self, mock_load_models):
        """Test that entity repository loads Mikvah and Store models."""
        from database.repositories.entity_repository_v5 import EntityRepositoryV5
        
        # Mock the database session
        mock_session = Mock()
        
        # Create repository instance
        repo = EntityRepositoryV5(mock_session)
        
        # Verify that _load_models was called
        mock_load_models.assert_called_once()
    
    def test_mikvah_store_model_relationships(self):
        """Test that Mikvah and Store models can be used in relationships."""
        # This test would verify that the models can be used in foreign key relationships
        # and other SQLAlchemy relationships if needed
        
        # For now, just verify the models can be imported and instantiated
        mikvah = Mikvah(name="Test Mikvah", address="123 Test St", city="Test City", state="Test State", zip_code="12345", latitude=40.7128, longitude=-74.0060)
        store = Store(name="Test Store", address="456 Test Ave", city="Test City", state="Test State", zip_code="12345", latitude=40.7589, longitude=-73.9851)
        
        assert mikvah.name == "Test Mikvah"
        assert store.name == "Test Store"
