#!/usr/bin/env python3
"""
OAuth Debug Script
Tests OAuth service initialization and identifies failure points
"""

import os
import sys
import traceback
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

def test_oauth_service_initialization():
    """Test if OAuth service can be initialized properly"""
    print("🔍 Testing OAuth Service Initialization...")
    
    try:
        # Test environment variables
        print("\n📋 Environment Variables Check:")
        required_vars = [
            'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_SECRET', 
            'FRONTEND_URL',
            'OAUTH_STATE_SIGNING_KEY'
        ]
        
        for var in required_vars:
            value = os.getenv(var)
            if value:
                # Show first few chars for verification without exposing secrets
                display_value = f"{value[:10]}..." if len(value) > 10 else value
                print(f"  ✅ {var}: {display_value}")
            else:
                print(f"  ❌ {var}: Not set")
                return False
        
        # Test database connection
        print("\n🗄️  Database Connection Check:")
        try:
            from database.connection_manager import get_connection_manager
            cm = get_connection_manager()
            with cm.session_scope() as session:
                from sqlalchemy import text
                result = session.execute(text("SELECT 1")).scalar()
                print(f"  ✅ Database connection: Working (result: {result})")
        except Exception as e:
            print(f"  ❌ Database connection: Failed - {e}")
            return False
        
        # Test OAuth states table
        print("\n📊 OAuth States Table Check:")
        try:
            with cm.session_scope() as session:
                count = session.execute(text("SELECT COUNT(*) FROM oauth_states_v5")).scalar()
                print(f"  ✅ oauth_states_v5 table: {count} records")
        except Exception as e:
            print(f"  ❌ oauth_states_v5 table: Failed - {e}")
            return False
        
        # Test OAuth service initialization
        print("\n🔐 OAuth Service Initialization:")
        try:
            from services.oauth_service_v5 import OAuthService
            oauth_service = OAuthService(cm)
            print("  ✅ OAuth service: Initialized successfully")
            
            # Test state generation
            print("\n🎲 State Generation Test:")
            state = oauth_service.generate_secure_state('google', '/')
            print(f"  ✅ State generated: {state[:20]}...")
            
            return True
            
        except Exception as e:
            print(f"  ❌ OAuth service: Failed - {e}")
            print(f"  📝 Error details: {traceback.format_exc()}")
            return False
            
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        print(f"📝 Traceback: {traceback.format_exc()}")
        return False

def test_google_oauth_config():
    """Test Google OAuth configuration specifically"""
    print("\n🔍 Testing Google OAuth Configuration...")
    
    try:
        # Check Google OAuth environment variables
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        redirect_uri = os.getenv('GOOGLE_REDIRECT_URI')
        
        print(f"  📋 GOOGLE_CLIENT_ID: {'✅ Set' if client_id else '❌ Missing'}")
        print(f"  📋 GOOGLE_CLIENT_SECRET: {'✅ Set' if client_secret else '❌ Missing'}")
        print(f"  📋 GOOGLE_REDIRECT_URI: {redirect_uri or '❌ Missing'}")
        
        if not all([client_id, client_secret]):
            print("  ❌ Missing required Google OAuth credentials")
            return False
        
        # Test if redirect URI matches expected format
        expected_redirect = "https://api.jewgo.app/api/v5/auth/google/callback"
        if redirect_uri != expected_redirect:
            print(f"  ⚠️  GOOGLE_REDIRECT_URI mismatch:")
            print(f"      Expected: {expected_redirect}")
            print(f"      Actual: {redirect_uri}")
        
        return True
        
    except Exception as e:
        print(f"❌ Google OAuth config test failed: {e}")
        return False

def test_auth_service():
    """Test auth service initialization"""
    print("\n🔍 Testing Auth Service...")
    
    try:
        from services.auth_service_v5 import AuthServiceV5
        auth_service = AuthServiceV5()
        print("  ✅ Auth service: Initialized successfully")
        
        # Test health check
        health = auth_service.health_check()
        print(f"  📊 Auth service health: {health.get('status', 'unknown')}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Auth service: Failed - {e}")
        print(f"  📝 Error details: {traceback.format_exc()}")
        return False

def main():
    """Run all OAuth debug tests"""
    print("🚀 OAuth Debug Script Starting...")
    print("=" * 60)
    
    # Set environment variables from backend context
    os.environ.setdefault('FLASK_ENV', 'production')
    
    tests = [
        ("Environment & Database", test_oauth_service_initialization),
        ("Google OAuth Config", test_google_oauth_config),
        ("Auth Service", test_auth_service),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🧪 Running: {test_name}")
        print("-" * 40)
        try:
            result = test_func()
            results.append((test_name, result))
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"\n{status}: {test_name}")
        except Exception as e:
            print(f"\n❌ FAILED: {test_name} - {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("🎯 OAUTH DEBUG SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅" if result else "❌"
        print(f"{status} {test_name}")
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✅ All OAuth components are working correctly!")
        print("🔍 OAuth failures may be due to:")
        print("   - Invalid authorization codes from Google")
        print("   - Expired state tokens") 
        print("   - Network timeouts during token exchange")
        print("   - User canceling OAuth flow")
    else:
        print(f"\n❌ {total - passed} OAuth component(s) failing")
        print("🔧 Fix the failing components before investigating OAuth flows")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
