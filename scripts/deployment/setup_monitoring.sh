#!/bin/bash

# JewGo API Monitoring Setup Script
# This script sets up monitoring and keep-alive functionality for the Render deployment

set -e

echo "🔧 Setting up JewGo API monitoring..."

# Check if we're in the right directory
if [ ! -f "backend/app.py" ]; then
    echo "❌ Error: backend/app.py not found. Please run this script from the project root."
    exit 1
fi

# Create monitoring directory if it doesn't exist
mkdir -p monitoring/health_checks

# Install monitoring dependencies
echo "📦 Installing monitoring dependencies..."
cd monitoring
npm install --production || echo "⚠️  npm install failed, continuing..."

# Make keep-alive script executable
chmod +x health_checks/keep_alive.js

# Create environment file for monitoring
cat > .env.monitoring << EOF
# JewGo API Monitoring Configuration
API_URL=https://jewgo.onrender.com
KEEP_ALIVE_INTERVAL=600000
KEEP_ALIVE_TIMEOUT=30000
EOF

echo "✅ Monitoring setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up a cron job or external service to run the keep-alive monitor"
echo "2. Configure UptimeRobot or similar service for external monitoring"
echo "3. Test the health endpoints manually"
echo ""
echo "🔗 Health check URLs:"
echo "   - https://jewgo.onrender.com/health"
echo "   - https://jewgo.onrender.com/api/restaurants?limit=1"
echo ""
echo "🚀 To test monitoring locally:"
echo "   cd monitoring && npm run once"
