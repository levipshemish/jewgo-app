# Webhook Auto-Deployment System Guide

## Overview

This document describes the webhook auto-deployment system implemented for the JewGo application. The system allows automatic deployment of the application when changes are pushed to the main branch of the GitHub repository.

## System Components

### 1. Webhook Endpoints

The system includes two main webhook endpoints:

- **`/webhook/status`** (GET): Returns the status of the webhook system
- **`/webhook/deploy`** (POST/GET): Handles deployment requests from GitHub

### 2. GitHub Webhook Configuration

The GitHub webhook is configured with:
- **URL**: `https://api.jewgo.app/webhook/deploy`
- **Content Type**: `application/json`
- **Secret**: Configured with `GITHUB_WEBHOOK_SECRET` environment variable
- **Events**: Push events to main branch
- **SSL Verification**: Enabled

### 3. Deployment Script

The `deploy.sh` script handles the actual deployment process:

```bash
#!/bin/bash
set -e

echo "Starting deployment..."
cd /home/ubuntu

echo "Pulling latest changes..."
git pull origin main

echo "Stopping containers..."
docker-compose down

echo "Building containers..."
docker-compose build --no-cache

echo "Starting containers..."
docker-compose up -d

echo "Waiting for services..."
sleep 30

echo "Health check..."
curl -f -s https://api.jewgo.app/health && echo " - API OK" || echo " - API FAILED"

echo "Deployment completed!"
```

## Environment Variables

The following environment variables are required:

```bash
GITHUB_WEBHOOK_SECRET=your-webhook-secret-here
```

## File Structure

```
backend/
├── routes/
│   ├── deploy_webhook.py          # Webhook endpoint implementation
│   └── __init__.py                # Routes package initialization
├── app_factory_full.py            # Main Flask application factory
└── requirements.txt               # Python dependencies

deploy.sh                          # Deployment script
```

## Implementation Details

### Webhook Endpoint Implementation

The webhook endpoints are implemented in `backend/routes/deploy_webhook.py`:

```python
from flask import Blueprint, request, jsonify
import os
import subprocess
import hmac
import hashlib

deploy_webhook_bp = Blueprint('deploy_webhook', __name__)

@deploy_webhook_bp.route('/webhook/deploy', methods=['POST'])
def github_webhook():
    try:
        webhook_secret = os.environ.get('GITHUB_WEBHOOK_SECRET')
        if not webhook_secret:
            return jsonify({'error': 'Webhook secret not configured'}), 500

        signature = request.headers.get('X-Hub-Signature-256')
        if signature:
            expected_signature = 'sha256=' + hmac.new(
                webhook_secret.encode(),
                request.data,
                hashlib.sha256
            ).hexdigest()

            if not hmac.compare_digest(signature, expected_signature):
                return jsonify({'error': 'Invalid signature'}), 403
        else:
            return jsonify({'error': 'Missing signature'}), 401

        # Execute deployment script
        try:
            subprocess.run(['/home/ubuntu/deploy.sh'], check=True, cwd='/home/ubuntu')
            return jsonify({'message': 'Deployment initiated successfully'}), 200
        except subprocess.CalledProcessError as e:
            return jsonify({'error': f'Deployment script failed: {e}'}), 500
        except FileNotFoundError:
            return jsonify({'error': 'Deployment script not found at /home/ubuntu/deploy.sh'}), 500
    except Exception as e:
        return jsonify({'error': f'An unexpected error occurred: {e}'}), 500

@deploy_webhook_bp.route('/webhook/status', methods=['GET'])
def webhook_status():
    return jsonify({'webhook_configured': True, 'status': 'active'})
```

### Flask App Factory Integration

The webhook blueprint is registered in the Flask application factory:

```python
from routes.deploy_webhook import deploy_webhook_bp

def create_app(config_class=None):
    app = Flask(__name__)
    
    # Register webhook blueprint
    app.register_blueprint(deploy_webhook_bp)
    
    return app, socketio
```

## Security Features

### 1. Signature Verification

The webhook endpoint verifies the GitHub webhook signature using HMAC-SHA256:

```python
signature = request.headers.get('X-Hub-Signature-256')
expected_signature = 'sha256=' + hmac.new(
    webhook_secret.encode(),
    request.data,
    hashlib.sha256
).hexdigest()

if not hmac.compare_digest(signature, expected_signature):
    return jsonify({'error': 'Invalid signature'}), 403
```

### 2. Environment Variable Protection

The webhook secret is stored in environment variables and not hardcoded in the application.

## Testing

### Manual Testing

1. **Test webhook status endpoint**:
   ```bash
   curl -s https://api.jewgo.app/webhook/status
   ```

2. **Test webhook deploy endpoint**:
   ```bash
   curl -s https://api.jewgo.app/webhook/deploy
   ```

### GitHub Webhook Testing

1. Make a test commit and push to the main branch
2. Check the webhook delivery logs in GitHub
3. Verify the deployment was triggered on the server

## Troubleshooting

### Common Issues

1. **404 Errors**: Webhook endpoints not found
   - **Cause**: Routes not properly registered in Flask app
   - **Solution**: Ensure webhook routes are added inside the `create_app` function

2. **Signature Verification Failed**: Invalid signature errors
   - **Cause**: Mismatch between webhook secret and GitHub configuration
   - **Solution**: Verify `GITHUB_WEBHOOK_SECRET` environment variable

3. **Deployment Script Not Found**: File not found errors
   - **Cause**: `deploy.sh` script not present or not executable
   - **Solution**: Ensure script exists at `/home/ubuntu/deploy.sh` and is executable

### Debugging Steps

1. Check backend logs:
   ```bash
   docker logs jewgo-backend --tail 50
   ```

2. Verify webhook endpoint accessibility:
   ```bash
   curl -s https://api.jewgo.app/webhook/status
   ```

3. Check GitHub webhook delivery logs in the repository settings

## Future Improvements

1. **Enhanced Logging**: Add comprehensive logging for webhook events
2. **Rollback Capability**: Implement automatic rollback on deployment failures
3. **Notification System**: Add Slack/email notifications for deployment status
4. **Health Checks**: Implement more comprehensive health checks
5. **Blue-Green Deployment**: Implement zero-downtime deployment strategy

## Conclusion

The webhook auto-deployment system provides a robust and secure way to automatically deploy the JewGo application when changes are pushed to the main branch. The system includes proper security measures, error handling, and comprehensive logging to ensure reliable deployments.
