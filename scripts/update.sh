#!/bin/bash

# JewGo Quick Update Script
# This is a simple alias for the most common update command

# Default to production environment and all services
ENV_TYPE=${1:-prod}
SERVICE=${2:-all}

echo "🚀 JewGo Quick Update"
echo "Environment: $ENV_TYPE"
echo "Service: $SERVICE"
echo ""

# Run the full update command
./scripts/build-and-deploy.sh update "$SERVICE" --env "$ENV_TYPE"

echo ""
echo "✅ Update completed!"
echo ""
echo "Next steps:"
echo "  npm run status    # Check deployment status"
echo "  npm run logs all  # View logs"
echo "  curl http://localhost:3001  # Test frontend (optimized compose)"
echo "  curl http://localhost:5001/health  # Test backend (optimized compose)"
