# Quick Fix: OAuth Popup Shows Supabase URL Instead of Google

## 🚨 **Problem**
When users click "Sign in with Google", the popup shows your Supabase URL instead of going directly to Google's OAuth consent screen.

## 🔧 **Quick Fix (5 minutes)**

### **Step 1: Configure Supabase Dashboard**

1. **Go to Supabase Dashboard**
   ```
   https://supabase.com/dashboard
   ```

2. **Select your project**: `lgsfyrxkqpipaumngvfi`

3. **Go to Authentication → URL Configuration**
   - Set **Site URL** to: `https://jewgo-app.vercel.app`
   - Add **Redirect URLs**:
     ```
     https://jewgo-app.vercel.app/auth/callback
     http://localhost:3000/auth/callback
     ```

### **Step 2: Configure Google Provider**

1. **Go to Authentication → Providers**
2. **Find Google provider** and click **Edit**
3. **Enable** the Google provider
4. **Add your Google OAuth credentials**:
   - **Client ID**: [Your Google OAuth Client ID]
   - **Client Secret**: [Your Google OAuth Client Secret]
5. **Set OAuth scopes** to: `email profile openid`

### **Step 3: Update Google Cloud Console**

1. **Go to Google Cloud Console**
   ```
   https://console.cloud.google.com/
   ```

2. **Navigate to APIs & Services → Credentials**
3. **Edit your OAuth 2.0 Client ID**
4. **Add Authorized redirect URIs**:
   ```
   https://lgsfyrxkqpipaumngvfi.supabase.co/auth/v1/callback
   ```

## 🧪 **Test the Fix**

1. **Go to**: `https://jewgo-app.vercel.app/auth/signin`
2. **Click**: "Continue with Google"
3. **Expected**: Popup should redirect to Google OAuth consent screen
4. **Verify**: You see your custom branding (logo, app name)

## 🔍 **Verify Popup URL**

**Correct URL** (after fix):
```
https://accounts.google.com/o/oauth2/auth?client_id=...&redirect_uri=...&response_type=code&scope=email profile openid
```

**Wrong URL** (current issue):
```
https://lgsfyrxkqpipaumngvfi.supabase.co/auth/v1/authorize?...
```

## ⚡ **Quick Commands**

```bash
# Run diagnosis script
node scripts/diagnose-oauth-popup-url.js

# Test OAuth flow
open https://jewgo-app.vercel.app/auth/signin
```

## 🚨 **If Still Not Working**

1. **Clear browser cache** and test in incognito mode
2. **Check Supabase logs** for OAuth errors
3. **Verify Google OAuth credentials** are correct
4. **Ensure redirect URIs** match exactly

## 📞 **Need Help?**

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Google Cloud Console**: https://console.cloud.google.com/
- **Full Documentation**: `docs/setup/fix-supabase-oauth-popup-url.md`
