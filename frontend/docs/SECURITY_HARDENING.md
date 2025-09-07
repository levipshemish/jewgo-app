# 🔒 Security Hardening Guide

This document outlines the comprehensive security measures implemented in the JewGo application.

> Note: References to a previous auth provider in this document are legacy from an older auth flow. The application now uses a PostgreSQL-backed authentication system with HttpOnly cookies, CSRF protection, refresh rotation, and RBAC enforced by the backend.

## 🚨 Critical Security Measures Implemented

### 1. **Environment Variables & Secrets Management**

#### ✅ **What's Implemented:**
- All sensitive environment files are properly gitignored
- `.env.example` template with placeholder values
- Real secrets stored only in untracked `.env.local` files
- Production secrets managed via deployment platform environment variables

#### ⚠️ **Action Required:**
1. Review git history for any committed real secrets
2. Set up deployment environment variables:
   - Vercel: Use Vercel dashboard environment variables
   - Netlify: Use Netlify environment variables panel
    - Render: Use Render environment variables settings
3. Backend production auth requirements:
   - `JWT_SECRET_KEY` (or `JWT_SECRET`) MUST be set (no dev fallback)
   - `REFRESH_PEPPER` MUST be set (refresh-token hash hardening)
   - Consider `COOKIE_DOMAIN` for cross-site setups (forces `SameSite=None; Secure`)

### 2. **HttpOnly Cookies & Session Security (PostgreSQL Auth)**

#### ✅ **What's Implemented:**
- Backend issues HttpOnly cookies for `access_token` and `refresh_token`
- Secure cookie settings: `SameSite=Lax`, `Secure` in production
- No localStorage token storage — tokens never touch client-side storage
- Refresh rotation with family reuse detection and revocation
- Refresh endpoint accepts cookie-based token (preferred); JSON body is optional for backward compatibility

#### 📁 **Files:**
- `lib/auth/postgres-auth.ts` — Cookie-mode client
- `middleware.ts` — Admin route protection, cookie check + backend verification
- Backend: `services/auth/cookies.py`, `services/auth/csrf.py`, `services/auth/sessions.py`

### 3. **Security Headers & CSRF Protection**

#### ✅ **What's Implemented:**
- **Content Security Policy (CSP)** with strict directives
- **CSRF protection** via origin/referer validation
- **Security headers:** `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`
- **HSTS** in production with long max-age
- **Permissions Policy** to disable unnecessary browser features

#### 📁 **Files:**
- `lib/middleware/security.ts` — Security headers builder
- `middleware.ts` — Applies headers and admin route protection

### 4. **Rate Limiting**

#### ✅ **What's Implemented:**
- **Auth endpoint limiting:** 5 attempts per 15 minutes
- **API endpoint limiting:** 100 requests per minute
- **Redis/Upstash** backend for distributed rate limiting
- **IP-based limiting** with proper proxy header handling

#### ⚠️ **Action Required:**
Set up Upstash Redis:
```bash
# Add to .env.local
UPSTASH_REDIS_REST_URL=https://your-redis-endpoint
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### 5. **CORS Configuration**

#### ✅ **What's Implemented:**
- **Strict origin validation** - no wildcards on credential endpoints
- **Proper preflight handling** for complex requests
- **Locked down to specific domains** in production

### 6. **Authentication Flow Security**

#### ✅ **What's Implemented:**

- **Anti-replay protection** for one-time token usage
- **Uniform error messages** to prevent account enumeration
- **Server actions** instead of client-side API calls

## 🛡️ RLS Policies Checklist

### ⚠️ **Action Required - Review RLS Policies:**

1. **Enable RLS on all user data tables:**
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
```

2. **Default-deny policies:**
```sql
-- Example: User profiles
CREATE POLICY "Users can only see their own profile" ON profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only update their own profile" ON profiles
FOR UPDATE USING (auth.uid() = user_id);
```

3. **Admin-only operations:**
```sql
-- Example: Admin restaurant approval
CREATE POLICY "Only admins can approve restaurants" ON restaurants
FOR UPDATE USING (
  auth.jwt() ->> 'role' = 'admin' OR 
  auth.uid() IN (SELECT user_id FROM admin_users)
);
```

## 🔧 Additional Security Measures

### **Logging & Monitoring**
- **Never log tokens or PII**
- **Mask emails in production logs**
- **Set up error monitoring** with Sentry (optional)

### **Password Security**
- Password hashing managed server-side (bcrypt)
- Email verification required for account activation
- Password reset flow secured via backend routes

### **Admin Access**
- **Server-side role checking** - never trust client flags
- **Separate admin endpoints** with additional validation
- **Admin operations logged** for audit trail

## 🧪 Testing Checklist

### **Security Testing:**
- [ ] Test rate limiting with multiple rapid requests
- [ ] Verify CSRF protection blocks cross-origin requests
- [ ] Test authentication flows with invalid tokens
- [ ] Verify RLS policies block unauthorized access
- [ ] Test admin-only endpoints with regular users

### **E2E Testing (Recommended):**
```typescript
// Example Playwright test
test('protected route redirects unauthenticated user', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL('/auth/signin');
});
```

## 🚀 Deployment Security

### **Environment Variables:**
```bash
# Production environment variables (subset)
NODE_ENV=production
NEXT_PUBLIC_BACKEND_URL=https://api.jewgo.app
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET_KEY=your-strong-secret
REFRESH_PEPPER=your-strong-pepper
ENVIRONMENT=production
# For cross-site cookie deployments
COOKIE_DOMAIN=.jewgo.app
```

### **Security Headers in Production:**
- CSP with strict directives
- HSTS with long max-age
- Secure cookies only
- No debug information leaked

## 📋 Security Maintenance

### **Regular Tasks:**
1. **Rotate secrets** every 90 days
2. **Review access logs** for suspicious activity
3. **Update dependencies** and scan for vulnerabilities
4. **Monitor rate limit hits** and adjust if needed
5. **Review RLS policies** when adding new features

### **Incident Response:**
1. **If secrets are leaked:** Rotate immediately and audit access
2. **If attack detected:** Enable additional rate limiting and logging
3. **If vulnerability found:** Patch immediately and assess impact

---

## 🎯 Implementation Status

- ✅ **Environment security:** Implemented
- ✅ **HttpOnly cookies:** Implemented  
- ✅ **Security headers:** Implemented
- ✅ **Rate limiting:** Implemented (requires Redis setup)
- ✅ **CSRF protection:** Implemented
- ✅ **Secure auth flow:** Implemented
- ⚠️ **RLS policies:** Requires manual review
- ⚠️ **Secret rotation:** Action required if any were leaked

The application now follows security best practices and is production-ready from a security standpoint!
