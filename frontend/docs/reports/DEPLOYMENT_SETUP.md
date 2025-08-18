# Deployment Setup Guide - Render & Vercel

## 🚀 Vercel Frontend Deployment

### 1. Environment Variables Setup

In your Vercel dashboard, add these environment variables:

#### Production Environment:
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Application URL
NEXT_PUBLIC_URL=https://your-vercel-domain.vercel.app

# Database
DATABASE_URL=your-production-database-url

# NextAuth
NEXTAUTH_SECRET=your-secure-secret-key
NEXTAUTH_URL=https://your-vercel-domain.vercel.app

# Google OAuth (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### Preview Environment (for testing):
```env
# Same as production but with different URLs
NEXT_PUBLIC_URL=https://your-preview-domain.vercel.app
NEXTAUTH_URL=https://your-preview-domain.vercel.app
```

### 2. Vercel Configuration

Create or update `vercel.json` in your frontend directory:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "env": {
    "SMTP_HOST": "@smtp_host",
    "SMTP_PORT": "@smtp_port",
    "SMTP_SECURE": "@smtp_secure",
    "SMTP_USER": "@smtp_user",
    "SMTP_PASS": "@smtp_pass",
    "SMTP_FROM": "@smtp_from",
    "DATABASE_URL": "@database_url",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "GOOGLE_CLIENT_ID": "@google_client_id",
    "GOOGLE_CLIENT_SECRET": "@google_client_secret"
  }
}
```

### 3. Database Migration on Vercel

Add a build script to run database migrations:

```json
{
  "scripts": {
    "build": "npx prisma generate && npx prisma db push && next build",
    "postinstall": "npx prisma generate"
  }
}
```

## 🐳 Render Backend Deployment

### 1. Environment Variables Setup

In your Render dashboard, add these environment variables:

#### Production Environment:
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Database
DATABASE_URL=your-production-database-url

# Security
ADMIN_TOKEN=your-secure-admin-token
SCRAPER_TOKEN=your-secure-scraper-token

# Application URLs
FRONTEND_URL=https://your-vercel-domain.vercel.app
BACKEND_URL=https://your-render-service.onrender.com

# Redis (if using)
REDIS_URL=your-redis-url
REDIS_PASSWORD=your-redis-password

# Sentry (if using)
SENTRY_DSN=your-sentry-dsn

# Environment
ENVIRONMENT=production
```

### 2. Render Service Configuration

#### Build Command:
```bash
pip install -r requirements.txt
```

#### Start Command:
```bash
gunicorn app:app --bind 0.0.0.0:$PORT
```

### 3. Health Check Endpoint

Ensure your backend has a health check endpoint:

```python
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})
```

## 🔗 Cross-Origin Configuration

### 1. Backend CORS Setup

Update your backend CORS configuration to allow Vercel domain:

```python
from flask_cors import CORS

# In your Flask app
CORS(app, origins=[
    "https://your-vercel-domain.vercel.app",
    "https://your-preview-domain.vercel.app",
    "http://localhost:3000"  # For local development
])
```

### 2. Frontend API Configuration

Create an API configuration file:

```typescript
// frontend/lib/api-config.ts
const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'https://your-render-service.onrender.com'
  }
  return 'http://localhost:5000' // Local backend
}

export const API_BASE_URL = getApiBaseUrl()
```

## 📧 Email Service Configuration

### 1. Gmail App Password Setup

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → App passwords
   - Select "Mail" and generate password
3. **Use the generated password** in `SMTP_PASS`

### 2. Email Templates Update

Update email templates to use production URLs:

```typescript
// frontend/lib/email.ts
const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
}

export function createVerificationEmail(token: string, name: string): string {
  const verificationUrl = `${getBaseUrl()}/auth/verify?token=${token}`
  // ... rest of template
}

export function createPasswordResetEmail(token: string, name: string): string {
  const resetUrl = `${getBaseUrl()}/auth/reset-password?token=${token}`
  // ... rest of template
}
```

## 🔐 Security Configuration

### 1. Environment-Specific Secrets

#### Development:
```env
NEXTAUTH_SECRET=dev-secret-key-change-in-production
```

#### Production:
```env
NEXTAUTH_SECRET=your-very-long-secure-random-secret-key
```

### 2. Generate Secure Secrets

Use this script to generate secure secrets:

```bash
# Generate NextAuth secret
openssl rand -base64 32

# Generate admin token
openssl rand -hex 32

# Generate scraper token
openssl rand -hex 32
```

## 🚀 Deployment Steps

### 1. Frontend (Vercel)

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard
3. **Deploy** - Vercel will automatically build and deploy
4. **Test** the deployment

### 2. Backend (Render)

1. **Connect your repository** to Render
2. **Set environment variables** in Render dashboard
3. **Configure build and start commands**
4. **Deploy** the service
5. **Test** the API endpoints

### 3. Database Setup

1. **Run migrations** on production database
2. **Verify connections** from both services
3. **Test** email functionality

## 🧪 Testing Deployment

### 1. Health Checks

```bash
# Test backend health
curl https://your-render-service.onrender.com/health

# Test frontend
curl https://your-vercel-domain.vercel.app
```

### 2. Email Testing

1. **Register a new account** on production
2. **Check email delivery**
3. **Test password reset**
4. **Verify email verification**

### 3. API Testing

```bash
# Test password reset API
curl -X POST https://your-vercel-domain.vercel.app/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## 🔍 Monitoring & Debugging

### 1. Vercel Monitoring

- **Function logs** in Vercel dashboard
- **Performance monitoring**
- **Error tracking**

### 2. Render Monitoring

- **Service logs** in Render dashboard
- **Health check monitoring**
- **Performance metrics**

### 3. Email Monitoring

- **Check email delivery** in Gmail
- **Monitor bounce rates**
- **Track spam folder placement**

## 🛠️ Troubleshooting

### Common Issues:

#### 1. CORS Errors
- Verify CORS configuration in backend
- Check allowed origins
- Ensure frontend URL is correct

#### 2. Database Connection Issues
- Verify DATABASE_URL is correct
- Check database accessibility
- Ensure SSL is configured properly

#### 3. Email Not Sending
- Verify SMTP credentials
- Check Gmail app password
- Review email service logs

#### 4. Environment Variables Not Working
- Verify variable names match exactly
- Check for typos
- Ensure variables are set in correct environment

## 📋 Deployment Checklist

### Pre-Deployment:
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] CORS configuration updated
- [ ] Email templates updated
- [ ] Security secrets generated
- [ ] Health check endpoints working

### Post-Deployment:
- [ ] Frontend accessible
- [ ] Backend API responding
- [ ] Database connections working
- [ ] Email functionality tested
- [ ] Authentication flows working
- [ ] Error handling verified
- [ ] Monitoring configured

## 🔄 CI/CD Integration

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## 📞 Support

### Vercel Support:
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

### Render Support:
- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com/)

### Email Issues:
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [SMTP Configuration](https://nodemailer.com/smtp/)
