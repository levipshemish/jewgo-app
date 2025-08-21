# Apple OAuth Supabase Dashboard Configuration Guide

## 🍎 **Complete Setup Process**

### **Step 1: Apple Developer Console Setup**

#### **1.1 Create Apple Services ID**
1. Go to [Apple Developer Console](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** → **+** → **Services IDs**
4. Fill in the form:
   - **Description**: `JewGo App Authentication`
   - **Identifier**: `com.jewgo.app.auth` (or your domain)
   - **Services**: Check **Sign In with Apple**
5. Click **Continue** → **Register**

#### **1.2 Configure Sign In with Apple**
1. Click on your newly created Services ID
2. Scroll to **Sign In with Apple** section
3. Click **Configure**
4. **Primary App ID**: Select your app's bundle ID
5. **Domains and Subdomains**: Add your domain
   - `jewgo.app`
   - `www.jewgo.app`
6. **Return URLs**: Add your Supabase callback URL
   - `https://your-project.supabase.co/auth/v1/callback`
   - `https://jewgo.app/auth/callback`
7. Click **Save** → **Continue** → **Register**

#### **1.3 Generate Client Secret**
1. In Apple Developer Console, go to **Keys**
2. Click **+** → **Sign In with Apple**
3. **Key Name**: `JewGo Apple OAuth Key`
4. **Primary App ID**: Select your app
5. Click **Configure** → **Save** → **Continue** → **Register**
6. **Download the key file** (`.p8` format)
7. **Note the Key ID** (you'll need this)

#### **1.4 Generate JWT Client Secret**
```bash
# Install the JWT generator
npm install -g jsonwebtoken

# Generate the client secret
node -e "
const jwt = require('jsonwebtoken');
const fs = require('fs');

const privateKey = fs.readFileSync('./AuthKey_XXXXXXXXXX.p8');
const teamId = 'YOUR_TEAM_ID'; // From Apple Developer Console
const keyId = 'YOUR_KEY_ID';   // From the key you created
const clientId = 'com.jewgo.app.auth'; // Your Services ID

const token = jwt.sign({}, privateKey, {
  algorithm: 'ES256',
  expiresIn: '180d',
  audience: 'https://appleid.apple.com',
  issuer: teamId,
  subject: clientId,
  keyid: keyId
});

console.log('Client Secret:', token);
"
```

### **Step 2: Supabase Dashboard Configuration**

#### **2.1 Enable Apple Provider**
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Apple** in the list
5. Toggle **Enable** to turn it on

#### **2.2 Configure Apple OAuth Settings**
Fill in the following fields:

- **Client ID**: `com.jewgo.app.auth` (your Services ID)
- **Client Secret**: The JWT token you generated above
- **Redirect URL**: `https://jewgo.app/auth/callback`

#### **2.3 Additional Settings**
- **Scopes**: `email name` (default)
- **Enable Sign Up**: ✅ Checked
- **Enable Sign In**: ✅ Checked

### **Step 3: Environment Variables**

#### **3.1 Production Environment**
Add these to your production environment variables:

```bash
# Apple OAuth Configuration (Server-side only)
APPLE_CLIENT_ID=com.jewgo.app.auth
APPLE_CLIENT_SECRET=your_jwt_client_secret_here
APPLE_TEAM_ID=your_team_id_here
APPLE_KEY_ID=your_key_id_here

# Feature Flags
NEXT_PUBLIC_APPLE_OAUTH_ENABLED=true
APPLE_OAUTH_ENABLED=true
```

#### **3.2 Local Development**
For local testing, you can use placeholder values:

```bash
# Apple OAuth Feature Flags (Local)
NEXT_PUBLIC_APPLE_OAUTH_ENABLED=true
APPLE_OAUTH_ENABLED=true

# Placeholder values for development
APPLE_CLIENT_ID=com.jewgo.app.auth.dev
APPLE_CLIENT_SECRET=placeholder_jwt_secret
APPLE_TEAM_ID=placeholder_team_id
APPLE_KEY_ID=placeholder_key_id
```

### **Step 4: Testing Configuration**

#### **4.1 Test OAuth Flow**
1. Go to your app's sign-in page
2. Click "Sign in with Apple"
3. You should be redirected to Apple's authentication
4. After authentication, you should be redirected back to your app

#### **4.2 Common Issues**
- **Invalid redirect URL**: Make sure the URL in Apple Developer Console matches Supabase
- **Invalid client secret**: Ensure the JWT is properly formatted and not expired
- **CORS issues**: Check that your domain is properly configured in Apple Developer Console

### **Step 5: Production Deployment**

#### **5.1 Update Environment Variables**
1. **Vercel**: Add to Project Settings → Environment Variables
2. **Netlify**: Add to Site Settings → Environment Variables
3. **Railway**: Add to Project Variables
4. **Render**: Add to Environment Variables section

#### **5.2 Update Redirect URLs**
1. **Apple Developer Console**: Add production domain
2. **Supabase Dashboard**: Update redirect URL to production domain

## 🔧 **Troubleshooting**

### **Common Error Messages**

#### **"Invalid client"**
- Check that your Client ID matches between Apple and Supabase
- Ensure the Services ID is properly configured

#### **"Invalid redirect URI"**
- Verify the redirect URL in Apple Developer Console
- Check that the domain is properly configured

#### **"Invalid client secret"**
- Regenerate the JWT client secret
- Ensure the key file is properly formatted
- Check that the key hasn't expired

### **Testing Checklist**
- [ ] Apple Services ID created
- [ ] Sign In with Apple configured
- [ ] Client secret generated
- [ ] Supabase Apple provider enabled
- [ ] Redirect URLs configured
- [ ] Environment variables set
- [ ] OAuth flow tested

## 📞 **Support**

If you encounter issues:
1. Check the [Apple Developer Documentation](https://developer.apple.com/documentation/sign_in_with_apple)
2. Review [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-apple)
3. Check the troubleshooting section above
4. Contact support if issues persist

---

**Note**: This configuration is for production use. For development, you can use the placeholder page until the Apple OAuth is fully configured.
