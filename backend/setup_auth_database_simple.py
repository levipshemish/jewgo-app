#!/usr/bin/env python3
"""
Simplified setup script for PostgreSQL-based authentication system.
This script creates the necessary database tables and initializes the authentication system.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.auth_models import Base, DEFAULT_ROLES, User, Role, AdminRole
from utils.logging_config import get_logger
from werkzeug.security import generate_password_hash

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

def initialize_roles_simple(engine):
    """Initialize default roles in the database (simplified version)."""
    try:
        logger.info("Initializing default roles...")
        
        # Create session
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()
        
        try:
            # Check if roles already exist
            existing_roles = session.query(Role).count()
            if existing_roles > 0:
                logger.info(f"Roles already exist ({existing_roles} found), skipping initialization")
                return True
            
            # Create roles manually
            for role_data in DEFAULT_ROLES:
                role = Role(
                    name=role_data['name'],
                    description=role_data['description'],
                    permissions=role_data['permissions'],
                    is_active=True
                )
                session.add(role)
                logger.info(f"Created role: {role_data['name']}")
            
            session.commit()
            logger.info("Default roles initialized successfully")
            return True
                
        finally:
            session.close()
        
    except Exception as e:
        logger.error(f"Failed to initialize roles: {e}")
        return False

def create_admin_user_simple(engine, email: str, password: str):
    """Create the initial admin user (simplified version)."""
    try:
        logger.info(f"Creating admin user: {email}")
        
        # Create session
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()
        
        try:
            # Check if user already exists
            existing_user = session.query(User).filter(User.email == email.lower()).first()
            if existing_user:
                logger.info(f"Admin user {email} already exists")
                return True
            
            # Get admin role
            admin_role = session.query(Role).filter(Role.name == 'super_admin').first()
            if not admin_role:
                logger.error("Super admin role not found")
                return False
            
            # Create user
            user = User(
                email=email.lower(),
                password_hash=generate_password_hash(password),
                first_name='Admin',
                last_name='User',
                is_verified=True,
                is_active=True
            )
            
            # Add admin role
            user.roles.append(admin_role)
            
            # Create admin role record for backward compatibility
            admin_record = AdminRole(
                user_id=user.id,
                role='super_admin',
                is_active=True
            )
            
            session.add(user)
            session.add(admin_record)
            session.commit()
            
            logger.info(f"Admin user created successfully: {email}")
            return True
                
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

def verify_tables_exist(engine):
    """Verify that all required tables exist."""
    try:
        logger.info("Verifying database tables...")
        
        with engine.connect() as conn:
            # Check if users table exists
            result = conn.execute(text("SELECT COUNT(*) FROM users"))
            users_count = result.scalar()
            logger.info(f"Users table exists with {users_count} records")
            
            # Check if roles table exists
            result = conn.execute(text("SELECT COUNT(*) FROM roles"))
            roles_count = result.scalar()
            logger.info(f"Roles table exists with {roles_count} records")
            
            return True
            
    except Exception as e:
        logger.error(f"Table verification failed: {e}")
        return False

def main():
    """Main setup function."""
    print("🚀 JewGo Authentication System Setup (Simplified)")
    print("=" * 60)
    
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
    
    print("✅ Database connection successful")
    
    # Create database tables
    engine = create_database_tables(database_url)
    if not engine:
        print("❌ Failed to create database tables")
        sys.exit(1)
    
    print("✅ Database tables created successfully")
    
    # Verify tables exist
    if not verify_tables_exist(engine):
        print("❌ Table verification failed")
        sys.exit(1)
    
    print("✅ Database tables verified")
    
    # Initialize roles
    if not initialize_roles_simple(engine):
        print("❌ Failed to initialize roles")
        sys.exit(1)
    
    print("✅ Default roles initialized successfully")
    
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
    if create_admin_user_simple(engine, admin_email, admin_password):
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
