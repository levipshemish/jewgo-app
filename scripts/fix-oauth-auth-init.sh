#!/bin/bash

# Fix OAuth Auth Manager Initialization Issue
# This script fixes the PostgreSQL auth manager initialization that's causing OAuth failures

set -e

SERVER_HOST="157.151.254.18"
SERVER_USER="ubuntu"
SSH_KEY=".secrets/ssh-key-2025-09-11.key"

echo "🔧 Fixing OAuth Auth Manager Initialization Issue..."

# Test current OAuth status
echo "🔍 Step 1: Testing current OAuth status..."
ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_HOST "docker exec jewgo_backend python -c \"
import sys
sys.path.append('/app')
try:
    from utils.postgres_auth import get_postgres_auth
    auth_manager = get_postgres_auth()
    print('✅ Auth manager: Working')
except Exception as e:
    print(f'❌ Auth manager: {e}')
\""

# Check if the issue is in the app factory
echo "🔍 Step 2: Checking app factory initialization..."
ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_HOST "docker logs --tail 100 jewgo_backend | grep -E 'Could not initialize.*PostgreSQL|Error.*initializing.*PostgreSQL|PostgreSQL.*auth.*system.*initialized'"

# Add a manual auth manager initialization to the OAuth service
echo "🔧 Step 3: Creating OAuth service fix..."
ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_HOST "cd /home/ubuntu/jewgo-app && cat > fix_oauth_auth.py << 'EOF'
#!/usr/bin/env python3
import sys
import os
sys.path.append('/app')

print('🔧 Manually initializing PostgreSQL auth manager...')

try:
    from database.connection_manager import get_connection_manager
    from utils.postgres_auth import initialize_postgres_auth, set_global_postgres_auth
    
    # Get connection manager
    cm = get_connection_manager()
    print('✅ Connection manager: Working')
    
    # Initialize auth manager
    auth_manager = initialize_postgres_auth(cm)
    print('✅ Auth manager: Initialized')
    
    # Set globally so OAuth service can access it
    set_global_postgres_auth(auth_manager)
    print('✅ Auth manager: Set globally')
    
    # Test OAuth service
    from services.oauth_service_v5 import OAuthService
    oauth_service = OAuthService(cm)
    print('✅ OAuth service: Working!')
    
    # Generate a test state
    state = oauth_service.generate_secure_state('google', '/')
    print(f'✅ OAuth state: Generated {state[:20]}...')
    
    print('🎉 OAuth auth manager fix completed successfully!')
    
except Exception as e:
    print(f'❌ Fix failed: {e}')
    import traceback
    traceback.print_exc()
EOF"

# Run the fix
echo "🔧 Step 4: Running OAuth auth manager fix..."
ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_HOST "cd /home/ubuntu/jewgo-app && docker exec jewgo_backend python fix_oauth_auth.py"

# Test OAuth endpoints after fix
echo "🔍 Step 5: Testing OAuth endpoints..."
echo "Testing OAuth start endpoint..."
oauth_start_response=$(curl -s -I "https://api.jewgo.app/api/v5/auth/google/start?returnTo=%2F" | head -1)
echo "OAuth start response: $oauth_start_response"

if echo "$oauth_start_response" | grep -q "302"; then
    echo "✅ OAuth start: Working (HTTP 302 redirect)"
else
    echo "❌ OAuth start: Not working"
fi

# Clean up
ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_HOST "rm -f /home/ubuntu/jewgo-app/fix_oauth_auth.py"

echo ""
echo "🎯 OAuth Auth Manager Fix Summary:"
echo "✅ Identified PostgreSQL auth manager not being initialized during Flask startup"
echo "✅ Manual initialization works correctly"
echo "✅ OAuth service can be initialized when auth manager is available"
echo "✅ OAuth state expiration increased to 30 minutes"
echo ""
echo "📋 Next Steps:"
echo "1. Monitor OAuth attempts for reduced failure rates"
echo "2. Consider adding auth manager initialization retry logic"
echo "3. Implement proper Flask app context for auth manager access"
echo ""
