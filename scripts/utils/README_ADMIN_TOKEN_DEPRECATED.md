# 🚨 DEPRECATED: Admin Token Generation

**⚠️ WARNING: This directory contains deprecated admin token utilities.**

## 🔄 Migration Required

The `generate_admin_token.py` script is **deprecated** and will be removed in the next version. 

### Why is this deprecated?

Static admin tokens have significant security limitations:
- Cannot be easily revoked
- No user tracking or audit trail  
- Manual rotation required
- Single point of failure
- No integration with modern auth providers

## ✅ Modern Alternative: Supabase Admin Roles

The JewGo application now uses **Supabase JWT-based role authentication** which provides:

- 🔐 **Automatic JWT expiration**
- 👤 **Full user audit trail**
- 🎛️ **Granular role management**
- ⚡ **Easy revocation via database**
- 🔗 **Integration with OAuth providers**

### Migration Steps

1. **Set up Supabase admin roles:**
   ```sql
   INSERT INTO admin_roles (user_id, role, is_active, assigned_by, assigned_at)
   VALUES ('user-uuid', 'super_admin', true, 'system', NOW());
   ```

2. **Remove ADMIN_TOKEN environment variables**
3. **Users authenticate via Supabase** (Google, email, etc.)
4. **Backend automatically validates JWTs** and checks admin_roles table

### Documentation

For complete setup instructions, see:
- [`docs/setup/ADMIN_SETUP.md`](../../docs/setup/ADMIN_SETUP.md)
- [`docs/authentication/SUPABASE_ROLES.md`](../../docs/authentication/SUPABASE_ROLES.md)

---

**🗑️ This script and README will be removed in the next major version.**