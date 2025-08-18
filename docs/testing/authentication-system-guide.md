# Authentication System Guide

## 🔐 **Dual Authentication System**

JewGo currently supports **two authentication systems** running in parallel:

### **1. NextAuth.js (Current Production System)**
- **Status**: ✅ **Fully Functional**
- **Sign In**: `/auth/signin`
- **Sign Up**: `/auth/signup`
- **Database**: Neon PostgreSQL with Prisma
- **Features**: Email/password, Google OAuth

### **2. Supabase Auth (Testing/New System)**
- **Status**: 🧪 **In Testing**
- **Sign In**: `/auth/supabase-signin`
- **Sign Up**: `/auth/supabase-signup`
- **Database**: Supabase PostgreSQL
- **Features**: Email/password, Magic Link, Google OAuth

## 🎯 **Which System Should You Use?**

### **For Production Use:**
- **Use NextAuth.js** (`/auth/signin` and `/auth/signup`)
- **Fully tested and stable**
- **All features working**

### **For Testing New Features:**
- **Use Supabase** (`/auth/supabase-signin` and `/auth/supabase-signup`)
- **Testing new authentication flow**
- **May have configuration issues**

## 🚨 **Current Issues & Solutions**

### **Issue 1: NextAuth.js 401 Error**
**Problem**: `POST https://jewgo-app.vercel.app/api/auth/callback/credentials 401 (Unauthorized)`

**Cause**: You're using NextAuth.js signin page but the credentials provider isn't properly configured.

**Solution**: 
1. **Use Supabase auth instead**: Go to `/auth/supabase-signin`
2. **Or configure NextAuth.js properly**: Check environment variables

### **Issue 2: Redirect to Eatery Page**
**Problem**: After sign-in, users are redirected to `/eatery` instead of home page.

**Solution**: 
- **Fixed**: Home page now shows proper landing page for unauthenticated users
- **Authenticated users** are redirected to `/eatery` (intended behavior)
- **Unauthenticated users** see the landing page with authentication options

## 🧪 **Testing Instructions**

### **Test Supabase Authentication:**

1. **Go to Supabase Sign In**
   ```
   https://jewgo-app.vercel.app/auth/supabase-signin
   ```

2. **Test Email/Password Sign Up**
   - Use `/auth/supabase-signup`
   - Enter email and password
   - Check email for confirmation link
   - Click confirmation link
   - Should redirect to home page

3. **Test Magic Link**
   - Use `/auth/supabase-signin`
   - Enter email address
   - Click "Send Magic Link"
   - Check email for magic link
   - Click magic link
   - Should redirect to home page

4. **Test Google OAuth**
   - Click "Sign in with Google"
   - Complete OAuth flow
   - Should redirect to home page

### **Test NextAuth.js Authentication:**

1. **Go to NextAuth Sign In**
   ```
   https://jewgo-app.vercel.app/auth/signin
   ```

2. **Test Email/Password**
   - Enter credentials
   - Should redirect to home page

3. **Test Google OAuth**
   - Click "Sign in with Google"
   - Complete OAuth flow
   - Should redirect to home page

## 📊 **Expected Behavior**

### **After Successful Authentication:**

1. **Supabase Auth**:
   - User signs in → Redirects to `/` (home page)
   - Home page detects authenticated user → Redirects to `/eatery`
   - User sees eatery page

2. **NextAuth.js**:
   - User signs in → Redirects to `/` (home page)
   - Home page detects authenticated user → Redirects to `/eatery`
   - User sees eatery page

### **For Unauthenticated Users:**

1. **Visit Home Page** (`/`):
   - Shows landing page with authentication options
   - No automatic redirect to eatery
   - Clear choice between NextAuth.js and Supabase

## 🔧 **Troubleshooting**

### **If Supabase Auth Doesn't Work:**

1. **Check Environment Variables**
   ```bash
   npm run check:env
   ```

2. **Test Supabase Configuration**
   ```
   https://jewgo-app.vercel.app/test-supabase
   ```

3. **Check Email Confirmation**
   - Verify Supabase URL configuration
   - Check email templates

### **If NextAuth.js Doesn't Work:**

1. **Check Environment Variables**
   - `NEXTAUTH_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `DATABASE_URL`

2. **Use Supabase Instead**
   - NextAuth.js may have configuration issues
   - Supabase is the future authentication system

## 🎯 **Recommendation**

### **For Users:**
- **Use Supabase authentication** (`/auth/supabase-signin`)
- **More reliable** and **future-proof**
- **Better error handling**

### **For Developers:**
- **Test Supabase thoroughly**
- **Fix any configuration issues**
- **Plan migration from NextAuth.js**

## 📞 **Support**

If you encounter issues:

1. **Check the test page**: `/test-supabase`
2. **Try both authentication systems**
3. **Report specific error messages**
4. **Check browser console for errors**

## 🚀 **Future Plans**

1. **Complete Supabase migration**
2. **Remove NextAuth.js dependencies**
3. **Unified authentication experience**
4. **Enhanced user profiles**
