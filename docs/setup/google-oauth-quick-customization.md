# Google OAuth Quick Customization Guide

## 🚀 Quick Setup (5 minutes)

### **Step 1: Access Google Cloud Console**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: `jewgo-app`
3. Navigate: **APIs & Services** → **OAuth consent screen**

### **Step 2: Update App Information**
```
App name: JewGo
User support email: [your-email@domain.com]
App logo: [Upload your 128x128px logo]
App domain: jewgo-app.vercel.app
Application home page: https://jewgo-app.vercel.app
Application privacy policy link: https://jewgo-app.vercel.app/privacy
Application terms of service link: https://jewgo-app.vercel.app/terms
```

### **Step 3: Add App Description**
```
JewGo helps you discover kosher restaurants and eateries in your area. 
Find authentic kosher dining experiences with detailed information about 
certification, cuisine types, and user reviews.
```

### **Step 4: Configure OAuth Client**
1. Go to **APIs & Services** → **Credentials**
2. Edit your **OAuth 2.0 Client ID**
3. Add **Authorized JavaScript origins**:
   ```
   https://jewgo-app.vercel.app
   http://localhost:3000
   ```
4. Add **Authorized redirect URIs**:
   ```
   https://jewgo-app.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```

### **Step 5: Test**
1. Go to: `https://jewgo-app.vercel.app/auth/signin`
2. Click "Continue with Google"
3. Verify your branding appears in the popup

## 🎨 Logo Requirements

- **Size**: 128x128 pixels (recommended)
- **Format**: PNG, JPG, or GIF
- **Max size**: 5MB
- **Background**: Works on light/dark backgrounds
- **Transparency**: Supported

## 🔗 Required URLs

You must create these pages or the OAuth setup will fail:

### **Privacy Policy** (`/privacy`)
```html
<!-- Basic privacy policy content -->
<h1>Privacy Policy</h1>
<p>This app uses Google OAuth for authentication...</p>
```

### **Terms of Service** (`/terms`)
```html
<!-- Basic terms of service content -->
<h1>Terms of Service</h1>
<p>By using this app, you agree to...</p>
```

## ⚡ Quick Commands

### **Run Verification Script**
```bash
node scripts/verify-google-oauth-branding.js
```

### **Test OAuth Flow**
```bash
# Production
open https://jewgo-app.vercel.app/auth/signin

# Development
open http://localhost:3000/auth/signin
```

## 🚨 Common Issues

### **Logo Not Showing**
- Wait up to 24 hours for changes
- Check file format and size
- Test in incognito mode

### **OAuth Flow Fails**
- Verify redirect URIs match exactly
- Check authorized domains
- Ensure Supabase Google provider is enabled

### **Wrong App Name**
- Changes take up to 24 hours
- Clear browser cache
- Test in incognito mode

## 📋 Checklist

- [ ] App name set to "JewGo"
- [ ] Logo uploaded (128x128px)
- [ ] App domain configured
- [ ] Privacy policy URL accessible
- [ ] Terms of service URL accessible
- [ ] OAuth client origins updated
- [ ] OAuth client redirect URIs updated
- [ ] Test users added (if External)
- [ ] OAuth flow works in production
- [ ] OAuth flow works in development

## 🔧 Troubleshooting

### **If branding doesn't appear:**
1. Check Google Cloud Console OAuth consent screen
2. Verify logo upload was successful
3. Wait up to 24 hours for changes
4. Clear browser cache and cookies
5. Test in incognito mode

### **If OAuth flow fails:**
1. Check authorized domains
2. Verify redirect URIs match exactly
3. Ensure OAuth client is configured
4. Check Supabase Google provider settings
5. Review Google Cloud Console logs

## 📞 Support

- **Google Cloud Console**: Check OAuth consent screen logs
- **Supabase Dashboard**: Verify Google provider configuration
- **Browser Console**: Look for OAuth-related errors
- **Network Tab**: Check for failed requests

## 📚 Related Docs

- [Full Branding Guide](./google-oauth-branding-customization.md)
- [OAuth Fix Guide](./google-oauth-fix.md)
- [Supabase Setup](./supabase-setup-guide.md)
