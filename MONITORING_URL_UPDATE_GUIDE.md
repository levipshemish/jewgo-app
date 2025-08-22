# Monitoring Services URL Update Guide

## Backend URL Change
**Old URL:** `https://jewgo.onrender.com`  
**New URL:** `https://jewgo-app-oyoh.onrender.com`

## External Services to Update

### 1. UptimeRobot (if configured)
- Login to UptimeRobot dashboard
- Update monitors for:
  - Health check: `https://jewgo-app-oyoh.onrender.com/health`
  - API check: `https://jewgo-app-oyoh.onrender.com/api/restaurants?limit=1`
  - Ping check: `https://jewgo-app-oyoh.onrender.com/ping` (if exists)

### 2. Cronitor (if configured)
- Login to Cronitor dashboard
- Update heartbeat/monitoring URLs
- Update API health checks

### 3. Sentry (if configured)
- Update DSN configurations if they reference the old URL
- Check for any hardcoded URL references in error tracking

### 4. Analytics Services
- Google Analytics: No action needed (client-side)
- Custom analytics: Verify API endpoints are updated

### 5. Third-party Integrations
- Zapier webhooks (if any)
- Slack notifications with hardcoded URLs
- Email notifications with URL references

## Verification Commands

Test the new URL endpoints:

```bash
# Health check
curl "https://jewgo-app-oyoh.onrender.com/health"

# API functionality
curl "https://jewgo-app-oyoh.onrender.com/api/restaurants?limit=1"

# Frontend proxy (through Vercel)
curl "https://jewgo-app.vercel.app/api/restaurants?limit=1"
```

## Automatic Monitoring Setup

Run the monitoring setup script with the new URL:

```bash
# Set the new API URL
export API_URL="https://jewgo-app-oyoh.onrender.com"

# Run monitoring setup
bash scripts/deployment/setup_monitoring.sh
```

## Status Check

All endpoints verified as working with new URL:
- ✅ Health check: `https://jewgo-app-oyoh.onrender.com/health`
- ✅ Restaurants API: `https://jewgo-app-oyoh.onrender.com/api/restaurants`
- ✅ Restaurant search: `https://jewgo-app-oyoh.onrender.com/api/restaurants/search`
- ✅ Filter options: `https://jewgo-app-oyoh.onrender.com/api/restaurants/filter-options`
- ✅ Frontend proxy: Working through Vercel
- ✅ Individual restaurant details: Working with correct IDs

## Notes

- The old URL `https://jewgo.onrender.com` may still be active but should not be used
- All codebase references have been updated to the new URL
- Both frontend and backend deployments are using the new URL
- Monitor for any services that might still be using the old URL
