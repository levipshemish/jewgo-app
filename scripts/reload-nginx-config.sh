#!/bin/bash

# Script to reload Nginx configuration on the server
# This is needed when we update rate limits or CORS settings

set -e

echo "[INFO] Reloading Nginx configuration on server..."

# Test Nginx configuration first
echo "[INFO] Testing Nginx configuration..."
if ! ssh ubuntu@api.jewgo.app "sudo nginx -t"; then
    echo "[ERROR] Nginx configuration test failed"
    exit 1
fi

echo "[SUCCESS] Nginx configuration test passed"

# Reload Nginx
echo "[INFO] Reloading Nginx..."
if ! ssh ubuntu@api.jewgo.app "sudo systemctl reload nginx"; then
    echo "[ERROR] Failed to reload Nginx"
    exit 1
fi

echo "[SUCCESS] Nginx configuration reloaded successfully"

# Test the changes
echo "[INFO] Testing rate limits..."
for i in {1..3}; do
    echo "Test request $i:"
    curl -s -w "HTTP Status: %{http_code}\n" "https://api.jewgo.app/api/v5/auth/csrf" | tail -1
done

echo "[SUCCESS] Nginx configuration reload completed"
