# Supabase Setup Guide for JewGo Migration

## Overview
This guide will help you set up Supabase for the NextAuth.js to Supabase Auth migration.

## Step 1: Create Supabase Project

### 1.1 Go to Supabase Dashboard
1. Visit [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"

### 1.2 Create New Project
1. **Organization**: Select your organization
2. **Name**: `jewgo-auth` (or your preferred name)
3. **Database Password**: Create a strong password (save this!)
4. **Region**: Choose closest to your users
5. Click "Create new project"

### 1.3 Wait for Setup
- Project creation takes 2-3 minutes
- You'll receive an email when ready

## Step 2: Get Project Credentials

### 2.1 Access Project Settings
1. Go to your project dashboard
2. Click "Settings" in the left sidebar
3. Click "API" in the settings menu

### 2.2 Copy Credentials
You'll need these values:

```bash
# Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Anon/Public Key
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (keep secret!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 3: Configure Environment Variables

### 3.1 Local Development
Add to your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Keep existing NextAuth.js variables for now
NEXTAUTH_URL=https://jewgo-app.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3.2 Vercel Deployment
1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add the three Supabase variables above

### 3.3 Render Deployment (Backend)
1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add the Supabase variables

## Step 4: Configure Authentication

### 4.1 Enable Auth Providers
1. Go to Supabase Dashboard → "Authentication" → "Providers"
2. **Email**: Enable (default)
3. **Google**: Enable and configure

### 4.2 Configure Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select your project
3. Go to "APIs & Services" → "Credentials"
4. Create OAuth 2.0 Client ID
5. Add authorized redirect URIs:
   ```
   https://your-project-id.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   http://localhost:3001/auth/callback
   ```
6. Copy Client ID and Client Secret
7. Add to Supabase Google provider settings

### 4.3 Configure Auth URLs
1. Go to Supabase Dashboard → "Authentication" → "URL Configuration"
2. Add your site URLs:
   ```
   Site URL: https://jewgo-app.vercel.app
   Redirect URLs: 
   - https://jewgo-app.vercel.app/auth/callback
   - http://localhost:3000/auth/callback
   - http://localhost:3001/auth/callback
   ```

## Step 5: Test the Setup

### 5.1 Test Environment Variables
Visit: `http://localhost:3001/test-supabase`

You should see:
- ✅ All environment variables set
- No authentication errors

### 5.2 Test Authentication Flow
1. Visit: `http://localhost:3001/auth/supabase-signup`
2. Create a test account
3. Check email for verification
4. Sign in at: `http://localhost:3001/auth/supabase-signin`

### 5.3 Test Google OAuth
1. Click "Sign in with Google" on Supabase pages
2. Should redirect to Google and back to your app

## Step 6: Database Schema Setup

### 6.1 Create User Profiles Table
Run this SQL in Supabase SQL Editor:

```sql
-- Create user profiles table
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Step 7: Migration Preparation

### 7.1 Create Migration Script
Create a script to migrate existing users:

```typescript
// scripts/migrate-users.ts
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db/prisma'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function migrateUsers() {
  const users = await prisma.user.findMany()
  
  for (const user of users) {
    try {
      // Create user in Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'temporary-password', // User will reset this
        email_confirm: true,
        user_metadata: { name: user.name }
      })
      
      if (error) {
        console.error(`Failed to migrate user ${user.email}:`, error)
        continue
      }
      
      // Update profile
      await supabase
        .from('user_profiles')
        .update({ 
          is_super_admin: user.isSuperAdmin 
        })
        .eq('id', data.user.id)
      
      console.log(`✅ Migrated user: ${user.email}`)
    } catch (err) {
      console.error(`❌ Error migrating user ${user.email}:`, err)
    }
  }
}

migrateUsers()
```

## Step 8: Verification Checklist

- [ ] Supabase project created
- [ ] Environment variables configured
- [ ] Google OAuth configured
- [ ] Auth URLs configured
- [ ] Database schema created
- [ ] Test pages working
- [ ] User registration working
- [ ] User signin working
- [ ] Google OAuth working
- [ ] Migration script ready

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Check that you copied the correct keys
   - Ensure no extra spaces or characters

2. **"Redirect URI mismatch" error**
   - Verify redirect URLs in Supabase settings
   - Check Google OAuth configuration

3. **"Email not confirmed" error**
   - Check email verification settings in Supabase
   - Verify email templates

4. **"CORS error" in development**
   - Add localhost URLs to Supabase allowed origins
   - Check browser console for specific errors

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [Supabase GitHub Issues](https://github.com/supabase/supabase/issues)

## Next Steps

After completing this setup:

1. **Test thoroughly** with the test pages
2. **Run migration script** to move existing users
3. **Update application** to use Supabase auth
4. **Monitor** for any issues
5. **Remove NextAuth.js** once migration is complete

---

**Note**: Keep your NextAuth.js setup working during the migration process. Only remove it after confirming everything works with Supabase.
