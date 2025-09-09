# Jewgo App Deployment System

This directory contains the deployment system for the Jewgo App, including GitHub webhook integration for automatic deployments.

## Files

- `deploy.sh` - Main deployment script that pulls changes and restarts services
- `webhook-handler.py` - Python webhook server that receives GitHub events
- `jewgo-webhook.service` - Systemd service file for the webhook handler
- `setup-webhook.sh` - Setup script to configure the webhook system

## Setup Instructions

### 1. Initial Server Setup

```bash
# On the server, run the setup script
cd /home/ubuntu/jewgo-app
chmod +x scripts/deployment/setup-webhook.sh
./scripts/deployment/setup-webhook.sh
```

### 2. Configure GitHub Webhook

1. Go to your GitHub repository settings
2. Navigate to "Webhooks" section
3. Click "Add webhook"
4. Set the payload URL to: `http://your-server-ip:8080`
5. Set content type to: `application/json`
6. Set the secret to match the `WEBHOOK_SECRET` in the service file
7. Select "Just the push event"
8. Click "Add webhook"

### 3. Test the System

```bash
# Test the deployment script manually
./scripts/deployment/deploy.sh

# Check webhook service status
sudo systemctl status jewgo-webhook.service

# View webhook logs
sudo journalctl -u jewgo-webhook.service -f
```

## How It Works

1. **GitHub Push**: When code is pushed to the main branch
2. **Webhook Trigger**: GitHub sends a webhook to the server
3. **Signature Verification**: The webhook handler verifies the request signature
4. **Deployment**: If valid, the deployment script is triggered
5. **Git Pull**: Latest changes are pulled from GitHub
6. **Service Restart**: Backend container is restarted
7. **Health Check**: System verifies the backend is healthy

## Security

- Webhook requests are verified using HMAC-SHA256 signatures
- Only pushes to the main branch trigger deployments
- The webhook secret should be kept secure and not committed to the repository

## Troubleshooting

### Webhook Not Triggering
- Check if the webhook service is running: `sudo systemctl status jewgo-webhook.service`
- Verify the webhook URL is accessible from GitHub
- Check the webhook secret matches between GitHub and the service

### Deployment Failing
- Check the deployment script logs
- Verify git repository access
- Ensure Docker containers are running
- Check backend health endpoint

### Service Issues
- View service logs: `sudo journalctl -u jewgo-webhook.service -f`
- Restart the service: `sudo systemctl restart jewgo-webhook.service`
- Check service configuration: `sudo systemctl cat jewgo-webhook.service`
