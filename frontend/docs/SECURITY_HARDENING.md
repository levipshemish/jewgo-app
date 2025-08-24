# 🔒 Security Hardening Guide

This document outlines the comprehensive security measures implemented in the JewGo application.

## 🚨 Critical Security Measures Implemented

### 1. **Environment Variables & Secrets Management**

#### ✅ **What's Implemented:**
- All sensitive environment files are properly gitignored
- `.env.example` template with placeholder values
- Real secrets stored only in untracked `.env.local` files
- Production secrets managed via deployment platform environment variables

#### ⚠️ **Action Required:**
1. **Check for leaked secrets:** Review git history for any committed real Supabase keys
2. **Rotate Supabase keys:** If any real keys were ever committed, rotate them immediately:
   - Go to Supabase dashboard → Settings → API
   - Regenerate Anon key and Service Role key
   - Update all deployment environments
3. **Set up deployment environment variables:**
   - Vercel: Use Vercel dashboard environment variables
   - Netlify: Use Netlify environment variables panel
   - Render: Use Render environment variables settings

### 2. **HttpOnly Cookies & Session Security**

#### ✅ **What's Implemented:**
- **`@supabase/ssr`** integration for secure cookie-based sessions
- **httpOnly cookies** prevent XSS attacks from stealing tokens
- **Secure cookie settings:** `SameSite=Lax`, `Secure` in production
- **No localStorage token storage** - tokens never touch client-side storage

#### 📁 **Files:**
- `lib/supabase/server.ts` - Server-side Supabase client
- `lib/supabase/client-secure.ts` - Client-side secure client
- `app/auth/signin/actions.ts` - Updated to use secure clients

### 3. **Security Headers & CSRF Protection**

#### ✅ **What's Implemented:**
- **Content Security Policy (CSP)** with strict directives
- **CSRF protection** via origin/referer validation
- **Security headers:** `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`
- **HSTS** in production with long max-age
- **Permissions Policy** to disable unnecessary browser features

#### 📁 **Files:**
- `middleware-security.ts` - Comprehensive security middleware
- `middleware.ts` - Updated to use security middleware

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
- **Turnstile CAPTCHA** with server-side verification
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
- **Supabase handles password hashing** (uses bcrypt)
- **Email verification required** for account activation
- **Password reset flow** secured via Supabase

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
# Production environment variables
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXTAUTH_SECRET=your-secure-random-string
UPSTASH_REDIS_REST_URL=https://your-redis-endpoint
UPSTASH_REDIS_REST_TOKEN=your-redis-token
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
