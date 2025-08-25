# JewGo Deployment Guide

## Overview

This guide covers deploying the JewGo application to various platforms including Render, Vercel, and local development environments.

## Prerequisites

- Python 3.11.8+
- Node.js 22.x
- PostgreSQL database (Neon recommended)
- Git
- API keys for external services

## Environment Variables

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database_name

# Flask Configuration
FLASK_ENV=production
FLASK_SECRET_KEY=your-secure-secret-key
SECRET_KEY=your-secure-secret-key

# API Keys
GOOGLE_PLACES_API_KEY=your-google-places-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

# Monitoring
SENTRY_DSN=your-sentry-dsn

# Security
ADMIN_TOKEN=your-secure-admin-token
SCRAPER_TOKEN=your-secure-scraper-token
ALLOWED_IPS=your-server-ip,127.0.0.1

# Environment
ENVIRONMENT=production
DEBUG=False
LOG_LEVEL=INFO

# CORS
CORS_ORIGINS=https://your-frontend-domain.com

# Rate Limiting
SCRAPER_RATE_LIMIT_HOUR=100
ADMIN_RATE_LIMIT_HOUR=50

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

### Frontend Environment Variables

Create a `.env.local` file in the `frontend/` directory (replace placeholders with real secrets in your environment, never commit real credentials):

```bash
# Next.js Configuration
NEXTAUTH_URL=https://<YOUR_VERCEL_APP>.vercel.app
NEXTAUTH_SECRET=<YOUR_NEXTAUTH_SECRET>

# API Configuration
NEXT_PUBLIC_BACKEND_URL=https://<YOUR_BACKEND_DOMAIN>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<YOUR_GOOGLE_MAPS_API_KEY>

# Environment
NODE_ENV=production

Note: Real values must be stored only in `.env` (backend) and `.env.local` (frontend) or your hosting provider’s environment settings. Do not include real environment values in documentation.
```

## Local Development Deployment

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/jewgo-app.git
cd jewgo-app
```

### 2. Setup Development Environment

```bash
# Run the setup script
./scripts/setup-dev-environment.sh
```

### 3. Start Development Servers

```bash
# Start both backend and frontend
./start-dev.sh
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Render Deployment

### Backend Deployment

1. **Create a new Web Service on Render**

2. **Connect your GitHub repository**

3. **Configure the service:**
   - **Name:** jewgo-backend
   - **Environment:** Python
   - **Build Command:** `cd backend && pip install -r requirements.txt`
   - **Start Command:** `cd backend && gunicorn --config config/gunicorn.conf.py app:app`

4. **Set Environment Variables:**
   - Go to the "Environment" tab
   - Add all backend environment variables listed above

5. **Deploy**

### Frontend Deployment

1. **Create a new Static Site on Render**

2. **Configure the service:**
   - **Name:** jewgo-frontend
   - **Build Command:** `cd frontend && npm install && npm run build`
   - **Publish Directory:** `frontend/.next`

3. **Set Environment Variables:**
   - Add all frontend environment variables

4. **Deploy**

## Vercel Deployment

### Frontend Deployment

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   cd frontend
   vercel
   ```

3. **Configure Environment Variables:**
   - Go to your Vercel dashboard
   - Navigate to Settings > Environment Variables
   - Add all frontend environment variables

### Backend Deployment

Vercel is primarily for frontend applications. For the backend, use Render or another platform.

## Database Setup

### PostgreSQL on Render

1. **Create a new PostgreSQL service on Render**

2. **Configure the database:**
   - Choose your plan
   - Set database name: `jewgo_db`

3. **Get connection details:**
   - Copy the external database URL
   - Update your backend environment variables

4. **Run migrations:**
   ```bash
   cd backend
   source venv_py311/bin/activate
   python -m alembic upgrade head
   ```

### Local PostgreSQL

1. **Install PostgreSQL:**
   ```bash
   # macOS
   brew install postgresql
   
   # Ubuntu
   sudo apt-get install postgresql postgresql-contrib
   ```

2. **Create database:**
   ```bash
   createdb jewgo_db
   ```

3. **Run migrations:**
   ```bash
   cd backend
   source venv_py311/bin/activate
   python -m alembic upgrade head
   ```

## SSL and Domain Configuration

### Custom Domain Setup

1. **Purchase a domain** (e.g., from Namecheap, GoDaddy)

2. **Configure DNS:**
   - Point to your Render/Vercel services
   - Add CNAME records for subdomains

3. **Enable SSL:**
   - Render and Vercel provide automatic SSL certificates
   - Update CORS origins to use HTTPS

## Monitoring and Logging

### Sentry Integration

1. **Create a Sentry account**

2. **Get your DSN**

3. **Add to environment variables:**
   ```bash
   SENTRY_DSN=your-sentry-dsn
   ```

### Health Checks

The backend includes a health check endpoint at `/health`. Configure your deployment platform to use this endpoint.

## Performance Optimization

### Backend Optimization

1. **Database Indexing:**
   ```sql
   CREATE INDEX idx_restaurants_city ON restaurants(city);
   CREATE INDEX idx_restaurants_category ON restaurants(kosher_category);
   CREATE INDEX idx_restaurants_status ON restaurants(status);
   ```

2. **Caching:**
   - Consider implementing Redis for caching
   - Cache frequently accessed data

3. **CDN:**
   - Use Cloudinary for image optimization
   - Configure proper cache headers

### Frontend Optimization

1. **Bundle Optimization:**
   ```bash
   npm run analyze
   ```

2. **Image Optimization:**
   - Use Next.js Image component
   - Implement lazy loading

3. **Code Splitting:**
   - Implement dynamic imports
   - Use React.lazy for components

## Security Considerations

### API Security

1. **Rate Limiting:**
   - Configure appropriate rate limits
   - Monitor for abuse

2. **CORS:**
   - Restrict CORS origins in production
   - Use specific domains, not wildcards

3. **Authentication:**
   - Use secure tokens
   - Implement token rotation
   - Monitor for suspicious activity

### Database Security

1. **Connection Security:**
   - Use SSL connections
   - Restrict database access

2. **Backup Strategy:**
   - Implement regular backups
   - Test restore procedures

## Troubleshooting

### Common Issues

1. **Database Connection Errors:**
   - Check DATABASE_URL format
   - Verify database is accessible
   - Check firewall settings

2. **CORS Errors:**
   - Verify CORS_ORIGINS configuration
   - Check frontend URL matches

3. **API Key Issues:**
   - Verify all API keys are set
   - Check key permissions
   - Monitor API usage limits

### Debug Mode

For debugging, temporarily enable debug mode:

```bash
DEBUG=True
LOG_LEVEL=DEBUG
```

### Logs

Check logs in your deployment platform:
- Render: Dashboard > Your Service > Logs
- Vercel: Dashboard > Your Project > Functions > Logs

## Backup and Recovery

### Database Backup

```bash
# Create backup
pg_dump $DATABASE_URL > backup.sql

# Restore backup
psql $DATABASE_URL < backup.sql
```

### Automated Backups

Set up automated backups using your database provider's tools or cron jobs.

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancing:**
   - Use multiple backend instances
   - Configure load balancer

2. **Database Scaling:**
   - Consider read replicas
   - Implement connection pooling

3. **CDN:**
   - Use CDN for static assets
   - Configure proper cache headers

### Performance Monitoring

1. **Set up monitoring:**
   - Response time monitoring
   - Error rate tracking
   - Database performance monitoring

2. **Alerting:**
   - Configure alerts for high error rates
   - Monitor API usage

## Maintenance

### Regular Tasks

1. **Security Updates:**
   - Keep dependencies updated
   - Monitor security advisories

2. **Database Maintenance:**
   - Regular backups
   - Performance optimization

3. **Monitoring:**
   - Review logs regularly
   - Monitor performance metrics

### Update Procedures

1. **Backup database**
2. **Deploy new version**
3. **Run migrations**
4. **Verify functionality**
5. **Monitor for issues**

## Support

For deployment issues:
- Check the troubleshooting section
- Review platform-specific documentation
- Contact platform support if needed

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Flask Documentation](https://flask.palletsprojects.com/) 
