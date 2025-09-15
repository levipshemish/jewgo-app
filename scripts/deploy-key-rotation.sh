#!/bin/bash

# JewGo Key Rotation Service Deployment Script
# This script deploys the automated JWT key rotation service

set -e

SERVER_IP="157.151.254.18"
SSH_KEY=".secrets/ssh-key-2025-09-11.key"
BACKEND_PATH="/home/ubuntu/jewgo-app/backend"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deploying JewGo Key Rotation Service..."

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "[ERROR] SSH key not found: $SSH_KEY"
    exit 1
fi

# Test SSH connection
echo "Testing SSH connection..."
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 ubuntu@"$SERVER_IP" "echo 'Connection successful'"; then
    echo "[ERROR] SSH connection failed"
    exit 1
fi

echo "[SUCCESS] SSH connection established"

# Deploy the key rotation script
echo "Deploying key rotation script..."
scp -i "$SSH_KEY" backend/scripts/automated_key_rotation.py ubuntu@"$SERVER_IP":"$BACKEND_PATH"/scripts/

# Create systemd service file
echo "Creating systemd service configuration..."
ssh -i "$SSH_KEY" ubuntu@"$SERVER_IP" "sudo tee /etc/systemd/system/jewgo-key-rotation.service > /dev/null << 'EOF'
[Unit]
Description=JewGo JWT Key Rotation Service
Documentation=https://docs.jewgo.app/security/key-rotation
After=network.target
Wants=network.target

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=$BACKEND_PATH
Environment=PATH=$BACKEND_PATH/.venv/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=$BACKEND_PATH/.venv/bin/python $BACKEND_PATH/scripts/automated_key_rotation.py --daemon
Restart=always
RestartSec=30
StandardOutput=journal
StandardError=journal
SyslogIdentifier=jewgo-key-rotation

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$BACKEND_PATH

[Install]
WantedBy=multi-user.target
EOF"

# Reload systemd and enable the service
echo "Enabling and starting key rotation service..."
ssh -i "$SSH_KEY" ubuntu@"$SERVER_IP" "
    sudo systemctl daemon-reload
    sudo systemctl enable jewgo-key-rotation.service
    sudo systemctl start jewgo-key-rotation.service
    sleep 2
    sudo systemctl status jewgo-key-rotation.service --no-pager -l
"

echo "[SUCCESS] Key rotation service deployed and started"

# Test the service
echo "Testing key rotation service..."
ssh -i "$SSH_KEY" ubuntu@"$SERVER_IP" "
    cd $BACKEND_PATH
    source .venv/bin/activate
    python scripts/automated_key_rotation.py --health-check
"

echo "[SUCCESS] Key rotation service deployment completed"