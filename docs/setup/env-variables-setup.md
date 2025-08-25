# Environment Variables Setup Guide

## Current Status

✅ **Already Configured**:
- `NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_ID>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>`

❌ **Still Need to Configure**:
- `SUPABASE_SERVICE_ROLE_KEY` (placeholder)
- `GOOGLE_CLIENT_ID` (placeholder)
- `GOOGLE_CLIENT_SECRET` (placeholder)

## Step 1: Get Supabase Service Role Key

### 1.1 Go to Supabase Dashboard
1. Visit [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: `<PROJECT_ID>`
3. Go to **Settings** → **API**

### 1.2 Copy Service Role Key
1. Find the **service_role** key (starts with `eyJ...`)
2. Copy the entire key
3. Update your `.env.local` file:

```bash
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>
```

## Step 2: Configure Google OAuth

### 2.1 Go to Google Cloud Console
1. Visit [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Go to **APIs & Services** → **Credentials**

### 2.2 Create OAuth 2.0 Client ID
1. Click **Create Credentials** → **OAuth 2.0 Client IDs**
2. Choose **Web application**
3. Add these **Authorized redirect URIs**:
   ```
   https://<PROJECT_ID>.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   http://localhost:3001/auth/callback
   https://jewgo-app.vercel.app/auth/callback
   ```

### 2.3 Copy Credentials
1. Copy the **Client ID**
2. Copy the **Client Secret**
3. Update your `.env.local` file:

```bash
GOOGLE_CLIENT_ID=<YOUR_GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<YOUR_GOOGLE_CLIENT_SECRET>
```

## Step 3: Configure Supabase Google OAuth

### 3.1 Go to Supabase Auth Settings
1. In your Supabase dashboard
2. Go to **Authentication** → **Providers**
3. Find **Google** and click **Edit**

### 3.2 Add Google Credentials
1. Enable Google provider
2. Add your Google Client ID and Client Secret
3. Save the configuration

## Step 4: Configure Auth URLs in Supabase

### 4.1 Go to URL Configuration
1. In Supabase dashboard
2. Go to **Authentication** → **URL Configuration**

### 4.2 Add Site URLs
```
Site URL: https://<YOUR_VERCEL_APP>.vercel.app
Redirect URLs:
- https://<YOUR_VERCEL_APP>.vercel.app/auth/callback
- http://localhost:3000/auth/callback
- http://localhost:3001/auth/callback
```

## Step 5: Test the Configuration

### 5.1 Test Environment Variables
Run the test script:
```bash
npm run test:auth-systems
```

### 5.2 Test Supabase Pages
Visit these pages to test:
- `http://localhost:3001/test-supabase`
- `http://localhost:3001/auth/supabase-signin`
- `http://localhost:3001/auth/supabase-signup`

## Complete .env.local Template

Here's what your complete `.env.local` should look like:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_ID>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<YOUR_SUPABASE_SERVICE_ROLE_KEY>

# NextAuth.js Configuration (keep existing)
NEXTAUTH_URL=https://<YOUR_VERCEL_APP>.vercel.app
NEXTAUTH_SECRET=<YOUR_NEXTAUTH_SECRET>
GOOGLE_CLIENT_ID=<YOUR_GOOGLE_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<YOUR_GOOGLE_CLIENT_SECRET>

# Database (keep existing)
DATABASE_URL=<YOUR_DATABASE_URL>

# Other existing variables...
```

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Check that you copied the service role key correctly
   - Ensure no extra spaces or characters

2. **"Redirect URI mismatch" error**
   - Verify redirect URLs in both Google Cloud Console and Supabase
   - Make sure URLs match exactly

3. **"Email not confirmed" error**
   - Check email verification settings in Supabase
   - Verify email templates

### Verification Commands

```bash
# Check if environment variables are loaded
npm run test:auth-systems

# Test Supabase connection
curl -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
     -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
     "https://lgsfyrxkqpipaumngvfi.supabase.co/rest/v1/"

# Check TypeScript compilation
npm run type-check
```

## Next Steps

After completing this setup:

1. **Test both systems**: Run `npm run test:auth-systems`
2. **Test user migration**: Run `npm run migrate:users` (when ready)
3. **Monitor performance**: Check both auth systems work simultaneously
4. **Begin gradual migration**: Start moving users to Supabase

---

**Estimated Time**: 30-45 minutes  
**Difficulty**: Medium  
**Risk Level**: 🟢 Low (no service disruption)
