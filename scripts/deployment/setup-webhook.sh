#!/bin/bash

# Setup script for Jewgo App webhook deployment system
echo "Setting up webhook deployment system..."

# Navigate to the project directory
cd /home/ubuntu/jewgo-app

# Make deployment script executable
chmod +x scripts/deployment/deploy.sh
chmod +x scripts/deployment/webhook-handler.py

# Install required Python packages
echo "Installing required Python packages..."
pip3 install --user hmac hashlib

# Copy systemd service file
echo "Setting up systemd service..."
sudo cp scripts/deployment/jewgo-webhook.service /etc/systemd/system/

# Reload systemd and enable the service
sudo systemctl daemon-reload
sudo systemctl enable jewgo-webhook.service

# Start the webhook service
echo "Starting webhook service..."
sudo systemctl start jewgo-webhook.service

# Check service status
echo "Checking webhook service status..."
sudo systemctl status jewgo-webhook.service

echo "✅ Webhook deployment system setup complete!"
echo "Webhook endpoint: http://your-server-ip:8080"
echo "Make sure to configure the webhook secret in the GitHub repository settings"
