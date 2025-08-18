#!/usr/bin/env python3
"""
Test script to verify geolocation permissions policy fix
"""

import requests
import sys
import time
from urllib.parse import urljoin

def test_geolocation_permissions():
    """Test that geolocation permissions are properly configured"""
    
    # Test URLs
    base_url = "https://jewgo-app.vercel.app"
    test_urls = [
        "/",
        "/eatery",
        "/live-map",
        "/restaurant"
    ]
    
    print("🔍 Testing Geolocation Permissions Policy...")
    print(f"Base URL: {base_url}")
    print("-" * 50)
    
    all_passed = True
    
    for url in test_urls:
        full_url = urljoin(base_url, url)
        print(f"\n📄 Testing: {full_url}")
        
        try:
            response = requests.get(full_url, timeout=10)
            
            if response.status_code == 200:
                # Check for Permissions-Policy header
                permissions_policy = response.headers.get('Permissions-Policy', '')
                
                print(f"✅ Status: {response.status_code}")
                print(f"🔒 Permissions-Policy: {permissions_policy}")
                
                # Check if geolocation is allowed for self
                if 'geolocation=(self)' in permissions_policy:
                    print("✅ Geolocation permissions correctly configured")
                elif 'geolocation=()' in permissions_policy:
                    print("❌ Geolocation is blocked - this will cause the violation error")
                    all_passed = False
                else:
                    print("⚠️  Geolocation policy not explicitly set")
                
                # Check X-Frame-Options
                x_frame_options = response.headers.get('X-Frame-Options', '')
                print(f"🖼️  X-Frame-Options: {x_frame_options}")
                
                if x_frame_options == 'ALLOWALL':
                    print("✅ X-Frame-Options correctly set to ALLOWALL")
                else:
                    print("⚠️  X-Frame-Options may cause frame display issues")
                
            else:
                print(f"❌ Status: {response.status_code}")
                all_passed = False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Error accessing {full_url}: {e}")
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 All tests passed! Geolocation should work correctly.")
        print("\n📋 Next steps:")
        print("1. Clear your browser cache")
        print("2. Reload the page")
        print("3. Try using location-based features")
        print("4. Check browser console for geolocation errors")
    else:
        print("❌ Some tests failed. Please check the configuration.")
        print("\n🔧 Troubleshooting:")
        print("1. Ensure the deployment has completed")
        print("2. Check that next.config.js changes are deployed")
        print("3. Verify _headers file is not being overridden")
    
    return all_passed

def test_browser_console_check():
    """Provide instructions for manual browser testing"""
    
    print("\n" + "=" * 50)
    print("🔍 MANUAL BROWSER TESTING")
    print("=" * 50)
    print("To verify the fix works in your browser:")
    print()
    print("1. Open browser developer tools (F12)")
    print("2. Go to Console tab")
    print("3. Navigate to https://jewgo-app.vercel.app")
    print("4. Look for geolocation-related errors")
    print("5. Try using location-based features")
    print()
    print("Expected behavior:")
    print("✅ No 'Permissions policy violation' errors")
    print("✅ Geolocation permission prompt appears")
    print("✅ Location-based features work correctly")
    print()
    print("If you still see errors:")
    print("- Clear browser cache and cookies")
    print("- Try in incognito/private mode")
    print("- Check if browser extensions are blocking geolocation")

if __name__ == "__main__":
    print("🚀 Geolocation Permissions Policy Test")
    print("Testing fix for: [Violation] Permissions policy violation: Geolocation access has been blocked")
    print()
    
    success = test_geolocation_permissions()
    test_browser_console_check()
    
    sys.exit(0 if success else 1)
