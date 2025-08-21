# Redis Setup Guide

This guide explains how to set up Redis for rate limiting functionality in the JewGo application.

## Overview

The JewGo application uses Redis for rate limiting to prevent abuse of the anonymous authentication API and other sensitive endpoints. This is a critical security feature that helps protect the application from spam and abuse.

## Prerequisites

- A Vercel account (for deployment)
- Access to the JewGo project dashboard
- A Redis database (you already have one configured)

## Step 1: Use Your Existing Redis Database

You already have a Redis database configured in your environment. The application will use your existing Redis setup for rate limiting.

## Step 2: Verify Your Redis Configuration

Your current Redis configuration includes:
- **REDIS_URL**: `redis://user:password@host:6379`
- **REDIS_HOST**: `redis-10768.c14.us-east-1-2.ec2.redns.redis-cloud.com`
- **REDIS_PORT**: `10768`
- **REDIS_DB**: `0`
- **REDIS_USERNAME**: `default`
- **REDIS_PASSWORD**: Your Redis password

## Step 3: Add Environment Variables to Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the JewGo project
3. Go to **Settings** > **Environment Variables**
4. Add the following variables:

### For Production:
- **Name**: `REDIS_URL`
- **Value**: Your Redis URL (e.g., `redis://username:password@host:port/database`)
- **Environment**: Production

### For Preview/Development (optional):
- **Name**: `REDIS_URL`
- **Value**: Your Redis URL
- **Environment**: Preview

**Note**: You can also use individual Redis variables if you prefer:
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `REDIS_DB`

## Step 4: Redeploy Your Application

After adding the environment variables:

1. Go to the **Deployments** tab in your Vercel dashboard
2. Click **Redeploy** on your latest deployment
3. Or push a new commit to trigger a new deployment

## Step 5: Verify Setup

After deployment, you can verify the setup by:

1. Checking the build logs for successful environment validation
2. Testing the anonymous authentication endpoint (should work without rate limiting errors)
3. Monitoring your Redis database for activity

## Rate Limiting Configuration

The application uses the following rate limiting rules:

### Anonymous Authentication:
- **Window**: 1 hour
- **Max Requests**: 3 per hour
- **Daily Limit**: 10 requests per day

### Merge Operations:
- **Window**: 1 hour
- **Max Requests**: 5 per hour
- **Daily Limit**: 20 requests per day

## Troubleshooting

### Build Fails with "Missing required environment variables"

If you see this error during deployment:

```
Error: Missing required environment variables: REDIS_URL, REDIS_HOST
```

**Solution**: Ensure you've added either `REDIS_URL` or `REDIS_HOST` to your Vercel project settings.

### Invalid URL Format

If you see an error about invalid URL format:

**Solution**: Make sure you're using the correct Redis URL format: `redis://username:password@host:port/database`

### Rate Limiting Not Working

If rate limiting doesn't seem to be working:

1. Check that the environment variables are correctly set
2. Verify your Redis database is active and accessible
3. Check the application logs for Redis connection errors

## Security Considerations

- Keep your Redis password secure and never commit it to version control
- Use environment variables for all sensitive configuration
- Monitor your Redis database usage to ensure optimal performance
- Consider using Redis Cloud or other managed Redis services for production

## Cost Considerations

- Redis Cloud offers a free tier with 30MB storage
- For most applications, this is sufficient for rate limiting
- Monitor usage in your Redis dashboard to avoid unexpected charges

## Support

If you encounter issues:

1. Check the [Redis Documentation](https://redis.io/documentation)
2. Review the application logs for specific error messages
3. Contact the development team with detailed error information
