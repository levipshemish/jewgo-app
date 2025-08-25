# GitHub Repository Secrets Setup Guide

## **AI Model**: Claude Sonnet 4

## **Issue**: Missing Required Environment Variables

The CI/CD pipeline is failing because the following required environment variables are not set in your GitHub repository secrets:

- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_BACKEND_URL`
- `NEXTAUTH_URL`

## **Solution**: Add GitHub Repository Secrets

### **Step 1: Access Repository Settings**

1. Go to your GitHub repository: `https://github.com/mml555/jewgo-app`
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**

### **Step 2: Add Required Secrets**

Add the following secrets with their actual values:

#### **Required Secrets**

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `NEXTAUTH_SECRET` | Secret key for NextAuth.js authentication | `your-32-character-secret-key-here` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key for map functionality | `AIzaSyC...` |
| `NEXT_PUBLIC_BACKEND_URL` | URL of your backend API | `https://<YOUR_BACKEND_DOMAIN>` |
| `NEXTAUTH_URL` | Your application's public URL | `https://jewgo-app.vercel.app` |

#### **Optional Secrets (for deployment)**

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `VERCEL_TOKEN` | Vercel deployment token | `vercel_...` |
| `VERCEL_ORG_ID` | Vercel organization ID | `team_...` |
| `VERCEL_PROJECT_ID` | Vercel project ID | `prj_...` |
| `RENDER_API_KEY` | Render deployment API key | `rnd_...` |
| `RENDER_SERVICE_ID` | Render service ID | `srv_...` |

### **Step 3: How to Add Secrets**

1. Click **New repository secret**
2. Enter the **Name** (e.g., `NEXTAUTH_SECRET`)
3. Enter the **Value** (your actual secret value)
4. Click **Add secret**

### **Step 4: Generate Required Values**

#### **NEXTAUTH_SECRET**
Generate a secure 32-character secret:
```bash
# Option 1: Using OpenSSL
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Online generator
# Visit: https://generate-secret.vercel.app/32
```

#### **NEXT_PUBLIC_GOOGLE_MAPS_API_KEY**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Maps JavaScript API
4. Create credentials → API Key
5. Restrict the API key to your domain for security

#### **NEXT_PUBLIC_BACKEND_URL**
Use your actual backend URL (examples as placeholders):
- Production: `https://<YOUR_BACKEND_DOMAIN>`
- Staging: `https://<YOUR_STAGING_BACKEND_DOMAIN>`

#### **NEXTAUTH_URL**
Use your actual frontend URL:
- Production: `https://jewgo-app.vercel.app`
- Staging: `https://your-staging-app.vercel.app`

## **Step 5: Verify Setup**

After adding the secrets:

1. Go to **Actions** tab in your repository
2. Trigger a new workflow by pushing to `main` branch
3. Check that the build passes without environment variable errors

## **Step 6: Environment Variable Validation**

The `next.config.js` file validates these environment variables at build time:

```javascript
// Validation in next.config.js
const required = ['NEXTAUTH_SECRET', 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'NEXT_PUBLIC_BACKEND_URL'];
const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}
```

## **Step 7: Local Development**

For local development, create a `.env.local` file in the `frontend` directory:

```bash
# frontend/.env.local
NEXTAUTH_SECRET=your-local-secret-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
NEXT_PUBLIC_BACKEND_URL=http://localhost:8081
NEXTAUTH_URL=http://localhost:3000
```

## **Security Best Practices**

1. **Never commit secrets to version control**
2. **Use different secrets for different environments**
3. **Rotate secrets regularly**
4. **Restrict API keys to specific domains/IPs**
5. **Use environment-specific URLs**

## **Troubleshooting**

### **Build Still Failing?**

1. **Check secret names**: Ensure they match exactly (case-sensitive)
2. **Verify secret values**: Make sure they're not empty
3. **Check workflow logs**: Look for specific error messages
4. **Test locally**: Try building locally with the same environment variables

### **Common Issues**

1. **"Missing required environment variables"**: Add the missing secrets
2. **"Invalid API key"**: Check your Google Maps API key
3. **"Authentication failed"**: Verify NEXTAUTH_SECRET is correct
4. **"Backend connection failed"**: Check NEXT_PUBLIC_BACKEND_URL

## **Next Steps**

After setting up the secrets:

1. **Test the build**: Push a small change to trigger CI/CD
2. **Monitor deployment**: Check that Vercel deployment succeeds
3. **Verify functionality**: Test the live application
4. **Set up monitoring**: Configure error tracking and performance monitoring

---

**Status**: ✅ **READY FOR IMPLEMENTATION**
**Priority**: 🔴 **HIGH** (Required for production builds)
**Impact**: 🚫 **BLOCKS ALL DEPLOYMENTS** without these secrets
