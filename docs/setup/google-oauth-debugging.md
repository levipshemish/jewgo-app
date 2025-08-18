# Google OAuth Debugging Guide

## 🚨 **Current Issue**: Google OAuth still failing despite environment variables being set

### **Step 1: Check Browser Console for Specific Errors**

1. **Open browser console** (F12)
2. **Go to**: `https://jewgo-app.vercel.app/auth/supabase-signin`
3. **Click "Sign in with Google"**
4. **Look for these specific errors**:

#### **Common Error Messages:**

**Error: "org_internal"**
```
Error 403: org_internal
```
- **Cause**: OAuth consent screen set to "Internal"
- **Fix**: Change to "External" in Google Cloud Console

**Error: "redirect_uri_mismatch"**
```
Error: redirect_uri_mismatch
```
- **Cause**: Redirect URI in Google doesn't match Supabase
- **Fix**: Add exact redirect URI to Google OAuth client

**Error: "invalid_client"**
```
Error: invalid_client
```
- **Cause**: Wrong Client ID/Secret in Supabase
- **Fix**: Copy correct credentials from Google Cloud Console

**Error: "access_denied"**
```
Error: access_denied
```
- **Cause**: User denied OAuth permission
- **Fix**: User needs to accept OAuth consent

### **Step 2: Verify Google OAuth Configuration**

#### **A. Check OAuth Consent Screen**

1. **Go to Google Cloud Console**
   ```
   https://console.cloud.google.com/apis/credentials/consent
   ```

2. **Verify these settings**:
   - **User Type**: Must be "External" (not "Internal")
   - **Test Users**: Your email must be added as a test user
   - **Publishing Status**: Should be "Testing" or "In production"

#### **B. Check OAuth 2.0 Client**

1. **Go to Credentials**
   ```
   https://console.cloud.google.com/apis/credentials
   ```

2. **Find your OAuth 2.0 Client ID**
3. **Click Edit**
4. **Verify these settings**:

   **Authorized JavaScript origins:**
   ```
   https://jewgo-app.vercel.app
   http://localhost:3000
   ```

   **Authorized redirect URIs:**
   ```
   https://jewgo-app.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```

### **Step 3: Verify Supabase Configuration**

#### **A. Check Google Provider Settings**

1. **Go to Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/lgsfyrxkqpipaumngvfi
   ```

2. **Navigate to**: Authentication → Providers
3. **Find Google provider**
4. **Verify these settings**:
   - **Enabled**: Should be checked
   - **Client ID**: Should match your Google OAuth Client ID
   - **Client Secret**: Should match your Google OAuth Client Secret

#### **B. Check URL Configuration**

1. **Go to**: Authentication → URL Configuration
2. **Verify these settings**:

   **Site URL:**
   ```
   https://jewgo-app.vercel.app
   ```

   **Redirect URLs:**
   ```
   https://jewgo-app.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```

### **Step 4: Test OAuth Flow Step by Step**

#### **Test 1: Basic OAuth Flow**
1. **Clear browser cache and cookies**
2. **Open incognito/private window**
3. **Go to**: `https://jewgo-app.vercel.app/auth/supabase-signin`
4. **Click "Sign in with Google"**
5. **Check if you're redirected to Google OAuth**

#### **Test 2: Check Redirect URI**
1. **When redirected to Google, check the URL**
2. **Look for**: `redirect_uri=https://jewgo-app.vercel.app/auth/callback`
3. **Verify this matches exactly** what's in Google Cloud Console

#### **Test 3: Check Callback Processing**
1. **Complete OAuth flow**
2. **Check if redirected to**: `https://jewgo-app.vercel.app/auth/callback?code=...`
3. **Look for any errors in browser console**

### **Step 5: Common Fixes**

#### **Fix 1: OAuth Consent Screen**
```bash
# If getting "org_internal" error:
1. Go to Google Cloud Console → OAuth consent screen
2. Change "User Type" from "Internal" to "External"
3. Add your email as a test user
4. Save changes
```

#### **Fix 2: Redirect URI Mismatch**
```bash
# If getting "redirect_uri_mismatch" error:
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client
3. Add exactly: https://jewgo-app.vercel.app/auth/callback
4. Save changes
```

#### **Fix 3: Supabase Configuration**
```bash
# If getting "invalid_client" error:
1. Go to Supabase Dashboard → Authentication → Providers
2. Edit Google provider
3. Copy exact Client ID and Secret from Google Cloud Console
4. Save changes
```

### **Step 6: Debug Commands**

#### **Check Environment Variables in Production**
```bash
# The environment variables should be set in Vercel, not locally
# Check Vercel dashboard → Settings → Environment Variables
```

#### **Test Callback Endpoint**
```bash
curl -I "https://jewgo-app.vercel.app/auth/callback?code=test"
# Should return 307 redirect
```

#### **Check Supabase Auth Status**
```bash
# Go to Supabase Dashboard → Authentication → Users
# Check if any users exist
```

### **Step 7: Browser-Specific Issues**

#### **Clear Browser Data**
1. **Chrome**: Settings → Privacy and security → Clear browsing data
2. **Firefox**: Settings → Privacy & Security → Clear Data
3. **Safari**: Develop → Empty Caches

#### **Test in Different Browser**
1. **Try incognito/private mode**
2. **Try different browser**
3. **Disable browser extensions**

### **Step 8: Network Tab Debugging**

1. **Open browser DevTools → Network tab**
2. **Click "Sign in with Google"**
3. **Look for failed requests**
4. **Check response status codes and error messages**

### **Step 9: Expected Flow**

```
1. User clicks "Sign in with Google"
2. Redirect to: https://accounts.google.com/o/oauth2/auth?...
3. User completes OAuth flow
4. Redirect to: https://jewgo-app.vercel.app/auth/callback?code=...
5. Supabase exchanges code for session
6. Redirect to: https://jewgo-app.vercel.app/
7. User authenticated successfully
```

### **Step 10: If Still Not Working**

1. **Check Supabase logs**: Dashboard → Logs → Auth
2. **Check Google Cloud Console logs**: APIs & Services → OAuth consent screen → Logs
3. **Verify all configuration steps** are completed exactly
4. **Test with a different Google account**
5. **Contact support** with specific error messages

## 📞 **Quick Checklist**

- [ ] Environment variables set in Vercel
- [ ] Google OAuth consent screen set to "External"
- [ ] Test users added to OAuth consent screen
- [ ] Redirect URIs configured in Google Cloud Console
- [ ] Google provider enabled in Supabase
- [ ] Client ID and Secret configured in Supabase
- [ ] Testing in incognito mode
- [ ] Browser console checked for specific errors
