#!/usr/bin/env python3
"""
Setup script for JewGo PostgreSQL-based authentication system.
This script creates new authentication tables that work alongside existing NextAuth tables.
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.auth_models_v2 import Base, JEWGO_DEFAULT_ROLES, JewGoUser, JewGoRole, JewGoAdminRole
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

def create_jewgo_tables(database_url: str):
    """Create JewGo authentication database tables."""
    try:
        logger.info("Creating JewGo authentication database tables...")
        
        # Create engine
        engine = create_engine(database_url)
        
        # Create all JewGo tables
        Base.metadata.create_all(engine)
        
        logger.info("JewGo database tables created successfully")
        return engine
        
    except Exception as e:
        logger.error(f"Failed to create JewGo database tables: {e}")
        return None

def initialize_jewgo_roles(engine):
    """Initialize default JewGo roles in the database."""
    try:
        logger.info("Initializing default JewGo roles...")
        
        # Create session
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()
        
        try:
            # Check if roles already exist
            existing_roles = session.query(JewGoRole).count()
            if existing_roles > 0:
                logger.info(f"JewGo roles already exist ({existing_roles} found), skipping initialization")
                return True
            
            # Create roles manually
            for role_data in JEWGO_DEFAULT_ROLES:
                role = JewGoRole(
                    name=role_data['name'],
                    description=role_data['description'],
                    permissions=role_data['permissions'],
                    is_active=True
                )
                session.add(role)
                logger.info(f"Created JewGo role: {role_data['name']}")
            
            session.commit()
            logger.info("Default JewGo roles initialized successfully")
            return True
                
        finally:
            session.close()
        
    except Exception as e:
        logger.error(f"Failed to initialize JewGo roles: {e}")
        return False

def create_jewgo_admin_user(engine, email: str, password: str):
    """Create the initial JewGo admin user."""
    try:
        logger.info(f"Creating JewGo admin user: {email}")
        
        # Create session
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()
        
        try:
            # Check if user already exists
            existing_user = session.query(JewGoUser).filter(JewGoUser.email == email.lower()).first()
            if existing_user:
                logger.info(f"JewGo admin user {email} already exists")
                return True
            
            # Get admin role
            admin_role = session.query(JewGoRole).filter(JewGoRole.name == 'super_admin').first()
            if not admin_role:
                logger.error("JewGo super admin role not found")
                return False
            
            # Create user
            user = JewGoUser(
                email=email.lower(),
                password_hash=generate_password_hash(password),
                first_name='Admin',
                last_name='User',
                is_verified=True,
                is_active=True
            )
            
            # Add user to session and flush to get the ID
            session.add(user)
            session.flush()
            
            # Verify user has an ID
            if not user.id:
                logger.error("User ID not generated")
                return False
            
            logger.info(f"Created user with ID: {user.id}")
            
            # Add admin role
            user.roles.append(admin_role)
            
            # Create admin role record for backward compatibility
            admin_record = JewGoAdminRole(
                user_id=user.id,
                role='super_admin',
                is_active=True
            )
            
            session.add(admin_record)
            session.commit()
            
            logger.info(f"JewGo admin user created successfully: {email}")
            return True
                
        finally:
            session.close()
        
    except Exception as e:
        logger.error(f"Failed to create JewGo admin user: {e}")
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

def verify_jewgo_tables_exist(engine):
    """Verify that all required JewGo tables exist."""
    try:
        logger.info("Verifying JewGo database tables...")
        
        with engine.connect() as conn:
            # Check if jewgo_users table exists
            result = conn.execute(text("SELECT COUNT(*) FROM jewgo_users"))
            users_count = result.scalar()
            logger.info(f"JewGo users table exists with {users_count} records")
            
            # Check if jewgo_roles table exists
            result = conn.execute(text("SELECT COUNT(*) FROM jewgo_roles"))
            roles_count = result.scalar()
            logger.info(f"JewGo roles table exists with {roles_count} records")
            
            return True
            
    except Exception as e:
        logger.error(f"JewGo table verification failed: {e}")
        return False

def check_existing_auth_system(engine):
    """Check what authentication system already exists."""
    try:
        logger.info("Checking existing authentication system...")
        
        with engine.connect() as conn:
            # Check existing NextAuth tables
            existing_tables = ['users', 'accounts', 'sessions', 'verification_tokens', 'admin_roles']
            for table in existing_tables:
                try:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.scalar()
                    logger.info(f"Existing {table} table: {count} records")
                except:
                    logger.info(f"Table {table} not found")
            
            return True
            
    except Exception as e:
        logger.error(f"Failed to check existing auth system: {e}")
        return False

def main():
    """Main setup function."""
    print("🚀 JewGo Authentication System Setup (Non-Conflicting)")
    print("=" * 65)
    print("This will create new authentication tables alongside your existing NextAuth system.")
    print()
    
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
    
    # Check existing authentication system
    engine = create_engine(database_url)
    if not check_existing_auth_system(engine):
        print("❌ Failed to check existing auth system")
        sys.exit(1)
    
    print("✅ Existing authentication system analyzed")
    
    # Create JewGo database tables
    if not create_jewgo_tables(database_url):
        print("❌ Failed to create JewGo database tables")
        sys.exit(1)
    
    print("✅ JewGo database tables created successfully")
    
    # Verify JewGo tables exist
    if not verify_jewgo_tables_exist(engine):
        print("❌ JewGo table verification failed")
        sys.exit(1)
    
    print("✅ JewGo database tables verified")
    
    # Initialize JewGo roles
    if not initialize_jewgo_roles(engine):
        print("❌ Failed to initialize JewGo roles")
        sys.exit(1)
    
    print("✅ Default JewGo roles initialized successfully")
    
    # Get admin credentials
    print("\n👤 JewGo Admin User Setup")
    print("-" * 35)
    
    admin_email = input("Admin email (default: admin@jewgo.com): ").strip()
    if not admin_email:
        admin_email = "admin@jewgo.com"
    
    admin_password = input("Admin password (default: Admin123!): ").strip()
    if not admin_password:
        admin_password = "Admin123!"
    
    # Create JewGo admin user
    if create_jewgo_admin_user(engine, admin_email, admin_password):
        print("✅ JewGo admin user created successfully")
    else:
        print("❌ Failed to create JewGo admin user")
        sys.exit(1)
    
    print("\n🎉 JewGo Authentication system setup completed!")
    print("\n📋 What was created:")
    print("- jewgo_users table (separate from existing users)")
    print("- jewgo_roles table (separate from existing roles)")
    print("- jewgo_user_sessions table (for JWT management)")
    print("- jewgo_password_reset_tokens table")
    print("- jewgo_admin_roles table")
    print(f"- Admin user: {admin_email}")
    
    print("\n📋 Next Steps:")
    print("1. Your existing NextAuth system remains untouched")
    print("2. New authentication endpoints use the JewGo tables")
    print("3. Update your frontend to use the new authentication endpoints")
    print("4. Test the new authentication system")
    print(f"5. Admin login: {admin_email} / {admin_password}")
    
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
    print("- Your existing users and data are preserved")

if __name__ == "__main__":
    main()
