# JewGo Deployment Guide

## Overview

This guide covers the deployment of the JewGo application, including the Next.js frontend, Flask backend, and all supporting services. The application is designed to be deployed on modern cloud platforms with proper monitoring and maintenance.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Next.js)     │◄──►│   (Flask)       │◄──►│   (PostgreSQL)  │
│   Vercel        │    │   Render        │    │   Neon          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN/Images    │    │   Monitoring    │    │   Scrapers      │
│   Cloudinary    │    │   Cronitor      │    │   Scheduled     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Prerequisites

### Required Accounts
- **Vercel** - Frontend hosting
- **Render** - Backend hosting
- **Neon** - PostgreSQL database
- **Cloudinary** - Image hosting and optimization
- **Cronitor** - Monitoring and health checks

### Required API Keys
- **Google Places API** - Restaurant data enrichment
- **Cloudinary** - Image management
- **Cronitor** - Monitoring

## Environment Setup

### Frontend Environment Variables (Vercel)

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_api_key

# Optional
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

### Backend Environment Variables (Render)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# API Keys
GOOGLE_PLACES_API_KEY=your_google_places_api_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Monitoring
CRONITOR_URL=your_cronitor_url

# Environment
RENDER_ENV=production
FLASK_ENV=production
```

## Deployment Steps

### 1. Database Setup (Neon)

1. **Create Neon Account**
   - Sign up at [neon.tech](https://neon.tech)
   - Create a new project

2. **Configure Database**
   ```sql
   -- Run the database initialization script
   \i backend/database/init_database.sql
   
   -- Apply performance indexes
   \i backend/database/performance_indexes.sql
   ```

3. **Get Connection String**
   - Copy the connection string from Neon dashboard
   - Format: `postgresql://user:password@host:port/database`

### 2. Backend Deployment (Render)

1. **Connect Repository**
   - Connect your GitHub repository to Render
   - Select the repository containing the JewGo code

2. **Configure Service**
   - **Name**: `jewgo-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && gunicorn app_factory:app`

3. **Set Environment Variables**
   - Add all backend environment variables listed above
   - Ensure `DATABASE_URL` points to your Neon database

4. **Deploy**
   - Render will automatically deploy on push to main branch
   - Monitor the build logs for any issues

### 3. Frontend Deployment (Vercel)

1. **Connect Repository**
   - Connect your GitHub repository to Vercel
   - Select the repository containing the JewGo code

2. **Configure Project**
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

3. **Set Environment Variables**
   - Add all frontend environment variables listed above
   - Ensure `NEXT_PUBLIC_API_URL` points to your Render backend

4. **Deploy**
   - Vercel will automatically deploy on push to main branch
   - Monitor the build logs for any issues

### 4. Image Hosting Setup (Cloudinary)

1. **Create Cloudinary Account**
   - Sign up at [cloudinary.com](https://cloudinary.com)
   - Note your cloud name, API key, and secret

2. **Upload Default Images**
   ```bash
   # Use the CLI to upload fallback images
   python scripts/jewgo-cli.py maintenance upload-images
   ```

3. **Configure Environment Variables**
   - Add Cloudinary credentials to backend environment variables

### 5. Monitoring Setup (Cronitor)

1. **Create Cronitor Account**
   - Sign up at [cronitor.io](https://cronitor.io)
   - Create a new monitor for your backend health endpoint

2. **Configure Health Checks**
   ```bash
   # Test health endpoint
   curl https://your-backend.onrender.com/health
   ```

3. **Set Up Scheduled Tasks**
   ```bash
   # Daily health check and review scraping
   0 2 * * * cd /path/to/jewgo && python scripts/jewgo-cli.py monitor health && python scripts/jewgo-cli.py scrape reviews --batch-size 20

   # Weekly data update
   0 3 * * 0 cd /path/to/jewgo && python scripts/jewgo-cli.py scrape kosher-miami && python scripts/jewgo-cli.py database cleanup --remove-duplicates
   ```

## Post-Deployment Setup

### 1. Database Migration

```bash
# Run database cleanup migration
python backend/database/migrations/cleanup_unused_columns.py

# Verify migration
python backend/database/migrations/cleanup_unused_columns.py --verify
```

### 2. Initial Data Population

```bash
# Scrape initial Kosher Miami data
python scripts/jewgo-cli.py scrape kosher-miami

# Scrape Google reviews for restaurants
python scripts/jewgo-cli.py scrape reviews --batch-size 50

# Scrape restaurant images
python scripts/jewgo-cli.py scrape images --limit 100
```

### 3. Performance Optimization

```bash
# Apply database indexes
python scripts/apply_database_indexes.py

# Check system performance
python scripts/jewgo-cli.py monitor performance
```

## Maintenance Operations

### Daily Maintenance

```bash
#!/bin/bash
# daily-maintenance.sh

echo "Starting daily maintenance..."

# Check system health
python scripts/jewgo-cli.py monitor health

# Scrape new reviews
python scripts/jewgo-cli.py scrape reviews --batch-size 30

# Update performance metrics
python scripts/jewgo-cli.py monitor performance

echo "Daily maintenance completed"
```

### Weekly Maintenance

```bash
#!/bin/bash
# weekly-maintenance.sh

echo "Starting weekly maintenance..."

# Scrape Kosher Miami data
python scripts/jewgo-cli.py scrape kosher-miami

# Scrape images for restaurants without images
python scripts/jewgo-cli.py scrape images --limit 100

# Run database cleanup
python scripts/jewgo-cli.py database cleanup --remove-duplicates

# Create backup
python scripts/jewgo-cli.py maintenance backup

echo "Weekly maintenance completed"
```

### Monthly Maintenance

```bash
#!/bin/bash
# monthly-maintenance.sh

echo "Starting monthly maintenance..."

# Performance monitoring
python scripts/jewgo-cli.py monitor performance

# Database statistics
python scripts/jewgo-cli.py database stats

# Clean up old files and logs
python scripts/jewgo-cli.py maintenance cleanup --cleanup-files --cleanup-logs

echo "Monthly maintenance completed"
```

## Monitoring and Alerts

### Health Checks

The application provides several health check endpoints:

- **Backend Health**: `GET /health`
- **Database Health**: `GET /api/health-check`
- **Service Status**: `GET /api/statistics`

### Monitoring Dashboard

Access monitoring information:

```bash
# System health
python scripts/jewgo-cli.py monitor health

# Performance metrics
python scripts/jewgo-cli.py monitor performance

# Database statistics
python scripts/jewgo-cli.py database stats
```

### Alert Configuration

Configure alerts for:

- **Backend Health**: Monitor `/health` endpoint
- **Database Connectivity**: Monitor database connection
- **API Response Times**: Monitor API performance
- **Error Rates**: Monitor application errors

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database connectivity
python scripts/jewgo-cli.py database health

# Verify environment variables
echo $DATABASE_URL
```

#### 2. API Key Issues
```bash
# Check Google Places API
python scripts/jewgo-cli.py scrape reviews --restaurant-id 1

# Check Cloudinary
python scripts/jewgo-cli.py maintenance upload-images
```

#### 3. Build Failures
```bash
# Check frontend build
cd frontend && npm run build

# Check backend build
cd backend && pip install -r requirements.txt
```

#### 4. Performance Issues
```bash
# Check performance metrics
python scripts/jewgo-cli.py monitor performance

# Check database indexes
python scripts/apply_database_indexes.py
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Frontend debug
DEBUG=* npm run dev

# Backend debug
FLASK_ENV=development python backend/app_factory.py
```

## Security Considerations

### Environment Variables
- Never commit API keys to version control
- Use environment-specific configuration
- Rotate API keys regularly

### Database Security
- Use SSL connections to database
- Implement connection pooling
- Regular database backups

### API Security
- Implement rate limiting
- Validate all input data
- Use HTTPS in production

## Backup and Recovery

### Database Backups

```bash
# Create backup
python scripts/jewgo-cli.py maintenance backup

# Restore from backup (if needed)
pg_restore -d your_database backup_file.sql
```

### File Backups

```bash
# Backup important files
tar -czf jewgo-backup-$(date +%Y%m%d).tar.gz \
  backend/database/ \
  scripts/ \
  docs/ \
  .env.example
```

## Scaling Considerations

### Horizontal Scaling
- Frontend: Vercel handles scaling automatically
- Backend: Render supports multiple instances
- Database: Neon supports read replicas

### Performance Optimization
- Implement caching strategies
- Optimize database queries
- Use CDN for static assets

### Cost Optimization
- Monitor resource usage
- Use appropriate instance sizes
- Implement auto-scaling policies

## Support and Maintenance

### Regular Tasks
- Monitor application health daily
- Update dependencies monthly
- Review performance metrics weekly
- Backup data weekly

### Emergency Procedures
- Document rollback procedures
- Maintain backup contact information
- Test disaster recovery procedures

### Documentation
- Keep deployment guide updated
- Document configuration changes
- Maintain troubleshooting guides

## Version History

### v1.0.0 (2024-01-01)
- Initial deployment guide
- Complete deployment instructions
- Monitoring and maintenance procedures
- Troubleshooting guide
- Security considerations 