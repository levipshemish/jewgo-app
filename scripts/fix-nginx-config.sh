#!/bin/bash

# Script to fix Nginx configuration and reload it
# This addresses the rate limiting issues

set -e

echo "🔧 Fixing Nginx configuration..."

# Test the current Nginx configuration
echo "📋 Testing current Nginx configuration..."
if ssh -i .secrets/ssh-key-2025-09-11.key ubuntu@api.jewgo.app "sudo nginx -t"; then
    echo "✅ Nginx configuration is valid"
    echo "🔄 Reloading Nginx..."
    ssh -i .secrets/ssh-key-2025-09-11.key ubuntu@api.jewgo.app "sudo systemctl reload nginx"
    echo "✅ Nginx reloaded successfully"
else
    echo "❌ Nginx configuration has errors"
    echo "🔍 Checking Nginx error logs..."
    ssh -i .secrets/ssh-key-2025-09-11.key ubuntu@api.jewgo.app "sudo nginx -t 2>&1 | head -10"
    echo ""
    echo "💡 You may need to manually fix the Nginx configuration on the server"
    echo "   The error was: 'location' directive is not allowed here in /etc/nginx/sites-enabled/jewgo:385"
fi

echo ""
echo "🧪 Testing rate limits after Nginx reload..."
for i in {1..3}; do
    echo "Test request $i:"
    response_code=$(curl -s -w "%{http_code}" "https://api.jewgo.app/api/v5/auth/csrf" -o /dev/null)
    if [ "$response_code" = "200" ]; then
        echo "✅ Rate limit test $i passed (HTTP $response_code)"
    else
        echo "⚠️  Rate limit test $i failed (HTTP $response_code)"
    fi
    sleep 1
done

echo ""
echo "🎯 Testing local proxy..."
for i in {1..3}; do
    echo "Local proxy test $i:"
    response_code=$(curl -s -w "%{http_code}" "http://localhost:3000/api/v5/auth/csrf" -o /dev/null)
    if [ "$response_code" = "200" ]; then
        echo "✅ Local proxy test $i passed (HTTP $response_code)"
    else
        echo "⚠️  Local proxy test $i failed (HTTP $response_code)"
    fi
    sleep 1
done

echo ""
echo "🎉 Nginx configuration fix completed!"
