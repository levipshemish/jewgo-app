#!/usr/bin/env python3
"""
Oracle Cloud PostgreSQL Connection Test
======================================

Test connectivity to Oracle Cloud PostgreSQL database at 141.148.50.111
"""

import os
import sys
import socket
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_network_connectivity():
    """Test basic network connectivity to Oracle Cloud server."""
    host = "141.148.50.111"
    port = 5432
    
    print(f"🌐 Testing network connectivity to {host}:{port}...")
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            print(f"✅ Network connectivity to {host}:{port} is working")
            return True
        else:
            print(f"❌ Network connectivity to {host}:{port} failed")
            return False
    except Exception as e:
        print(f"❌ Network test failed: {e}")
        return False

def test_database_connection():
    """Test database connection to Oracle Cloud PostgreSQL."""
    
    # Oracle Cloud database URL
    oracle_url = "postgresql://app_user:Jewgo123@141.148.50.111:5432/app_db?sslmode=require"
    
    print(f"\n🔗 Testing Oracle Cloud database connection...")
    print(f"URL: {oracle_url[:50]}...")
    
    # Test network connectivity first
    if not test_network_connectivity():
        print("❌ Network connectivity failed - cannot test database connection")
        return False
    
    try:
        # Create engine
        engine = create_engine(
            oracle_url,
            echo=False,
            pool_pre_ping=True,
            connect_args={
                "connect_timeout": 30,
                "application_name": "jewgo-oracle-test",
            }
        )
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1 as test_value"))
            row = result.fetchone()
            print(f"✅ Oracle Cloud database connection successful! Test query returned: {row[0]}")
            
            # Test PostgreSQL-specific features
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"📊 PostgreSQL version: {version}")
            
            # Test database name
            result = conn.execute(text("SELECT current_database()"))
            db_name = result.fetchone()[0]
            print(f"🗄️  Connected to database: {db_name}")
            
            # Test user
            result = conn.execute(text("SELECT current_user"))
            user = result.fetchone()[0]
            print(f"👤 Connected as user: {user}")
            
            # List tables
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))
            tables = [row[0] for row in result.fetchall()]
            print(f"📋 Found {len(tables)} tables in database")
            
            if tables:
                print("   Tables:", ", ".join(tables[:10]) + ("..." if len(tables) > 10 else ""))
            
        return True
        
    except SQLAlchemyError as e:
        print(f"❌ Oracle Cloud database connection failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_environment_variables():
    """Test environment variable configuration."""
    print("\n🔧 Testing environment variables...")
    
    # Check if Oracle URL is set
    oracle_url_env = os.getenv("ORACLE_DATABASE_URL")
    if oracle_url_env:
        print(f"✅ ORACLE_DATABASE_URL is set: {oracle_url_env[:50]}...")
    else:
        print("ℹ️  ORACLE_DATABASE_URL not set (using hardcoded URL)")
    
    # Check if Neon URL is set (for migration)
    neon_url_env = os.getenv("NEON_DATABASE_URL")
    if neon_url_env:
        print(f"✅ NEON_DATABASE_URL is set: {neon_url_env[:50]}...")
    else:
        print("ℹ️  NEON_DATABASE_URL not set (needed for migration)")
    
    # Check current DATABASE_URL
    current_db_url = os.getenv("DATABASE_URL")
    if current_db_url:
        print(f"📋 Current DATABASE_URL: {current_db_url[:50]}...")
        if "141.148.50.111" in current_db_url:
            print("✅ DATABASE_URL points to Oracle Cloud server")
        else:
            print("⚠️  DATABASE_URL does not point to Oracle Cloud server")
    else:
        print("ℹ️  DATABASE_URL not set")

def main():
    """Main test function."""
    print("🔍 Oracle Cloud PostgreSQL Connection Test")
    print("=" * 50)
    
    # Test environment variables
    test_environment_variables()
    
    # Test database connection
    success = test_database_connection()
    
    print("\n" + "=" * 50)
    print("📝 Summary:")
    print("=" * 50)
    
    if success:
        print("✅ Oracle Cloud PostgreSQL is accessible and working!")
        print("\n🔧 Next steps:")
        print("1. Configure your Oracle Cloud server for remote access")
        print("2. Set up environment variables for migration")
        print("3. Run the migration script: python migrate_neon_to_oracle.py")
        print("4. Update DATABASE_URL in Render to use Oracle Cloud")
    else:
        print("❌ Oracle Cloud PostgreSQL connection failed")
        print("\n🔧 Troubleshooting:")
        print("1. Check Oracle Cloud server configuration")
        print("2. Verify firewall settings")
        print("3. Check Oracle Cloud security lists")
        print("4. Ensure PostgreSQL is running and configured for remote access")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
