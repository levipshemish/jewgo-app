#!/usr/bin/env python3
"""
Admin Token Generator Script - REMOVED

This script has been completely removed as legacy admin token authentication
has been deprecated in favor of Supabase JWT + role-based authentication.

To use admin authentication:
1. Set up admin roles in Supabase using the admin_roles table
2. Use Supabase JWT tokens with admin role claims
3. Use utils.security.require_admin() decorator in your routes

For more information, see:
- backend/utils/security.py for current admin authentication
- supabase/migrations/ for RBAC database schema
- backend/utils/supabase_auth.py for JWT verification
"""

print("⚠️  REMOVED: Legacy admin token generation has been removed.")
print("Use Supabase JWT + role-based authentication instead.")
print("See backend/utils/security.py for current admin authentication.")