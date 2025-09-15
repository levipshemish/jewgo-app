#!/bin/bash

# Deploy CORS Configuration to Server
# This script deploys the new CORS configuration files to the production server

set -e

SERVER="ubuntu@api.jewgo.app"
NGINX_CONFIG_DIR="/etc/nginx"
NGINX_SITES_DIR="/etc/nginx/sites-available"

echo "🚀 Deploying CORS Configuration to Server"
echo "=========================================="
echo "Server: $SERVER"
echo ""

# Function to deploy file
deploy_file() {
    local local_file="$1"
    local remote_file="$2"
    local description="$3"
    
    echo -n "Deploying $description... "
    
    if scp "$local_file" "$SERVER:$remote_file" > /dev/null 2>&1; then
        echo "✅ SUCCESS"
        return 0
    else
        echo "❌ FAILED"
        return 1
    fi
}

# Function to test nginx configuration
test_nginx_config() {
    echo -n "Testing Nginx configuration... "
    
    if ssh "$SERVER" "sudo nginx -t" > /dev/null 2>&1; then
        echo "✅ SUCCESS"
        return 0
    else
        echo "❌ FAILED"
        echo "Nginx configuration test failed. Check the server logs."
        return 1
    fi
}

# Function to reload nginx
reload_nginx() {
    echo -n "Reloading Nginx... "
    
    if ssh "$SERVER" "sudo systemctl reload nginx" > /dev/null 2>&1; then
        echo "✅ SUCCESS"
        return 0
    else
        echo "❌ FAILED"
        echo "Failed to reload Nginx. Check the server logs."
        return 1
    fi
}

echo "📁 Deploying Configuration Files"
echo "================================"

# Deploy CORS configuration files
deploy_file "backend/nginx/cors-config.conf" "$NGINX_CONFIG_DIR/cors-config.conf" "CORS Configuration"
deploy_file "backend/nginx/mac-whitelist.conf" "$NGINX_CONFIG_DIR/mac-whitelist.conf" "MAC Whitelist"
deploy_file "backend/nginx/dev-cors-config.conf" "$NGINX_CONFIG_DIR/dev-cors-config.conf" "Development CORS"
deploy_file "backend/nginx/jewgo-security.conf" "$NGINX_SITES_DIR/jewgo-security.conf" "Main Security Config"

echo ""
echo "🧪 Testing Configuration"
echo "======================="

# Test nginx configuration
if test_nginx_config; then
    echo ""
    echo "🔄 Reloading Nginx"
    echo "=================="
    
    # Reload nginx
    if reload_nginx; then
        echo ""
        echo "✅ Deployment Complete!"
        echo "======================"
        echo "CORS configuration has been successfully deployed."
        echo ""
        echo "🧪 Testing CORS from MacBook"
        echo "============================"
        
        # Run the test script
        if ./scripts/test-cors-from-macbook.sh; then
            echo ""
            echo "🎉 All tests passed! CORS is working correctly."
        else
            echo ""
            echo "⚠️  Some tests failed. Check the configuration."
        fi
    else
        echo ""
        echo "❌ Failed to reload Nginx. Configuration deployed but not active."
        exit 1
    fi
else
    echo ""
    echo "❌ Nginx configuration test failed. Deployment aborted."
    exit 1
fi

echo ""
echo "📋 Next Steps"
echo "============="
echo "1. Test your frontend development server:"
echo "   npm run dev"
echo ""
echo "2. Access your app from:"
echo "   http://localhost:3000"
echo "   http://192.168.40.237:3000"
echo ""
echo "3. The API should now accept requests from your MacBook"
echo "   regardless of which network you're on."
echo ""
echo "4. If you change networks, your local IP may change."
echo "   The configuration supports common network ranges,"
echo "   but you may need to update the whitelist."
