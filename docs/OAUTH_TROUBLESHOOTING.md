# OAuth Troubleshooting Guide

## 🚨 Common OAuth Error: "OAuth failed - We couldn't complete sign-in with your provider"

This error occurs when the OAuth callback fails during processing. Here are the most common causes and solutions:

## 🔍 Diagnosis Steps

### 1. Check OAuth Configuration
```bash
# Test OAuth start (should redirect to Google)
curl -I https://api.jewgo.app/api/v5/auth/google/start

# Check OAuth debug info (temporary endpoint)
curl -s https://api.jewgo.app/oauth-debug | jq .
```

### 2. Verify Environment Variables
Required variables on the backend server:
```bash
FRONTEND_URL=https://jewgo.app
GOOGLE_REDIRECT_URI=https://api.jewgo.app/api/v5/auth/google/callback
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OAUTH_STATE_SIGNING_KEY=your_32_character_signing_key
```

## 🛠️ Common Fixes

### Fix 1: Google Cloud Console Redirect URI
**Problem:** `redirect_uri_mismatch` error
**Solution:** 
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add this **exact** redirect URI:
   ```
   https://api.jewgo.app/api/v5/auth/google/callback
   ```

### Fix 2: Missing Environment Variables
**Problem:** OAuth service initialization fails
**Solution:** Run the fix script:
```bash
./scripts/fix-oauth-production.sh
```

### Fix 3: Google OAuth App Not Configured
**Problem:** OAuth consent screen not set up
**Solution:**
1. Go to Google Cloud Console → APIs & Services → OAuth consent screen
2. Configure the consent screen with:
   - App name: "JewGo"
   - User support email: your email
   - Authorized domains: `jewgo.app`
3. Add scopes: `openid`, `email`, `profile`

### Fix 4: Google Client Secret Issues
**Problem:** Invalid client credentials
**Solution:**
1. Regenerate client secret in Google Cloud Console
2. Update `GOOGLE_CLIENT_SECRET` in server environment
3. Restart backend service

## 🔧 Testing OAuth Flow

### Test 1: Start OAuth Flow
```bash
curl -I https://api.jewgo.app/api/v5/auth/google/start
# Should return 302 redirect to accounts.google.com
```

### Test 2: Check Configuration
```bash
# Extract redirect URI from OAuth URL
curl -s https://api.jewgo.app/api/v5/auth/google/start | grep -o 'redirect_uri=[^&]*'
# Should show: redirect_uri=https%3A%2F%2Fapi.jewgo.app%2Fapi%2Fv5%2Fauth%2Fgoogle%2Fcallback
```

### Test 3: Simulate Callback Error
```bash
curl -s "https://api.jewgo.app/api/v5/auth/google/callback?error=access_denied"
# Should redirect to: https://jewgo.app/auth/error?error=oauth_denied
```

## 📝 Error Code Meanings

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `oauth_denied` | User cancelled OAuth | Normal - user chose not to sign in |
| `missing_params` | No code/state in callback | Check OAuth flow, may be direct access |
| `oauth_failed` | Token exchange failed | Check Google credentials and redirect URI |
| `service_error` | OAuth service crashed | Check environment variables and logs |

## 🚀 Quick Fix Commands

```bash
# 1. Add missing environment variables
echo "FRONTEND_URL=https://jewgo.app" >> .env
echo "GOOGLE_REDIRECT_URI=https://api.jewgo.app/api/v5/auth/google/callback" >> .env

# 2. Generate OAuth state signing key
echo "OAUTH_STATE_SIGNING_KEY=$(openssl rand -hex 32)" >> .env

# 3. Deploy changes
git add .env && git commit -m "fix: add OAuth environment variables"
git push origin main

# 4. Test OAuth after deployment
curl -I https://api.jewgo.app/api/v5/auth/google/start
```

## 🔒 Security Notes

- Never commit `.env` files to Git
- Rotate OAuth credentials if compromised
- Use strong, random signing keys (32+ characters)
- Regularly audit OAuth app permissions in Google Cloud Console

## 📞 Support

If OAuth still fails after these fixes:
1. Check Google Cloud Console audit logs
2. Verify OAuth app is not restricted to internal users only
3. Ensure all required APIs are enabled (Google+ API, OAuth2 API)
4. Contact Google Cloud Support if app verification is required

---

**Last Updated:** September 16, 2025
**Status:** OAuth system functional with proper configuration
