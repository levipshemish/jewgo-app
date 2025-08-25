# Fix Email Confirmation 404 Issue

## 🚨 **Issue**: Email confirmation links lead to 404 page

### **Root Cause**
The Supabase email confirmation URLs are not properly configured in the Supabase dashboard.

## 🔧 **Solution Steps**

### **Step 1: Configure Supabase Auth URLs**

1. **Go to Supabase Dashboard**
   ```
   https://supabase.com/dashboard
   ```

2. **Select Your Project**
   - Project: `<PROJECT_ID>`

3. **Navigate to Authentication Settings**
   - Go to: **Authentication** → **URL Configuration**

4. **Configure Site URLs**
   ```
   Site URL: https://<YOUR_VERCEL_APP>.vercel.app
   ```

5. **Add Redirect URLs**
   ```
   Redirect URLs:
   - https://<YOUR_VERCEL_APP>.vercel.app/auth/callback
   - http://localhost:3000/auth/callback
   - http://localhost:3001/auth/callback
   ```

6. **Save Configuration**

### **Step 2: Configure Email Templates**

1. **Go to Email Templates**
   - Navigate to: **Authentication** → **Email Templates**

2. **Configure Confirmation Email**
   - Template: **Confirm signup**
   - Update the confirmation URL to use your domain:
   ```
   https://<YOUR_VERCEL_APP>.vercel.app/auth/callback
   ```

3. **Configure Magic Link Email**
   - Template: **Magic Link**
   - Update the magic link URL:
   ```
   https://<YOUR_VERCEL_APP>.vercel.app/auth/callback
   ```

### **Step 3: Test the Fix**

1. **Create a Test Account**
   ```
   https://<YOUR_VERCEL_APP>.vercel.app/auth/supabase-signup
   ```

2. **Check Email**
   - Look for confirmation email
   - Click the confirmation link
   - Should redirect to: `https://<YOUR_VERCEL_APP>.vercel.app/auth/callback`

3. **Verify Success**
   - Should be redirected to home page
   - User should be authenticated

## 🧪 **Testing Checklist**

### **Email Confirmation Flow**
- [ ] Sign up with email/password
- [ ] Receive confirmation email
- [ ] Click confirmation link
- [ ] Redirects to `/auth/callback`
- [ ] Successfully authenticated
- [ ] Redirected to home page

### **Magic Link Flow**
- [ ] Request magic link
- [ ] Receive magic link email
- [ ] Click magic link
- [ ] Redirects to `/auth/callback`
- [ ] Successfully authenticated
- [ ] Redirected to home page

### **Google OAuth Flow**
- [ ] Click "Sign in with Google"
- [ ] Complete OAuth flow
- [ ] Redirects to `/auth/callback`
- [ ] Successfully authenticated
- [ ] Redirected to home page

## 🔍 **Troubleshooting**

### **If Still Getting 404:**

1. **Check Supabase Project URL**
   ```
   https://<PROJECT_ID>.supabase.co
   ```

2. **Verify Environment Variables**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_ID>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
   ```

3. **Check Callback Route**
   - Visit: `https://<YOUR_VERCEL_APP>.vercel.app/auth/callback`
   - Should redirect to error page (not 404)

4. **Test with Query Parameters**
   ```
   https://<YOUR_VERCEL_APP>.vercel.app/auth/callback?code=test&next=/
   ```

### **Common Issues:**

1. **Wrong Project URL**
   - Make sure you're using the correct Supabase project
   - Check the project ID in your environment variables

2. **Missing Redirect URLs**
   - All redirect URLs must be added to Supabase dashboard
   - Include both production and development URLs

3. **Email Template Issues**
   - Email templates might have hardcoded URLs
   - Update templates to use your domain

## 📋 **Verification Steps**

### **After Configuration:**

1. **Test Email Confirmation**
   ```bash
   # Sign up with test email
   https://jewgo-app.vercel.app/auth/supabase-signup
   ```

2. **Check Email Link**
   - Open email confirmation
   - Verify link points to: `https://jewgo-app.vercel.app/auth/callback`

3. **Test Authentication**
   - Click confirmation link
   - Should authenticate successfully
   - Redirect to home page

## 🎯 **Expected Behavior**

### **Successful Flow:**
1. User signs up → Email sent
2. User clicks email link → Redirects to `/auth/callback`
3. Callback processes code → User authenticated
4. Redirect to home page → User logged in

### **Error Flow:**
1. User clicks email link → Redirects to `/auth/callback`
2. Invalid/missing code → Redirects to error page
3. User sees helpful error message

## 📞 **Support**

If the issue persists after following these steps:

1. **Check Supabase Logs**
   - Go to: **Logs** → **Auth**
   - Look for authentication errors

2. **Verify Project Configuration**
   - Double-check all URLs in Supabase dashboard
   - Ensure environment variables are correct

3. **Test in Development**
   - Test locally first: `http://localhost:3000/auth/callback`
   - Then test in production
