#!/bin/bash
# Test server connection and upload files
set -e

SERVER_IP="141.148.50.111"
SERVER_USER="ubuntu"

echo "🔌 Testing server connection..."

# Test basic connectivity
echo "📡 Testing network connectivity..."
if ping -c 3 $SERVER_IP > /dev/null 2>&1; then
    echo "✅ Server is reachable"
else
    echo "❌ Server is not reachable (100% packet loss)"
    echo "🔄 Server may be down or restarting"
    exit 1
fi

# Test SSH connection
echo "🔑 Testing SSH connection..."
if ssh -o ConnectTimeout=10 $SERVER_USER@$SERVER_IP "echo 'SSH connection successful'" > /dev/null 2>&1; then
    echo "✅ SSH connection successful"
else
    echo "❌ SSH connection failed"
    echo "🔄 SSH keys may need to be refreshed or server is still starting"
    exit 1
fi

# Test backend accessibility
echo "🌐 Testing backend accessibility..."
if curl -s --connect-timeout 10 "https://api.jewgo.app/health" | jq -e '.status == "healthy"' > /dev/null 2>&1; then
    echo "✅ Backend is accessible and healthy"
else
    echo "⚠️ Backend is not accessible (may be restarting)"
fi

echo "✅ Server connection test completed!"
