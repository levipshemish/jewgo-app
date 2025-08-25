#!/usr/bin/env python3
"""
Database Connection Test Script
==============================

This script helps test different database connection options and diagnose connectivity issues.
"""

import os
import sys
import socket
from urllib.parse import urlparse
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

def test_network_connectivity(host, port):
    """Test basic network connectivity to a host and port."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except Exception as e:
        print(f"❌ Network test failed: {e}")
        return False

def test_database_connection(database_url, name="Database"):
    """Test database connection with a specific URL."""
    print(f"\n🔗 Testing {name} connection...")
    print(f"URL: {database_url[:50]}...")
    
    # Parse the URL to get host and port
    try:
        parsed = urlparse(database_url)
        host = parsed.hostname
        port = parsed.port or 5432
        
        # Test network connectivity first
        print(f"🌐 Testing network connectivity to {host}:{port}...")
        if test_network_connectivity(host, port):
            print(f"✅ Network connectivity to {host}:{port} is working")
        else:
            print(f"❌ Network connectivity to {host}:{port} failed")
            return False
    except Exception as e:
        print(f"❌ URL parsing failed: {e}")
        return False
    
    # Fix URL format if needed
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://")
        print("✅ Fixed database URL format from postgres:// to postgresql://")
    
    try:
        # Create engine
        engine = create_engine(
            database_url,
            echo=False,
            pool_pre_ping=True,
            connect_args={
                "connect_timeout": 30,
                "application_name": "jewgo-test",
            }
        )
        
        # Test connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1 as test_value"))
            row = result.fetchone()
            print(f"✅ {name} connection successful! Test query returned: {row[0]}")
            
            # Test PostgreSQL-specific features
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"📊 PostgreSQL version: {version}")
            
        return True
        
    except SQLAlchemyError as e:
        print(f"❌ {name} connection failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error with {name}: {e}")
        return False

def main():
    """Main function to test different database options."""
    print("🔍 Database Connectivity Test")
    print("=" * 50)
    
    # Get current DATABASE_URL
    current_url = os.getenv("DATABASE_URL")
    if current_url:
        print(f"📋 Current DATABASE_URL: {current_url[:50]}...")
        test_database_connection(current_url, "Current Database")
    else:
        print("❌ No DATABASE_URL environment variable found")
    
    # Test common cloud database options
    print("\n" + "=" * 50)
    print("🌐 Testing Common Cloud Database Options")
    print("=" * 50)
    
    # Example Neon URL (replace with your actual URL)
    neon_url = os.getenv("NEON_DATABASE_URL")
    if neon_url:
        test_database_connection(neon_url, "Neon Database")
    else:
        print("ℹ️  No NEON_DATABASE_URL found - skipping Neon test")
    
    # Example Supabase URL (replace with your actual URL)
    supabase_url = os.getenv("SUPABASE_DATABASE_URL")
    if supabase_url:
        test_database_connection(supabase_url, "Supabase Database")
    else:
        print("ℹ️  No SUPABASE_DATABASE_URL found - skipping Supabase test")
    
    # Test local database
    local_url = "postgresql://postgres:postgres@localhost:5432/postgres"
    print(f"\n🏠 Testing local database connection...")
    test_database_connection(local_url, "Local Database")
    
    print("\n" + "=" * 50)
    print("📝 Recommendations:")
    print("=" * 50)
    
    if current_url and "141.148.50.111" in current_url:
        print("⚠️  Your current DATABASE_URL points to a private IP (141.148.50.111)")
        print("   This won't work with cloud deployments like Render.")
        print("   Consider using a cloud database service like Neon or Supabase.")
    
    print("\n🔧 To fix connectivity issues:")
    print("1. Use a cloud database service (Neon, Supabase, Railway)")
    print("2. Or make your Ubuntu server publicly accessible")
    print("3. Update the DATABASE_URL environment variable in your deployment platform")
    print("4. Test the connection using this script")

if __name__ == "__main__":
    main()
