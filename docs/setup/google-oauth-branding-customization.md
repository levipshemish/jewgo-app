# Google OAuth Branding Customization Guide

## Overview

This guide explains how to customize the Google OAuth popup that appears when users click "Sign in with Google". The popup URL and logo are controlled by Google Cloud Console OAuth consent screen settings, not by your application code.

## What Can Be Customized

### **1. OAuth Consent Screen Branding**
- **App Name**: The name that appears in the popup
- **App Logo**: Your custom logo/branding
- **App Domain**: Your website URL
- **App Description**: Description of your app
- **Privacy Policy URL**: Link to your privacy policy
- **Terms of Service URL**: Link to your terms of service
- **Authorized Domains**: Domains that can use your OAuth app

### **2. OAuth Client Configuration**
- **Application Type**: Web application
- **Authorized JavaScript Origins**: Your website domains
- **Authorized Redirect URIs**: Where users are redirected after OAuth

## Step-by-Step Customization

### **Step 1: Access Google Cloud Console**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `jewgo-app` (or your project name)
3. Navigate to **APIs & Services** → **OAuth consent screen**

### **Step 2: Customize App Information**

#### **App Information Section**
```
App name: JewGo
User support email: [your-support-email]
App logo: [Upload your custom logo - 128x128px recommended]
App domain: jewgo-app.vercel.app
Application home page: https://jewgo-app.vercel.app
Application privacy policy link: https://jewgo-app.vercel.app/privacy
Application terms of service link: https://jewgo-app.vercel.app/terms
```

#### **App Description**
```
JewGo helps you discover kosher restaurants and eateries in your area. 
Find authentic kosher dining experiences with detailed information about 
certification, cuisine types, and user reviews.
```

### **Step 3: Configure Scopes**

The OAuth consent screen will request these scopes:
- **email**: User's email address
- **profile**: User's basic profile information
- **openid**: OpenID Connect authentication

### **Step 4: Add Authorized Domains**

```
Authorized domains:
- jewgo-app.vercel.app
- localhost (for development)
```

### **Step 5: Configure Test Users (if External)**

If your OAuth consent screen is set to "External":
```
Test users:
- [your-email@domain.com]
- [other-test-emails@domain.com]
```

### **Step 6: Update OAuth 2.0 Client**

1. Go to **APIs & Services** → **Credentials**
2. Find your **OAuth 2.0 Client ID**
3. Click **Edit**
4. Update **Authorized JavaScript origins**:
   ```
   https://jewgo-app.vercel.app
   http://localhost:3000
   ```
5. Update **Authorized redirect URIs**:
   ```
   https://jewgo-app.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```

## Logo Requirements

### **App Logo Specifications**
- **Format**: PNG, JPG, or GIF
- **Size**: 128x128 pixels (recommended)
- **Maximum file size**: 5MB
- **Background**: Should work on both light and dark backgrounds
- **Transparency**: Supported

### **Logo Design Tips**
- Use a simple, recognizable design
- Ensure it's readable at small sizes
- Test on both light and dark backgrounds
- Follow Google's branding guidelines

## Privacy Policy and Terms of Service

### **Required URLs**
You must provide these URLs in the OAuth consent screen:

1. **Privacy Policy**: `https://jewgo-app.vercel.app/privacy`
2. **Terms of Service**: `https://jewgo-app.vercel.app/terms`

### **Content Requirements**
- Privacy Policy must explain how you use user data
- Terms of Service must cover OAuth usage
- Both must be publicly accessible

## Testing Your Customization

### **Test the OAuth Flow**
1. Go to your sign-in page: `https://jewgo-app.vercel.app/auth/signin`
2. Click "Continue with Google"
3. Verify the popup shows your custom branding
4. Complete the OAuth flow
5. Check that you're redirected correctly

### **Test in Different Environments**
- **Production**: `https://jewgo-app.vercel.app`
- **Development**: `http://localhost:3000`
- **Incognito mode**: To test without cached data

## Troubleshooting

### **Common Issues**

#### **Logo Not Appearing**
- Check file format and size requirements
- Ensure logo is uploaded successfully
- Wait up to 24 hours for changes to propagate

#### **Wrong App Name/Description**
- Changes may take up to 24 hours to appear
- Clear browser cache and cookies
- Test in incognito mode

#### **Domain Not Authorized**
- Add your domain to "Authorized domains"
- Update OAuth 2.0 Client origins
- Ensure exact domain match (including protocol)

#### **Redirect URI Mismatch**
- Check exact URI format in OAuth client
- Include protocol (https:// or http://)
- Match exactly with Supabase configuration

### **Verification Checklist**

- [ ] App name is correct
- [ ] App logo is uploaded and visible
- [ ] App domain is set correctly
- [ ] Privacy policy URL is accessible
- [ ] Terms of service URL is accessible
- [ ] Authorized domains include your domain
- [ ] OAuth client origins are updated
- [ ] OAuth client redirect URIs are updated
- [ ] Test users are added (if External)
- [ ] OAuth flow works in production
- [ ] OAuth flow works in development

## Security Considerations

### **Best Practices**
- Use HTTPS for all production URLs
- Keep OAuth client secrets secure
- Regularly review authorized domains
- Monitor OAuth usage in Google Cloud Console
- Update privacy policy to cover OAuth data usage

### **Monitoring**
- Check Google Cloud Console OAuth consent screen logs
- Monitor failed OAuth attempts
- Review authorized domains regularly
- Keep test user list updated

## Support

If you encounter issues with OAuth branding customization:

1. **Check Google Cloud Console logs** for specific errors
2. **Verify all configuration steps** are completed
3. **Test in incognito mode** to rule out cache issues
4. **Check Supabase logs** for authentication errors
5. **Review this guide** for troubleshooting steps

## Related Documentation

- [Google OAuth Fix Guide](../google-oauth-fix.md)
- [Supabase Setup Guide](../supabase-setup-guide.md)
- [Environment Setup Guide](../ENVIRONMENT_SETUP.md)
