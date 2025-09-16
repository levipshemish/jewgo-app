#!/bin/bash
# Deployment script with OAuth environment variable fix

set -e

echo "=== JewGo Deployment with OAuth Fix ==="
echo "======================================="

# Run the normal deployment
echo "[INFO] Running normal deployment..."
./scripts/deploy-to-server.sh

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo "[SUCCESS] Deployment completed successfully"
    
    # Test authentication endpoints
    echo "[INFO] Testing authentication endpoints..."
    ./scripts/test-auth-flow.sh
    
    echo ""
    echo "=== Next Steps ==="
    echo "1. If OAuth tests show 501 errors, run the manual setup from docs/OAUTH_SETUP_GUIDE.md"
    echo "2. SSH into server and add missing environment variables"
    echo "3. Restart backend service: docker-compose restart backend"
    echo "4. Test again: ./scripts/test-auth-flow.sh"
    echo "================"
else
    echo "[ERROR] Deployment failed"
    exit 1
fi
