#!/bin/bash

# SSL Certificate Renewal Script for api.jewgo.app
# This script safely renews SSL certificates and restarts nginx

set -e  # Exit on any error

LOG_FILE="/var/log/ssl-renewal.log"
NGINX_CONTAINER="jewgo-nginx"
PROJECT_DIR="/home/ubuntu"
SSL_DIR="$PROJECT_DIR/nginx/ssl"

# Function to log messages
log() {
    echo "[$(date)] $1" | tee -a "$LOG_FILE"
}

log "Starting SSL certificate renewal process"

# Check if nginx container is running
if ! docker ps | grep -q "$NGINX_CONTAINER"; then
    log "ERROR: Nginx container is not running. Aborting renewal."
    exit 1
fi

# Stop nginx container
log "Stopping nginx container..."
docker stop "$NGINX_CONTAINER" || {
    log "ERROR: Failed to stop nginx container"
    exit 1
}

# Renew SSL certificates
log "Renewing SSL certificates..."
certbot renew --standalone --non-interactive || {
    log "ERROR: SSL certificate renewal failed"
    # Try to restart nginx even if renewal failed
    docker start "$NGINX_CONTAINER" || log "ERROR: Failed to restart nginx after renewal failure"
    exit 1
}

# Copy certificates to nginx ssl directory
log "Copying certificates to nginx ssl directory..."
cp /etc/letsencrypt/live/api.jewgo.app/fullchain.pem "$SSL_DIR/jewgo.crt" || {
    log "ERROR: Failed to copy fullchain.pem"
    docker start "$NGINX_CONTAINER" || log "ERROR: Failed to restart nginx after copy failure"
    exit 1
}

cp /etc/letsencrypt/live/api.jewgo.app/privkey.pem "$SSL_DIR/jewgo.key" || {
    log "ERROR: Failed to copy privkey.pem"
    docker start "$NGINX_CONTAINER" || log "ERROR: Failed to restart nginx after copy failure"
    exit 1
}

# Set proper permissions
chmod 644 "$SSL_DIR/jewgo.crt"
chmod 600 "$SSL_DIR/jewgo.key"

# Start nginx container
log "Starting nginx container..."
docker start "$NGINX_CONTAINER" || {
    log "ERROR: Failed to start nginx container"
    exit 1
}

# Verify nginx is running
sleep 5
if docker ps | grep -q "$NGINX_CONTAINER"; then
    log "SUCCESS: SSL renewal completed and nginx is running"
else
    log "ERROR: Nginx container failed to start properly"
    exit 1
fi

log "SSL certificate renewal process completed successfully"
