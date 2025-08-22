#!/usr/bin/env python3
"""
Generate Admin Token Script

This script generates a secure admin token for the JewGo application.
The token can be used to authenticate admin API requests.

Usage:
    python scripts/generate_admin_token.py
"""

import secrets
import hashlib
import time
import json

def generate_admin_token():
    """Generate a secure admin token."""
    # Generate a cryptographically secure random token
    token = secrets.token_urlsafe(32)
    
    # Create token info
    token_info = {
        "token": token,
        "type": "admin",
        "permissions": ["read", "write", "delete", "admin"],
        "created_at": time.time(),
        "description": "Admin token generated for JewGo application",
        "usage": "Set this as ADMIN_TOKEN environment variable in backend"
    }
    
    return token_info

def main():
    """Main function to generate and display admin token."""
    print("🔐 Generating Admin Token for JewGo Application")
    print("=" * 50)
    
    # Generate token
    token_info = generate_admin_token()
    
    print(f"✅ Admin Token Generated Successfully!")
    print(f"📅 Created: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(token_info['created_at']))}")
    print(f"🔑 Token: {token_info['token']}")
    print(f"📋 Type: {token_info['type']}")
    print(f"🔓 Permissions: {', '.join(token_info['permissions'])}")
    
    print("\n" + "=" * 50)
    print("📝 SETUP INSTRUCTIONS:")
    print("=" * 50)
    
    print("1. Backend Environment (.env):")
    print(f"   ADMIN_TOKEN={token_info['token']}")
    
    print("\n2. Frontend Environment (.env.local):")
    print(f"   ADMIN_TOKEN={token_info['token']}")
    
    print("\n3. Render Environment Variables:")
    print(f"   ADMIN_TOKEN={token_info['token']}")
    
    print("\n4. Test the token:")
    print(f"   curl -X GET 'https://jewgo-app-oyoh.onrender.com/api/admin/restaurants?limit=1' \\")
    print(f"     -H 'Authorization: Bearer {token_info['token']}' \\")
    print(f"     -H 'Content-Type: application/json'")
    
    print("\n" + "=" * 50)
    print("⚠️  SECURITY NOTES:")
    print("=" * 50)
    print("• Keep this token secure and confidential")
    print("• Don't commit it to version control")
    print("• Rotate the token regularly")
    print("• Use different tokens for different environments")
    
    # Save token info to file (optional)
    try:
        with open('admin_token_info.json', 'w') as f:
            json.dump(token_info, f, indent=2)
        print(f"\n💾 Token info saved to: admin_token_info.json")
    except Exception as e:
        print(f"\n⚠️  Could not save token info: {e}")
    
    return token_info

if __name__ == "__main__":
    main()
