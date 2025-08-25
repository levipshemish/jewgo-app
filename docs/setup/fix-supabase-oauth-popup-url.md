# Fix Supabase OAuth Popup URL Issue

## 🚨 **Problem**: OAuth Popup Shows Supabase URL Instead of Google

When users click "Sign in with Google", the popup shows your Supabase URL instead of going directly to Google's OAuth consent screen. This is a common issue with Supabase OAuth configuration.

## 🔍 **Root Cause**

The issue occurs because:
1. Supabase acts as an OAuth proxy
2. The OAuth flow goes: Your App → Supabase → Google → Supabase → Your App
3. The popup URL is showing the Supabase redirect URL instead of Google's OAuth URL

## 🔧 **Solution: Configure Direct OAuth Flow**

### **Option 1: Use Supabase's OAuth Configuration (Recommended)**

#### **Step 1: Configure Supabase OAuth Settings**

1. **Go to Supabase Dashboard**
   ```
   https://supabase.com/dashboard
   ```

2. **Select Your Project**
   - Project: `lgsfyrxkqpipaumngvfi`

3. **Navigate to Authentication Settings**
   - Go to: **Authentication** → **URL Configuration**

4. **Update Site URL**
   ```
   Site URL: https://jewgo-app.vercel.app
   ```

5. **Add Redirect URLs**
   ```
   Redirect URLs:
   - https://jewgo-app.vercel.app/auth/callback
   - http://localhost:3000/auth/callback
   ```

#### **Step 2: Configure Google Provider**

1. **Go to Authentication Providers**
   - Navigate to: **Authentication** → **Providers**

2. **Edit Google Provider**
   - Find **Google** in the list
   - Click **Edit** (pencil icon)
   - **Enable** the Google provider

3. **Add Google OAuth Credentials**
   ```
   Client ID: [Your Google OAuth Client ID]
   Client Secret: [Your Google OAuth Client Secret]
   ```

4. **Configure OAuth Scopes**
   ```
   Scopes: email profile openid
   ```

#### **Step 3: Update Google Cloud Console**

1. **Go to Google Cloud Console**
   ```
   https://console.cloud.google.com/
   ```

2. **Update OAuth 2.0 Client**
   - Navigate to: **APIs & Services** → **Credentials**
   - Edit your **OAuth 2.0 Client ID**
   - Add **Authorized redirect URIs**:
     ```
     https://lgsfyrxkqpipaumngvfi.supabase.co/auth/v1/callback
     ```

### **Option 2: Use Custom OAuth Implementation (Advanced)**

If you want to bypass Supabase's OAuth proxy entirely, you can implement direct Google OAuth:

#### **Step 1: Install Google OAuth Library**

```bash
cd frontend
npm install @google-cloud/local-auth googleapis
```

#### **Step 2: Create Direct OAuth Handler**

```typescript
// frontend/lib/google-oauth.ts
export const initiateGoogleOAuth = () => {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = `${window.location.origin}/auth/callback`;
  
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=email profile openid&` +
    `access_type=offline&` +
    `prompt=consent`;
  
  window.open(googleAuthUrl, '_blank', 'width=500,height=600');
};
```

#### **Step 3: Update Sign-in Button**

```typescript
// In your sign-in component
const handleGoogleSignIn = () => {
  initiateGoogleOAuth();
};
```

## 🎯 **Recommended Approach: Option 1**

For most cases, **Option 1** is recommended because:
- ✅ Leverages Supabase's built-in OAuth handling
- ✅ Automatic token management
- ✅ Built-in security features
- ✅ Easier to maintain

## 🔧 **Configuration Checklist**

### **Supabase Dashboard**
- [ ] Site URL set to: `https://jewgo-app.vercel.app`
- [ ] Redirect URLs include: `https://jewgo-app.vercel.app/auth/callback`
- [ ] Google provider enabled
- [ ] Google OAuth credentials configured
- [ ] OAuth scopes set to: `email profile openid`

### **Google Cloud Console**
- [ ] OAuth consent screen configured
- [ ] App name set to "JewGo"
- [ ] App logo uploaded
- [ ] Authorized redirect URIs include Supabase callback
- [ ] Authorized JavaScript origins include your domain

### **Environment Variables**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set correctly
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set correctly
- [ ] Google OAuth credentials in Supabase dashboard

## 🧪 **Testing the Fix**

### **Test OAuth Flow**
1. Go to: `https://jewgo-app.vercel.app/auth/signin`
2. Click "Continue with Google"
3. **Expected**: Popup should redirect to Google OAuth consent screen
4. Complete OAuth flow
5. **Expected**: Redirect back to your app

### **Verify Popup URL**
The popup URL should be:
```
https://accounts.google.com/o/oauth2/auth?client_id=...&redirect_uri=...&response_type=code&scope=email profile openid
```

**NOT**:
```
https://lgsfyrxkqpipaumngvfi.supabase.co/auth/v1/authorize?...
```

## 🔍 **Troubleshooting**

### **Still Shows Supabase URL**
1. **Check Supabase OAuth configuration**
   - Verify Google provider is enabled
   - Check OAuth credentials are correct
   - Ensure redirect URLs are configured

2. **Check Google Cloud Console**
   - Verify authorized redirect URIs include Supabase callback
   - Check OAuth consent screen settings
   - Ensure app is not in "Internal" mode

3. **Clear Browser Cache**
   - Clear cookies and cache
   - Test in incognito mode
   - Check for cached OAuth state

### **OAuth Flow Fails**
1. **Check Supabase logs**
   - Go to Supabase Dashboard → Logs
   - Look for OAuth-related errors

2. **Check Google Cloud Console logs**
   - Go to APIs & Services → OAuth consent screen → Logs
   - Look for failed OAuth attempts

3. **Verify redirect URIs**
   - Ensure exact match between Google and Supabase
   - Check for trailing slashes or protocol mismatches

## 📋 **Verification Script**

Run the verification script to check your configuration:

```bash
node scripts/verify-google-oauth-branding.js
```

## 🚀 **Expected Result**

After fixing the configuration:

1. **Click "Continue with Google"**
2. **Popup opens** with Google OAuth consent screen
3. **Shows your custom branding** (logo, app name, description)
4. **User completes OAuth flow**
5. **Redirects back** to your app successfully

## 📞 **Support**

If you're still experiencing issues:

1. **Check Supabase documentation**: https://supabase.com/docs/guides/auth/social-login/auth-google
2. **Review Google OAuth setup**: https://developers.google.com/identity/protocols/oauth2
3. **Check Supabase logs** for specific error messages
4. **Verify all configuration steps** are completed exactly

## 🔗 **Related Documentation**

- [Google OAuth Branding Customization](./google-oauth-branding-customization.md)
- [Supabase Setup Guide](../supabase-setup-guide.md)
- [OAuth Fix Guide](./google-oauth-fix.md)
