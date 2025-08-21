#!/bin/bash

# JewGo Analytics Setup Script
# This script helps configure Google Analytics for the JewGo application

echo "🔧 JewGo Analytics Setup"
echo "=========================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ No .env file found in the root directory"
    echo "Please create a .env file based on env.template"
    exit 1
fi

# Check current GA configuration
CURRENT_GA_ID=$(grep "NEXT_PUBLIC_GA_MEASUREMENT_ID" .env | cut -d'=' -f2)

if [ "$CURRENT_GA_ID" = "G-XXXXXXXXXX" ] || [ -z "$CURRENT_GA_ID" ]; then
    echo "⚠️  Google Analytics is not properly configured"
    echo ""
    echo "To fix the analytics 500 errors, you need to:"
    echo ""
    echo "1. Create a Google Analytics 4 property at:"
    echo "   https://analytics.google.com/"
    echo ""
    echo "2. Get your Measurement ID (format: G-XXXXXXXXXX)"
    echo ""
    echo "3. Update your .env file with:"
    echo "   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX"
    echo ""
    echo "4. Or run this script with your measurement ID:"
    echo "   ./scripts/setup-analytics.sh G-XXXXXXXXXX"
    echo ""
    
    if [ $# -eq 1 ]; then
        NEW_GA_ID=$1
        echo "🔧 Updating GA Measurement ID to: $NEW_GA_ID"
        
        # Update .env file
        if grep -q "NEXT_PUBLIC_GA_MEASUREMENT_ID" .env; then
            sed -i.bak "s/NEXT_PUBLIC_GA_MEASUREMENT_ID=.*/NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEW_GA_ID/" .env
        else
            echo "NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEW_GA_ID" >> .env
        fi
        
        echo "✅ GA Measurement ID updated successfully!"
        echo "🔄 Please restart your development server for changes to take effect"
    fi
else
    echo "✅ Google Analytics is configured with ID: $CURRENT_GA_ID"
    echo ""
    echo "If you're still seeing 500 errors, check:"
    echo "1. The GA property is active and properly configured"
    echo "2. The measurement ID is correct"
    echo "3. Your domain is added to the GA property"
fi

echo ""
echo "📊 Analytics Status:"
echo "==================="
echo "• API Endpoint: /api/analytics"
echo "• Status: $(curl -s http://localhost:3000/api/analytics | jq -r '.message // "Unknown"')"
echo ""
echo "🔍 To test analytics:"
echo "1. Open browser dev tools"
echo "2. Check Network tab for /api/analytics calls"
echo "3. Look for 200 responses instead of 500 errors"
