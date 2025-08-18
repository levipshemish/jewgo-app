# Quick Environment Variables Setup

## Current Status ✅

You have **3 out of 7** environment variables configured correctly:

✅ **Working**:
- `NEXT_PUBLIC_SUPABASE_URL=https://lgsfyrxkqpipaumngvfi.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_0iwWwM0kEGMnDApN5BYfZg_lIXWnD_n`
- `NEXTAUTH_URL=https://jewgo-app.vercel.app`

## What You Need to Configure 🔧

### 1. Supabase Service Role Key (5 minutes)

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: `lgsfyrxkqpipaumngvfi`
3. Go to **Settings** → **API**
4. Copy the **service_role** key (starts with `eyJ...`)
5. Update your `.env.local`:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-actual-key-here
```

### 2. NextAuth Secret (2 minutes)

Generate a secure secret and update your `.env.local`:

```bash
NEXTAUTH_SECRET=your-secure-secret-here-make-it-long-and-random
```

**Quick way**: Use this command to generate a secret:
```bash
openssl rand -base64 32
```

### 3. Google OAuth (15 minutes)

#### 3.1 Create Google OAuth Credentials
1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Create or select your project
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client IDs**
5. Choose **Web application**
6. Add these **Authorized redirect URIs**:
   ```
   https://lgsfyrxkqpipaumngvfi.supabase.co/auth/v1/callback
   http://localhost:3000/auth/callback
   http://localhost:3001/auth/callback
   https://jewgo-app.vercel.app/auth/callback
   ```

#### 3.2 Copy Credentials
1. Copy the **Client ID** and **Client Secret**
2. Update your `.env.local`:

```bash
GOOGLE_CLIENT_ID=your-actual-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret
```

#### 3.3 Configure in Supabase
1. Go to your Supabase dashboard
2. Go to **Authentication** → **Providers**
3. Find **Google** and click **Edit**
4. Enable Google provider
5. Add your Google Client ID and Client Secret
6. Save the configuration

## Test Your Setup

After configuring all variables, run:

```bash
npm run check:env
```

You should see:
```
✅ Configured: 7/7
❌ Missing: 0/7
```

Then test the authentication systems:

```bash
npm run test:auth-systems
```

## Quick Commands

```bash
# Check environment variables
npm run check:env

# Test both auth systems
npm run test:auth-systems

# Test Supabase specifically
npm run supabase:test

# Type checking
npm run type-check
```

## Troubleshooting

### "Invalid API key" error
- Check that you copied the service role key correctly
- Ensure no extra spaces or characters

### "Redirect URI mismatch" error
- Verify redirect URLs in both Google Cloud Console and Supabase
- Make sure URLs match exactly

### Environment variables not loading
- Make sure you're editing `.env.local` (not `.env`)
- Restart your development server after changes

---

**Estimated Time**: 20-30 minutes  
**Difficulty**: Easy  
**Risk Level**: 🟢 Very Low
