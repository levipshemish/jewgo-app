# Vercel Cron Job Setup Guide

## Overview

This guide explains how to set up the Vercel cron job for weekly anonymous user cleanup in production.

## 🕐 Cron Job Configuration

### 1. Vercel Dashboard Configuration

Navigate to your Vercel project dashboard and follow these steps:

1. **Go to Settings** → **Functions**
2. **Enable Cron Jobs** (if not already enabled)
3. **Add Cron Job** with the following configuration:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-anonymous",
      "schedule": "0 2 * * 0"
    }
  ]
}
```

### 2. Schedule Explanation

- **`0 2 * * 0`** = Every Sunday at 2:00 AM UTC
- **`0`** = Minute (0-59)
- **`2`** = Hour (0-23)
- **`*`** = Day of month (1-31)
- **`*`** = Month (1-12)
- **`0`** = Day of week (0-6, where 0 = Sunday)

### 3. Alternative Schedules

```bash
# Daily at 3 AM UTC
"0 3 * * *"

# Every Monday at 1 AM UTC
"0 1 * * 1"

# Every 6 hours
"0 */6 * * *"

# Every 12 hours
"0 */12 * * *"
```

## 🔐 Environment Variables

Ensure these environment variables are set in your Vercel project:

```bash
# Required for cron job
CRON_SECRET=your-secure-cron-secret-here
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Optional for monitoring
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

## 🧪 Testing the Cron Job

### 1. Manual Testing

Test the cron job endpoint manually:

```bash
# Test with dry run (safe)
curl -X POST https://your-domain.vercel.app/api/cron/cleanup-anonymous \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}'

# Test without dry run (will actually delete users)
curl -X POST https://your-domain.vercel.app/api/cron/cleanup-anonymous \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### 2. Expected Response

```json
{
  "success": true,
  "message": "Anonymous user cleanup completed",
  "processed": 15,
  "deleted": 12,
  "errors": 0,
  "duration_ms": 2345,
  "correlation_id": "cleanup_1234567890_abc123",
  "dry_run": false,
  "user_ids": ["uuid1", "uuid2", "uuid3"]
}
```

### 3. Error Response

```json
{
  "error": "Unauthorized",
  "correlation_id": "cleanup_1234567890_abc123"
}
```

## 📊 Monitoring and Logging

### 1. Vercel Function Logs

Monitor cron job execution in Vercel dashboard:

1. **Go to Functions** → **Cron Jobs**
2. **Click on your cron job**
3. **View execution logs**

### 2. Sentry Integration

The cron job automatically logs to Sentry if configured:

- **Success events**: Cleanup completion with statistics
- **Error events**: Failed cleanup attempts with details
- **Correlation IDs**: For tracking specific executions

### 3. Custom Monitoring

Set up custom monitoring for the cron job:

```typescript
// Example: Monitor cron job health
export async function monitorCronHealth() {
  const response = await fetch('/api/cron/cleanup-anonymous', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ dry_run: true })
  });
  
  if (!response.ok) {
    // Alert: Cron job is not working
    console.error('Cron job health check failed');
  }
}
```

## 🔧 Configuration Options

### 1. Cleanup Parameters

The cron job supports these parameters:

```typescript
interface CleanupConfig {
  // Age threshold for cleanup (default: 30 days)
  ANONYMOUS_USER_AGE_DAYS: number;
  
  // Batch size for processing (default: 100)
  BATCH_SIZE: number;
  
  // Maximum users per run (default: 1000)
  MAX_USERS_PER_RUN: number;
  
  // Dry run mode (default: false in production)
  DRY_RUN: boolean;
}
```

### 2. Environment-Specific Configuration

```bash
# Development
CLEANUP_DRY_RUN=true
ANONYMOUS_USER_AGE_DAYS=1  # Clean up after 1 day for testing

# Production
CLEANUP_DRY_RUN=false
ANONYMOUS_USER_AGE_DAYS=30  # Clean up after 30 days
```

## 🛡️ Security Considerations

### 1. Cron Secret Security

- **Generate a strong secret**: Use `openssl rand -hex 32`
- **Keep it secret**: Never commit to version control
- **Rotate regularly**: Change every 6-12 months
- **Monitor usage**: Check for unauthorized access

### 2. Access Control

The cron job is protected by:
- **Bearer token authentication**
- **IP restrictions** (Vercel's infrastructure only)
- **Rate limiting** on the endpoint
- **Correlation ID tracking** for audit

### 3. Data Safety

- **Dry run mode** for testing
- **Batch processing** to avoid timeouts
- **Error handling** for failed deletions
- **Backup creation** before major operations

## 📈 Performance Optimization

### 1. Batch Processing

The cron job processes users in batches to:
- **Avoid timeouts** (Vercel has 30s limit)
- **Reduce memory usage**
- **Handle large datasets** efficiently
- **Provide progress feedback**

### 2. Database Optimization

- **Indexed queries** for efficient user lookup
- **Batch deletions** to reduce database load
- **Connection pooling** for better performance
- **Error recovery** for failed operations

## 🔍 Troubleshooting

### Common Issues

1. **Cron Job Not Running**
   - Check Vercel cron job configuration
   - Verify CRON_SECRET is set
   - Check function logs for errors
   - Ensure endpoint is accessible

2. **Authentication Errors**
   - Verify CRON_SECRET matches
   - Check Authorization header format
   - Ensure secret is properly set in Vercel

3. **Database Errors**
   - Check SUPABASE_SERVICE_ROLE_KEY
   - Verify database connectivity
   - Check for permission issues
   - Review database logs

4. **Timeout Errors**
   - Reduce BATCH_SIZE
   - Increase MAX_USERS_PER_RUN
   - Optimize database queries
   - Check for slow operations

### Debug Commands

```bash
# Test endpoint accessibility
curl -I https://your-domain.vercel.app/api/cron/cleanup-anonymous

# Test authentication
curl -X POST https://your-domain.vercel.app/api/cron/cleanup-anonymous \
  -H "Authorization: Bearer INVALID_SECRET"

# Test with verbose output
curl -v -X POST https://your-domain.vercel.app/api/cron/cleanup-anonymous \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}'
```

## 📋 Maintenance Checklist

### Weekly
- [ ] Check cron job execution logs
- [ ] Monitor cleanup statistics
- [ ] Verify no errors in Sentry
- [ ] Check database performance

### Monthly
- [ ] Review cleanup effectiveness
- [ ] Adjust parameters if needed
- [ ] Update monitoring alerts
- [ ] Review security settings

### Quarterly
- [ ] Rotate CRON_SECRET
- [ ] Review and update documentation
- [ ] Test disaster recovery procedures
- [ ] Update monitoring dashboards

## 🚀 Production Deployment

### Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] CRON_SECRET generated and set
- [ ] Vercel cron job enabled
- [ ] Monitoring set up
- [ ] Dry run tested successfully
- [ ] Documentation updated

### Post-Deployment Verification

- [ ] Cron job executes on schedule
- [ ] Logs appear in Vercel dashboard
- [ ] Sentry events are captured
- [ ] No errors in function logs
- [ ] Database performance is acceptable

## 📞 Support

If you encounter issues:

1. **Check Vercel documentation**: [Cron Jobs](https://vercel.com/docs/cron-jobs)
2. **Review function logs**: Vercel dashboard → Functions
3. **Check Sentry**: For error tracking and debugging
4. **Contact support**: If issues persist

---

**Next Steps**: After setting up the cron job, proceed to test the complete flow in staging environment.
