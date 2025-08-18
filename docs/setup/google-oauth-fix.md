# Fix Google OAuth Authentication Error

## 🚨 **Current Issue**: Google sign-in fails with authentication error

### **Error Symptoms**
- Clicking "Sign in with Google" redirects to authentication error page
- Error: "There was an issue with your authentication link"
- Possible `org_internal` error in console

## 🔧 **Step-by-Step Fix**

### **Step 1: Fix Google OAuth Consent Screen**

**This is the most common cause of the `org_internal` error:**

1. **Go to Google Cloud Console**
   ```
   https://console.cloud.google.com/
   ```

2. **Select Your Project**
   - Project: `jewgo-app` (or your project name)

3. **Navigate to OAuth Consent Screen**
   - Go to: **APIs & Services** → **OAuth consent screen**

4. **Change User Type**
   - **Current**: "Internal" (causing the error)
   - **Change to**: "External"
   - Click **Save**

5. **Add Test Users** (if External)
   - Add your email address as a test user
   - Add any other emails that need access

### **Step 2: Configure OAuth 2.0 Client**

1. **Go to Credentials**
   - Navigate to: **APIs & Services** → **Credentials**

2. **Find Your OAuth 2.0 Client**
   - Look for: **OAuth 2.0 Client IDs**
   - Find the one for your web application

3. **Edit the OAuth Client**
   - Click on your OAuth 2.0 Client ID
   - Click **Edit** (pencil icon)

4. **Add Authorized Redirect URIs**
   ```
   Authorized redirect URIs:
   - https://jewgo-app.vercel.app/auth/callback
   - http://localhost:3000/auth/callback
   ```

5. **Add Authorized JavaScript Origins**
   ```
   Authorized JavaScript origins:
   - https://jewgo-app.vercel.app
   - http://localhost:3000
   ```

6. **Save Changes**

### **Step 3: Get OAuth Credentials**

1. **Copy Client ID and Secret**
   - From the OAuth 2.0 Client page
   - Copy both **Client ID** and **Client Secret**

2. **Note the credentials** (you'll need them for Supabase)

### **Step 4: Configure Supabase Google OAuth**

1. **Go to Supabase Dashboard**
   ```
   https://supabase.com/dashboard
   ```

2. **Select Your Project**
   - Project: `lgsfyrxkqpipaumngvfi`

3. **Navigate to Authentication**
   - Go to: **Authentication** → **Providers**

4. **Configure Google Provider**
   - Find **Google** in the list
   - Click **Edit** (pencil icon)
   - **Enable** the Google provider

5. **Add Google OAuth Credentials**
   ```
   Client ID: [Paste your Google OAuth Client ID]
   Client Secret: [Paste your Google OAuth Client Secret]
   ```

6. **Save Configuration**

### **Step 5: Configure Supabase URL Settings**

1. **Go to Authentication Settings**
   - Navigate to: **Authentication** → **URL Configuration**

2. **Set Site URL**
   ```
   Site URL: https://jewgo-app.vercel.app
   ```

3. **Add Redirect URLs**
   ```
   Redirect URLs:
   - https://jewgo-app.vercel.app/auth/callback
   - http://localhost:3000/auth/callback
   ```

4. **Save Changes**

## 🧪 **Testing the Fix**

### **Test 1: Clear Browser Data**
1. **Clear cookies and cache** for `jewgo-app.vercel.app`
2. **Try in incognito/private mode**

### **Test 2: Test Google OAuth Flow**
1. **Go to**: `https://jewgo-app.vercel.app/auth/supabase-signin`
2. **Click**: "Sign in with Google"
3. **Expected**: Redirect to Google OAuth consent screen
4. **Complete**: OAuth flow
5. **Expected**: Redirect back to `/auth/callback` and then home page

### **Test 3: Check Console for Errors**
1. **Open browser console** (F12)
2. **Look for**: Any OAuth-related errors
3. **Check**: Network tab for failed requests

## 🔍 **Troubleshooting Specific Errors**

### **Error: "org_internal"**
- **Cause**: OAuth consent screen set to "Internal"
- **Fix**: Change to "External" and add test users

### **Error: "redirect_uri_mismatch"**
- **Cause**: Redirect URI in Google doesn't match Supabase
- **Fix**: Add exact redirect URI to Google OAuth client

### **Error: "invalid_client"**
- **Cause**: Wrong Client ID/Secret in Supabase
- **Fix**: Copy correct credentials from Google Cloud Console

### **Error: "access_denied"**
- **Cause**: User denied OAuth permission
- **Fix**: User needs to accept OAuth consent

## 📋 **Verification Checklist**

### **Google Cloud Console**
- [ ] OAuth consent screen set to "External"
- [ ] Test users added (if External)
- [ ] OAuth 2.0 Client ID configured
- [ ] Authorized redirect URIs added
- [ ] Authorized JavaScript origins added

### **Supabase Dashboard**
- [ ] Google provider enabled
- [ ] Client ID and Secret configured correctly
- [ ] Site URL set to production domain
- [ ] Redirect URLs configured

### **Testing**
- [ ] Google OAuth flow works in incognito mode
- [ ] No console errors during OAuth flow
- [ ] User successfully authenticated
- [ ] Redirect to home page works

## 🚀 **Expected Flow After Fix**

1. **User clicks "Sign in with Google"**
2. **Redirect to Google OAuth consent screen**
3. **User accepts permissions**
4. **Redirect to**: `https://jewgo-app.vercel.app/auth/callback?code=...`
5. **Supabase exchanges code for session**
6. **Redirect to home page**
7. **User authenticated successfully**

## 📞 **If Still Not Working**

1. **Check browser console** for specific error messages
2. **Verify all configuration steps** are completed exactly
3. **Test in incognito mode** to rule out cache issues
4. **Check Supabase logs** for authentication errors
5. **Verify Google OAuth credentials** are correct

## 🔧 **Quick Debug Commands**

Check if Supabase is configured correctly:
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Test the callback route locally:
```bash
curl "http://localhost:3000/auth/callback?code=test"
```
