# Anonymous User Cleanup Endpoint

## Overview

The cleanup endpoint (`/api/maintenance/cleanup-anonymous`) is responsible for removing old anonymous users to maintain database performance and security.

## Configuration

### Environment Variables

- `CLEANUP_CRON_SECRET`: Required secret for authentication (must be set in production)
- `CLEANUP_DRY_RUN_MODE`: Set to 'true' to enable dry-run mode (default: false)
- `CLEANUP_SAFETY_CHECKS_ENABLED`: Enable additional safety checks (default: true)

### Scheduler Configuration

The cleanup runs automatically via Vercel cron jobs:

```json
{
  "crons": [
    {
      "path": "/api/maintenance/cleanup-anonymous",
      "schedule": "0 2 * * *"
    }
  ]
}
```

- **Schedule**: Daily at 2:00 AM UTC
- **Path**: `/api/maintenance/cleanup-anonymous`
- **Method**: POST

## Security

### Secret Protection

The endpoint requires authentication via the `Authorization` header:

```
Authorization: Bearer <CLEANUP_CRON_SECRET>
```

### Safety Measures

1. **Dry-run mode**: Test cleanup operations without actual deletion
2. **Batch size limits**: Maximum 1000 users per batch
3. **Age restrictions**: Only users older than 1-365 days
4. **Data preservation**: Users with data are archived instead of deleted
5. **Correlation tracking**: Each run has a unique correlation ID for debugging

## API Endpoint

### POST /api/maintenance/cleanup-anonymous

**Headers:**
```
Authorization: Bearer <CLEANUP_CRON_SECRET>
Content-Type: application/json
```

**Request Body (optional):**
```json
{
  "dry_run": false,
  "batch_size": 100,
  "max_age_days": 30
}
```

**Response:**
```json
{
  "ok": true,
  "deleted": 5,
  "archived": 2,
  "processed": 7,
  "dry_run": false,
  "correlation_id": "cleanup_1234567890_abc123",
  "duration_ms": 1500
}
```

## Deployment

### Production Setup

1. Set `CLEANUP_CRON_SECRET` environment variable
2. Deploy to Vercel with cron configuration
3. Monitor logs for cleanup operations

### Testing

1. Set `CLEANUP_DRY_RUN_MODE=true` for safe testing
2. Use smaller batch sizes during testing
3. Monitor correlation IDs in logs

## Monitoring

### Log Format

Each cleanup run logs:
- Correlation ID for tracking
- Number of users processed/deleted/archived
- Duration of operation
- Any errors encountered

### Error Handling

- Invalid secret returns 401
- Missing configuration returns 400
- Redis failures are logged but don't stop operation
- Individual user failures are logged but don't stop batch processing

## Maintenance

### Regular Tasks

1. Monitor cleanup logs for errors
2. Adjust batch sizes based on performance
3. Review archived users periodically
4. Update age thresholds as needed

### Troubleshooting

- Check correlation IDs in logs
- Verify `CLEANUP_CRON_SECRET` is set correctly
- Monitor Redis connectivity for rate limiting
- Review Supabase Admin API permissions
