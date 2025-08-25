#!/usr/bin/env python3
"""
Oracle Cloud Migration Environment Setup
=======================================

This script helps set up environment variables for migrating from Neon to Oracle Cloud PostgreSQL.
"""

import os
import sys
from dotenv import load_dotenv

def setup_environment_variables():
    """Set up environment variables for Oracle Cloud migration."""
    
    print("🔧 Oracle Cloud Migration Environment Setup")
    print("=" * 50)
    
    # Oracle Cloud database URL
    oracle_url = "postgresql://app_user:Jewgo123@141.148.50.111:5432/app_db?sslmode=require"
    
    print(f"📋 Oracle Cloud Database URL:")
    print(f"   {oracle_url}")
    print()
    
    # Get current Neon URL
    current_db_url = os.getenv("DATABASE_URL")
    if current_db_url and "neon" in current_db_url:
        neon_url = current_db_url
        print(f"📋 Current Neon Database URL (from DATABASE_URL):")
        print(f"   {neon_url}")
    else:
        print("❌ No Neon database URL found in DATABASE_URL")
        print("Please provide your Neon database URL:")
        neon_url = input("Neon Database URL: ").strip()
    
    print()
    
    # Create .env file with migration variables
    env_content = f"""# Oracle Cloud Migration Environment Variables

# Oracle Cloud PostgreSQL Database
ORACLE_DATABASE_URL={oracle_url}

# Neon Database (source for migration)
NEON_DATABASE_URL={neon_url}

# Current database (will be updated after migration)
DATABASE_URL={neon_url}

# Migration settings
MIGRATION_MODE=true
"""
    
    # Write to .env file
    with open(".env", "w") as f:
        f.write(env_content)
    
    print("✅ Environment variables written to .env file")
    print()
    
    # Display next steps
    print("📝 Next Steps:")
    print("1. Configure your Oracle Cloud server for remote access")
    print("2. Test the connection: python test_oracle_cloud_connection.py")
    print("3. Run the migration: python migrate_neon_to_oracle.py")
    print("4. Update Render DATABASE_URL to use Oracle Cloud")
    print()
    
    # Test current environment
    print("🧪 Testing current environment...")
    load_dotenv()
    
    oracle_env = os.getenv("ORACLE_DATABASE_URL")
    neon_env = os.getenv("NEON_DATABASE_URL")
    
    if oracle_env:
        print(f"✅ ORACLE_DATABASE_URL is set")
    else:
        print("❌ ORACLE_DATABASE_URL not set")
    
    if neon_env:
        print(f"✅ NEON_DATABASE_URL is set")
    else:
        print("❌ NEON_DATABASE_URL not set")
    
    print()
    print("🎯 Ready for migration setup!")

def main():
    """Main setup function."""
    try:
        setup_environment_variables()
        return True
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
