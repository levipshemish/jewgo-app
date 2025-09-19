#!/usr/bin/env python3
"""
Fix OAuth Auth Manager Initialization
This script fixes the PostgreSQL auth manager initialization issue causing OAuth failures
"""

import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

def fix_auth_manager_initialization():
    """Fix the auth manager initialization issue"""
    print("🔧 Fixing OAuth Auth Manager Initialization...")
    
    try:
        # Test if we can initialize the auth manager manually and store it globally
        print("\n🔍 Step 1: Initialize auth manager...")
        from database.connection_manager import get_connection_manager
        from utils.postgres_auth import initialize_postgres_auth, set_global_postgres_auth
        
        cm = get_connection_manager()
        auth_manager = initialize_postgres_auth(cm)
        
        # Set the auth manager globally so OAuth service can access it
        set_global_postgres_auth(auth_manager)
        
        print("  ✅ Auth manager initialized and set globally")
        
        # Test OAuth service initialization
        print("\n🔍 Step 2: Test OAuth service...")
        from services.oauth_service_v5 import OAuthService
        oauth_service = OAuthService(cm)
        print("  ✅ OAuth service initialized successfully")
        
        # Test state generation
        print("\n🔍 Step 3: Test OAuth state generation...")
        state = oauth_service.generate_secure_state('google', '/')
        print(f"  ✅ OAuth state generated: {state[:20]}...")
        
        print("\n✅ OAuth auth manager fix completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ Fix failed: {e}")
        import traceback
        print(f"📝 Traceback: {traceback.format_exc()}")
        return False

def main():
    print("🚀 OAuth Auth Manager Fix Script")
    print("=" * 50)
    
    success = fix_auth_manager_initialization()
    
    if success:
        print("\n🎉 OAuth should now work correctly!")
        print("🔄 Restart the backend service to apply the fix:")
        print("   docker compose restart backend")
    else:
        print("\n❌ Fix failed - manual intervention required")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
