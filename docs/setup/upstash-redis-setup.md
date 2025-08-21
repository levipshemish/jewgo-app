# Upstash Redis Setup Guide

This guide explains how to set up Upstash Redis for rate limiting functionality in the JewGo application.

## Overview

The JewGo application uses Upstash Redis for rate limiting to prevent abuse of the anonymous authentication API and other sensitive endpoints. This is a critical security feature that helps protect the application from spam and abuse.

## Prerequisites

- A Vercel account (for deployment)
- Access to the JewGo project dashboard

## Step 1: Create Upstash Redis Database

1. Go to [https://upstash.com/](https://upstash.com/)
2. Sign up or log in to your account
3. Click "Create Database"
4. Choose "Redis" as the database type
5. Select a region close to your application (e.g., US East for Vercel deployments)
6. Choose the "Free" plan (sufficient for rate limiting)
7. Give your database a name (e.g., "jewgo-rate-limiting")
8. Click "Create"

## Step 2: Get Your Credentials

After creating the database:

1. Go to your database dashboard
2. Copy the **REST URL** (starts with `https://`)
3. Copy the **REST Token** (a long string of characters)

## Step 3: Add Environment Variables to Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the JewGo project
3. Go to **Settings** > **Environment Variables**
4. Add the following variables:

### For Production:
- **Name**: `UPSTASH_REDIS_REST_URL`
- **Value**: Your Upstash Redis REST URL (e.g., `https://your-database-id.upstash.io`)
- **Environment**: Production

- **Name**: `UPSTASH_REDIS_REST_TOKEN`
- **Value**: Your Upstash Redis REST Token
- **Environment**: Production

### For Preview/Development (optional):
- **Name**: `UPSTASH_REDIS_REST_URL`
- **Value**: Your Upstash Redis REST URL
- **Environment**: Preview

- **Name**: `UPSTASH_REDIS_REST_TOKEN`
- **Value**: Your Upstash Redis REST Token
- **Environment**: Preview

## Step 4: Redeploy Your Application

After adding the environment variables:

1. Go to the **Deployments** tab in your Vercel dashboard
2. Click **Redeploy** on your latest deployment
3. Or push a new commit to trigger a new deployment

## Step 5: Verify Setup

After deployment, you can verify the setup by:

1. Checking the build logs for successful environment validation
2. Testing the anonymous authentication endpoint (should work without rate limiting errors)
3. Monitoring the Upstash Redis dashboard for activity

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
Error: Missing required environment variables: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
```

**Solution**: Ensure you've added both environment variables to your Vercel project settings.

### Invalid URL Format

If you see an error about invalid URL format:

**Solution**: Make sure you're using the REST URL from Upstash (starts with `https://`) and not the database connection string.

### Rate Limiting Not Working

If rate limiting doesn't seem to be working:

1. Check that the environment variables are correctly set
2. Verify the Upstash Redis database is active
3. Check the application logs for Redis connection errors

## Security Considerations

- Keep your REST token secure and never commit it to version control
- Use environment variables for all sensitive configuration
- Monitor your Upstash Redis usage to ensure you stay within limits
- Consider upgrading to a paid plan if you need higher rate limits

## Cost Considerations

- The free Upstash Redis plan includes 10,000 requests per day
- For most applications, this is sufficient for rate limiting
- Monitor usage in your Upstash dashboard to avoid unexpected charges

## Support

If you encounter issues:

1. Check the [Upstash Documentation](https://docs.upstash.com/)
2. Review the application logs for specific error messages
3. Contact the development team with detailed error information
