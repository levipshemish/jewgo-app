#!/usr/bin/env python3
"""
Setup script for PostgreSQL-based authentication system.
This script creates the necessary database tables and initializes the authentication system.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.auth_models import Base, DEFAULT_ROLES
from services.auth_service import AuthService
from utils.logging_config import get_logger

logger = get_logger(__name__)

def load_environment():
    """Load environment variables."""
    # Try to load from root .env file
    root_env = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(root_env):
        load_dotenv(root_env)
        logger.info(f"Loaded environment from {root_env}")
    
    # Try to load from backend config.env
    backend_env = os.path.join(os.path.dirname(__file__), "config.env")
    if os.path.exists(backend_env):
        load_dotenv(backend_env)
        logger.info(f"Loaded environment from {backend_env}")
    
    # Check for DATABASE_URL
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL environment variable not found")
        logger.error("Please set DATABASE_URL in your environment")
        return None
    
    return database_url

def create_database_tables(database_url: str):
    """Create authentication database tables."""
    try:
        logger.info("Creating authentication database tables...")
        
        # Create engine
        engine = create_engine(database_url)
        
        # Create all tables
        Base.metadata.create_all(engine)
        
        logger.info("Database tables created successfully")
        return engine
        
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        return None

def initialize_roles(engine):
    """Initialize default roles in the database."""
    try:
        logger.info("Initializing default roles...")
        
        # Create session
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()
        
        try:
            # Create auth service
            auth_service = AuthService(session)
            
            # Initialize roles
            if auth_service.initialize_roles():
                logger.info("Default roles initialized successfully")
            else:
                logger.error("Failed to initialize roles")
                return False
                
        finally:
            session.close()
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize roles: {e}")
        return False

def create_admin_user(engine, email: str, password: str):
    """Create the initial admin user."""
    try:
        logger.info(f"Creating admin user: {email}")
        
        # Create session
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()
        
        try:
            # Create auth service
            auth_service = AuthService(session)
            
            # Create admin user
            admin_user = auth_service.create_admin_user(
                email=email,
                password=password,
                role='super_admin',
                first_name='Admin',
                last_name='User',
                is_verified=True
            )
            
            if admin_user:
                logger.info(f"Admin user created successfully: {email}")
                return True
            else:
                logger.error("Failed to create admin user")
                return False
                
        finally:
            session.close()
        
    except Exception as e:
        logger.error(f"Failed to create admin user: {e}")
        return False

def test_database_connection(database_url: str):
    """Test database connection."""
    try:
        logger.info("Testing database connection...")
        
        engine = create_engine(database_url)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            logger.info("Database connection successful")
            return True
            
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False

def main():
    """Main setup function."""
    print("🚀 JewGo Authentication System Setup")
    print("=" * 50)
    
    # Load environment
    database_url = load_environment()
    if not database_url:
        print("❌ Failed to load environment variables")
        sys.exit(1)
    
    print(f"📊 Database URL: {database_url[:50]}...")
    
    # Test database connection
    if not test_database_connection(database_url):
        print("❌ Database connection failed")
        sys.exit(1)
    
    # Create database tables
    engine = create_database_tables(database_url)
    if not engine:
        print("❌ Failed to create database tables")
        sys.exit(1)
    
    # Initialize roles
    if not initialize_roles(engine):
        print("❌ Failed to initialize roles")
        sys.exit(1)
    
    # Get admin credentials
    print("\n👤 Admin User Setup")
    print("-" * 30)
    
    admin_email = input("Admin email (default: admin@jewgo.com): ").strip()
    if not admin_email:
        admin_email = "admin@jewgo.com"
    
    admin_password = input("Admin password (default: Admin123!): ").strip()
    if not admin_password:
        admin_password = "Admin123!"
    
    # Create admin user
    if create_admin_user(engine, admin_email, admin_password):
        print("✅ Admin user created successfully")
    else:
        print("❌ Failed to create admin user")
        sys.exit(1)
    
    print("\n🎉 Authentication system setup completed!")
    print("\n📋 Next Steps:")
    print("1. Update your frontend to use the new authentication endpoints")
    print("2. Remove Supabase configuration from your environment")
    print("3. Test the new authentication system")
    print(f"4. Admin login: {admin_email} / {admin_password}")
    
    print("\n🔗 Available Endpoints:")
    print("- POST /api/auth/register - User registration")
    print("- POST /api/auth/login - User login")
    print("- POST /api/auth/refresh - Token refresh")
    print("- POST /api/auth/logout - User logout")
    print("- GET  /api/auth/me - Get current user")
    print("- GET  /api/auth/user-role - Get user role (admin)")
    print("- GET  /api/auth/health - Health check")
    
    print("\n⚠️  Security Notes:")
    print("- Change the default admin password immediately")
    print("- Ensure JWT_SECRET_KEY is set and secure")
    print("- Configure proper CORS settings")
    print("- Enable rate limiting in production")

if __name__ == "__main__":
    main()
