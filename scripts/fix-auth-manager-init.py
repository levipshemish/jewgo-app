#!/usr/bin/env python3
"""
Fix Auth Manager Initialization Issue
This script identifies and fixes the PostgreSQL auth manager initialization problem
"""

import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

def diagnose_auth_manager_issue():
    """Diagnose why auth manager is not being initialized"""
    print("🔍 Diagnosing Auth Manager Initialization Issue...")
    
    try:
        # Test Flask app creation
        print("\n📋 Step 1: Testing Flask App Creation...")
        from app_factory_full import create_app
        
        print("  ✅ App factory import: Success")
        
        # Create app and check if auth manager gets initialized
        print("\n📋 Step 2: Creating Flask App...")
        app = create_app()
        
        print("  ✅ Flask app created")
        
        # Check if auth manager is in app config
        print("\n📋 Step 3: Checking App Config...")
        with app.app_context():
            auth_manager = app.config.get('AUTH_MANAGER')
            db_manager = app.config.get('DB_MANAGER')
            
            print(f"  AUTH_MANAGER in config: {'✅ Yes' if auth_manager else '❌ No'}")
            print(f"  DB_MANAGER in config: {'✅ Yes' if db_manager else '❌ No'}")
            
            if not auth_manager:
                print("\n🔧 Step 4: Manual Auth Manager Initialization...")
                try:
                    from utils.postgres_auth import initialize_postgres_auth
                    from database.connection_manager import get_connection_manager
                    
                    cm = get_connection_manager()
                    auth_manager = initialize_postgres_auth(cm)
                    
                    # Store in app config
                    app.config['AUTH_MANAGER'] = auth_manager
                    app.config['DB_MANAGER'] = cm
                    
                    print("  ✅ Auth manager manually initialized and stored")
                    
                    # Test OAuth service now
                    print("\n🔧 Step 5: Testing OAuth Service...")
                    from services.oauth_service_v5 import OAuthService
                    oauth_service = OAuthService(cm)
                    print("  ✅ OAuth service: Working!")
                    
                    return True
                    
                except Exception as e:
                    print(f"  ❌ Manual initialization failed: {e}")
                    return False
            else:
                print("  ✅ Auth manager already initialized")
                return True
                
    except Exception as e:
        print(f"❌ Diagnosis failed: {e}")
        import traceback
        print(f"📝 Traceback: {traceback.format_exc()}")
        return False

def main():
    print("🚀 Auth Manager Initialization Fix")
    print("=" * 50)
    
    success = diagnose_auth_manager_issue()
    
    if success:
        print("\n✅ Auth manager initialization issue diagnosed and fixed!")
        print("🔍 OAuth should now work correctly")
    else:
        print("\n❌ Could not fix auth manager initialization")
        print("🔧 Manual intervention may be required")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
