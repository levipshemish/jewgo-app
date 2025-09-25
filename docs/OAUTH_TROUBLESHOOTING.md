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

### 2. Check cbid Correlation Flow
The new OAuth system uses `cbid` (correlation ID) for tracking:
- Each OAuth flow gets a unique `cbid` (e.g., `oauth_1758822715_1721801`)
- `cbid` is stored in `oauth_cbid` cookie and Redis handshake
- All logs are correlated by `cbid` for easier debugging

```bash
# Check Redis handshake data
redis-cli KEYS "oauth:cbid:*"
redis-cli GET "oauth:cbid:oauth_1758822715_1721801"

# Check logs for specific cbid
grep "oauth_1758822715_1721801" /var/log/nginx/access.log
```

### 3. Step-Level Diagnostics
The new OAuth system provides detailed step-level logging:

```bash
# Check for specific OAuth steps in logs
grep "callback_start" /var/log/backend.log
grep "handshake_load" /var/log/backend.log
grep "state_check" /var/log/backend.log
grep "pkce_check" /var/log/backend.log
grep "token_exchange" /var/log/backend.log
grep "session_write" /var/log/backend.log
```

Each step logs structured data:
- `callback_start { cbid, hasCode, hasState }`
- `handshake_load { found, ttl }`
- `state_check { equal }`
- `pkce_check { present }`
- `token_exchange { ok, status }`
- `session_write { ok }`

### 4. Verify Environment Variables
Required variables on the backend server:
```bash
FRONTEND_URL=https://jewgo.app
GOOGLE_REDIRECT_URI=https://api.jewgo.app/api/v5/auth/google/callback
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
OAUTH_STATE_SIGNING_KEY=your_32_character_signing_key
REDIS_URL=redis://localhost:6379/0
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

### Fix 5: Missing oauth_states_v5.extra_data Column (Hotfix + Migration)
**Problem:** Backend expects `oauth_states_v5.extra_data` JSONB column. If missing in production DB, callback may fail with `callback_processing_failed` and redirect to `/auth/error?error=oauth_failed`.

**Solution:**
- Code now includes a safe fallback: if the column is missing, state is stored and validated without `extra_data` to avoid breaking OAuth.
- Plan to apply the migration to add the column for full functionality.

**Migration (apply during maintenance window):**
```sql
-- backend/migrations/add_extra_data_to_oauth_states_v5.sql
ALTER TABLE oauth_states_v5
    ADD COLUMN IF NOT EXISTS extra_data JSONB;
```

**Operational steps:**
1) Backup: create a fresh DB snapshot.
2) Review and run the SQL on the production DB.
3) Verify: `SELECT column_name FROM information_schema.columns WHERE table_name='oauth_states_v5';`
4) Monitor OAuth sign-ins and logs after change.

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

### Test 4: Validate State Table and Column
```sql
SELECT COUNT(*) FROM oauth_states_v5;
SELECT return_to, consumed_at FROM oauth_states_v5 ORDER BY created_at DESC LIMIT 5;
-- Optional after migration:
SELECT jsonb_typeof(extra_data) FROM oauth_states_v5 WHERE extra_data IS NOT NULL LIMIT 5;
```

### Test 5: OAuth Canary Test
Use the canary script to test token exchange manually:
```bash
# Get authorization code from OAuth flow
# Then test token exchange
./scripts/oauth_canary.sh <authorization_code>

# The script will:
# 1. Generate PKCE verifier/challenge
# 2. Exchange code for tokens
# 3. Test profile fetch
# 4. Show detailed error information
```

## 📝 Error Code Meanings

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `oauth_denied` | User cancelled OAuth | Normal - user chose not to sign in |
| `missing_params` | No code/state in callback | Check OAuth flow, may be direct access |
| `handshake_missing` | Redis handshake not found | Check Redis connection, cbid cookie |
| `state_mismatch` | State parameter mismatch | Check handshake data integrity |
| `pkce_missing` | PKCE verifier missing | Check Redis handshake storage |
| `token_exchange_failed` | Google token exchange failed | Check credentials, redirect URI |
| `id_token_invalid` | ID token validation failed | Check nonce, audience, issuer |
| `session_write_failed` | Cookie setting failed | Check cookie policy, domain |
| `code_replayed` | Authorization code already used | Check handshake usage tracking |
| `oauth_failed` | Generic OAuth failure | Check logs for specific error |
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
