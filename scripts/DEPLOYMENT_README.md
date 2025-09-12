# Deployment Guide for Jewgo App

This guide explains how to properly deploy the Jewgo app backend to the production server.

## Prerequisites

1. **SSH Access**: Ensure you have SSH access to the server using the correct key
2. **Environment Setup**: The production environment must be configured before deployment

## Two-Step Deployment Process

### Step 1: Environment Setup (One-time only)

Before deploying, you need to set up the production environment file on the server:

```bash
./scripts/setup-server-env.sh
```

This script will:
- Connect to the server
- Create the `.env` file with production configuration
- Set secure permissions on the environment file
- **Only run this once** - it will ask for confirmation before overwriting existing `.env` files

### Step 2: Deploy Application

Once the environment is set up, you can deploy the application:

```bash
./scripts/deploy-to-server.sh
```

This script will:
- Pull latest code from GitHub
- Clean up old Docker containers and images
- Build new backend image
- Start new container
- Run comprehensive health checks
- Automatically rollback if deployment fails

## Environment Configuration

### Template File
Use `env.production.template` as a reference for environment variables.

### Important Environment Variables
Make sure to update these with actual values on the server:
- `GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `FROM_EMAIL`

### Security Notes
- The `.env` file is not committed to git (already in `.gitignore`)
- Environment variables contain sensitive information
- The deployment script will NOT overwrite the `.env` file after initial setup

## Troubleshooting

### Environment File Missing
If you get an error about missing `.env` file:
```bash
./scripts/setup-server-env.sh
```

### SSH Connection Issues
Ensure the SSH key is in the correct location:
```bash
ls -la ./ssh-key-2025-09-11.key
```

### Deployment Failures
The deployment script includes automatic rollback. If deployment fails:
1. Check the deployment logs
2. The script will automatically rollback to the previous version
3. Check server logs: `ssh -i ./ssh-key-2025-09-11.key ubuntu@157.151.254.18 "docker logs jewgo_backend"`

## Server Information

- **Host**: 157.151.254.18
- **User**: ubuntu
- **Project Path**: /home/ubuntu/jewgo-app
- **Backend Port**: 5000
- **Health Check**: http://157.151.254.18:5000/healthz

## Best Practices

1. **Always run environment setup first** (one-time only)
2. **Test deployments** in a staging environment if available
3. **Monitor logs** after deployment
4. **Keep backups** of working configurations
5. **Update environment variables** as needed without redeploying
