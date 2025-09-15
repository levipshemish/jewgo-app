#!/bin/bash

# Simple CORS Configuration Deployment
# This script provides multiple ways to deploy CORS configuration

set -e

echo "🔧 CORS Configuration Deployment Options"
echo "========================================"
echo ""

# Option 1: Direct file copy (if SSH works)
deploy_direct() {
    echo "📁 Option 1: Direct File Copy"
    echo "============================="
    
    # Test SSH connection first
    if ssh -o ConnectTimeout=10 ubuntu@api.jewgo.app "echo 'SSH connection successful'" 2>/dev/null; then
        echo "✅ SSH connection working"
        
        echo "Copying CORS configuration files..."
        scp backend/nginx/cors-config.conf ubuntu@api.jewgo.app:/tmp/cors-config.conf
        scp backend/nginx/mac-whitelist.conf ubuntu@api.jewgo.app:/tmp/mac-whitelist.conf
        scp backend/nginx/dev-cors-config.conf ubuntu@api.jewgo.app:/tmp/dev-cors-config.conf
        
        echo "Moving files to nginx directory..."
        ssh ubuntu@api.jewgo.app "sudo mv /tmp/cors-config.conf /etc/nginx/ && sudo mv /tmp/mac-whitelist.conf /etc/nginx/ && sudo mv /tmp/dev-cors-config.conf /etc/nginx/"
        
        echo "Testing nginx configuration..."
        if ssh ubuntu@api.jewgo.app "sudo nginx -t"; then
            echo "Reloading nginx..."
            ssh ubuntu@api.jewgo.app "sudo systemctl reload nginx"
            echo "✅ CORS configuration deployed successfully!"
            return 0
        else
            echo "❌ Nginx configuration test failed"
            return 1
        fi
    else
        echo "❌ SSH connection failed"
        return 1
    fi
}

# Option 2: Manual deployment instructions
show_manual_instructions() {
    echo "📋 Option 2: Manual Deployment Instructions"
    echo "==========================================="
    echo ""
    echo "1. SSH into your server:"
    echo "   ssh ubuntu@api.jewgo.app"
    echo ""
    echo "2. Create the CORS configuration files:"
    echo "   sudo nano /etc/nginx/cors-config.conf"
    echo "   (Copy content from backend/nginx/cors-config.conf)"
    echo ""
    echo "3. Create the MAC whitelist file:"
    echo "   sudo nano /etc/nginx/mac-whitelist.conf"
    echo "   (Copy content from backend/nginx/mac-whitelist.conf)"
    echo ""
    echo "4. Update the main nginx config:"
    echo "   sudo nano /etc/nginx/sites-available/jewgo-security.conf"
    echo "   (Add include /etc/nginx/mac-whitelist.conf; at the top)"
    echo ""
    echo "5. Test and reload nginx:"
    echo "   sudo nginx -t"
    echo "   sudo systemctl reload nginx"
    echo ""
}

# Option 3: Alternative CORS solution
show_alternative_solution() {
    echo "🔄 Option 3: Alternative CORS Solution"
    echo "======================================"
    echo ""
    echo "Since CORS is browser-based, here are alternative approaches:"
    echo ""
    echo "A) Use a proxy in your frontend development:"
    echo "   Add to your next.config.js:"
    echo "   async rewrites() {"
    echo "     return ["
    echo "       {"
    echo "         source: '/api/:path*',"
    echo "         destination: 'https://api.jewgo.app/api/:path*'"
    echo "       }"
    echo "     ]"
    echo "   }"
    echo ""
    echo "B) Use development mode headers:"
    echo "   Include these headers in your requests:"
    echo "   X-Dev-Mode: true"
    echo "   X-MAC-Address: 2a:7f:6d:ae:4a:c9"
    echo ""
    echo "C) Access from localhost (already working):"
    echo "   http://localhost:3000"
    echo "   http://127.0.0.1:3000"
    echo ""
}

# Option 4: Test current CORS status
test_current_cors() {
    echo "🧪 Option 4: Test Current CORS Status"
    echo "===================================="
    echo ""
    
    echo "Testing localhost CORS..."
    if curl -s -X OPTIONS -H "Origin: http://localhost:3000" https://api.jewgo.app/api/v5/auth/login -I | grep -q "access-control-allow-origin"; then
        echo "✅ localhost CORS working"
    else
        echo "❌ localhost CORS not working"
    fi
    
    echo "Testing 127.0.0.1 CORS..."
    if curl -s -X OPTIONS -H "Origin: http://127.0.0.1:3000" https://api.jewgo.app/api/v5/auth/login -I | grep -q "access-control-allow-origin"; then
        echo "✅ 127.0.0.1 CORS working"
    else
        echo "❌ 127.0.0.1 CORS not working"
    fi
    
    echo "Testing local IP CORS..."
    if curl -s -X OPTIONS -H "Origin: http://192.168.40.237:3000" https://api.jewgo.app/api/v5/auth/login -I | grep -q "access-control-allow-origin"; then
        echo "✅ Local IP CORS working"
    else
        echo "❌ Local IP CORS not working (needs deployment)"
    fi
}

# Main menu
echo "Choose an option:"
echo "1) Deploy CORS configuration directly"
echo "2) Show manual deployment instructions"
echo "3) Show alternative solutions"
echo "4) Test current CORS status"
echo "5) All options"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        deploy_direct
        ;;
    2)
        show_manual_instructions
        ;;
    3)
        show_alternative_solution
        ;;
    4)
        test_current_cors
        ;;
    5)
        deploy_direct
        echo ""
        show_manual_instructions
        echo ""
        show_alternative_solution
        echo ""
        test_current_cors
        ;;
    *)
        echo "Invalid choice. Showing all options..."
        deploy_direct
        echo ""
        show_manual_instructions
        echo ""
        show_alternative_solution
        echo ""
        test_current_cors
        ;;
esac

echo ""
echo "🎯 Quick Solution for Immediate Use:"
echo "===================================="
echo "Start your frontend with: npm run dev"
echo "Access from: http://localhost:3000"
echo "This should work immediately without any deployment!"
