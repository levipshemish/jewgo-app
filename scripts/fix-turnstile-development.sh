#!/bin/bash

# Fix Turnstile Development Configuration
echo "🔧 Fixing Turnstile Development Configuration"
echo "============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check current environment
echo "📋 Current environment analysis:"
echo "   - NODE_ENV: ${NODE_ENV:-development}"
echo "   - Current hostname: $(hostname)"
echo ""

# Check if .env.local exists
if [ ! -f "frontend/.env.local" ]; then
    echo "📝 Creating frontend/.env.local..."
    touch frontend/.env.local
fi

# Check current Turnstile configuration
echo "🔍 Current Turnstile configuration:"
if grep -q "NEXT_PUBLIC_TURNSTILE_SITE_KEY" frontend/.env.local; then
    CURRENT_KEY=$(grep "NEXT_PUBLIC_TURNSTILE_SITE_KEY" frontend/.env.local | cut -d'=' -f2)
    echo "   - Current site key: $CURRENT_KEY"
    
    # Check if it's a production key
    if [[ "$CURRENT_KEY" == 0x4AAAAAA* ]]; then
        echo "   ⚠️  Production key detected!"
        echo "   - This will cause domain mismatch errors on localhost"
        echo ""
        
        echo "🔄 Options to fix this:"
        echo "   1. Use Cloudflare test key (recommended for development)"
        echo "   2. Create a development-specific Turnstile key"
        echo "   3. Add localhost to your production key's allowed domains"
        echo ""
        
        read -p "Choose option (1-3): " choice
        
        case $choice in
            1)
                echo "🔄 Switching to Cloudflare test key..."
                sed -i '' '/NEXT_PUBLIC_TURNSTILE_SITE_KEY/d' frontend/.env.local
                echo "NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA" >> frontend/.env.local
                echo "✅ Updated with test key: 1x00000000000000000000AA"
                ;;
            2)
                echo "📝 To create a development key:"
                echo "   1. Go to https://dash.cloudflare.com/?to=/:account/turnstile"
                echo "   2. Create a new site key"
                echo "   3. Add 'localhost' to the allowed domains"
                echo "   4. Copy the new site key"
                echo ""
                read -p "Enter your development site key: " dev_key
                if [ ! -z "$dev_key" ]; then
                    sed -i '' '/NEXT_PUBLIC_TURNSTILE_SITE_KEY/d' frontend/.env.local
                    echo "NEXT_PUBLIC_TURNSTILE_SITE_KEY=$dev_key" >> frontend/.env.local
                    echo "✅ Updated with development key: $dev_key"
                else
                    echo "❌ No key provided, keeping current configuration"
                fi
                ;;
            3)
                echo "📝 To add localhost to production key:"
                echo "   1. Go to https://dash.cloudflare.com/?to=/:account/turnstile"
                echo "   2. Find your site key: $CURRENT_KEY"
                echo "   3. Edit the key settings"
                echo "   4. Add 'localhost' to the allowed domains list"
                echo "   5. Save the changes"
                echo ""
                echo "⚠️  Note: This will allow the production key to work on localhost"
                echo "   but may have security implications for production use."
                ;;
            *)
                echo "❌ Invalid choice, keeping current configuration"
                ;;
        esac
    else
        echo "   ✅ Key appears to be configured for development"
    fi
else
    echo "   ❌ No Turnstile site key configured"
    echo ""
    echo "🔄 Setting up with Cloudflare test key..."
    echo "NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA" >> frontend/.env.local
    echo "✅ Added test key: 1x00000000000000000000AA"
fi

echo ""
echo "📋 Next steps:"
echo "1. Restart your development server:"
echo "   cd frontend && npm run dev"
echo ""
echo "2. Test the Turnstile widget:"
echo "   - Visit http://localhost:3000/auth/signin"
echo "   - Try the 'Continue as Guest' button"
echo "   - Check browser console for any remaining errors"
echo ""
echo "3. If you still see errors, check:"
echo "   - Browser console for specific error messages"
echo "   - Network tab for failed requests"
echo "   - That your domain is properly configured in Cloudflare Turnstile"
echo ""
echo "🔧 For production deployment:"
echo "   - Use a production site key configured for your domain"
echo "   - Ensure the domain is added to the Turnstile key's allowed domains"
echo "   - Set NEXT_PUBLIC_TURNSTILE_SITE_KEY in your production environment"
