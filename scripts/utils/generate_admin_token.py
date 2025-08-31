#!/usr/bin/env python3
"""
🚨 DEPRECATED: Generate Admin Token Script

⚠️  WARNING: This script is DEPRECATED and should not be used in production.

This script generates static admin tokens, which are less secure than the new
Supabase JWT-based role authentication system.

🔄 MIGRATION: Use Supabase Admin Roles Instead
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Set up Supabase admin roles in your database:
   INSERT INTO admin_roles (user_id, role, is_active) 
   VALUES ('your-user-id', 'super_admin', true);

2. Users authenticate via Supabase (Google, email, etc.)
3. Admin access is determined by roles in admin_roles table
4. JWTs are automatically validated by the backend

For setup instructions, see:
- docs/setup/ADMIN_SETUP.md
- docs/authentication/SUPABASE_ROLES.md

🚫 This script will be removed in the next version.

Legacy Usage:
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
    print("🚨 DEPRECATED: Admin Token Generator")
    print("⚠️  This script is deprecated. Use Supabase admin roles instead.")
    print("\n" + "=" * 60)
    print("📖 MIGRATION GUIDE: Supabase Role-Based Authentication")
    print("=" * 60)
    print("")
    print("Instead of using static tokens, set up Supabase admin roles:")
    print("")
    print("1. Create admin role in Supabase:")
    print("   INSERT INTO admin_roles (user_id, role, is_active, assigned_by, assigned_at)")
    print("   VALUES ('user-uuid', 'super_admin', true, 'system', NOW());")
    print("")
    print("2. User signs in via Supabase (Google, email, etc.)")
    print("3. Backend validates JWT and checks admin_roles table")
    print("4. No static tokens needed - more secure & trackable")
    print("")
    print("See docs/setup/ADMIN_SETUP.md for complete setup guide.")
    print("\n" + "=" * 60)
    print("")
    response = input("⚠️  Continue generating deprecated token? (y/N): ")
    if response.lower() not in ['y', 'yes']:
        print("✅ Cancelled. Please migrate to Supabase admin roles.")
        return None
    print("")
    print("🔐 Generating DEPRECATED Admin Token")
    print("=" * 50)
    
    # Generate token
    token_info = generate_admin_token()
    
    print(f"✅ Admin Token Generated Successfully!")
    print(f"📅 Created: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(token_info['created_at']))}")
    print(f"🔑 Token: {token_info['token']}")
    print(f"📋 Type: {token_info['type']}")
    print(f"🔓 Permissions: {', '.join(token_info['permissions'])}")
    
    print("\n" + "=" * 60)
    print("📝 DEPRECATED SETUP INSTRUCTIONS:")
    print("⚠️  These instructions are for legacy systems only!")
    print("🔄 Migrate to Supabase admin roles for production use.")
    print("=" * 60)
    
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
    
    print("\n" + "=" * 60)
    print("🚨 SECURITY & MIGRATION NOTES:")
    print("=" * 60)
    print("⚠️  DEPRECATED TOKEN - SECURITY RISKS:")
    print("• Static tokens cannot be easily revoked")
    print("• No user tracking or audit trail")
    print("• Manual rotation required")
    print("• Single point of failure")
    print("")
    print("✅ SUPABASE ADMIN ROLES - SECURE ALTERNATIVE:")
    print("• JWT tokens automatically expire")
    print("• Full user audit trail")
    print("• Granular role management")
    print("• Easy revocation via database")
    print("• Integration with OAuth providers")
    print("")
    print("🔄 MIGRATE NOW: See docs/setup/ADMIN_SETUP.md")
    
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
