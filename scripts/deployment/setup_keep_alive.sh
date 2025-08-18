#!/bin/bash

# JewGo Keep-Alive Setup Script
# This script helps set up keep-alive monitoring for the Render deployment

set -e

echo "🚀 JewGo Keep-Alive Setup"
echo "=========================="

# Check if we're in the right directory
if [ ! -f "backend/app.py" ]; then
    echo "❌ Error: backend/app.py not found. Please run this script from the project root."
    exit 1
fi

# Check if monitoring is already set up
if [ -f "monitoring/health_checks/keep_alive.js" ]; then
    echo "✅ Monitoring already set up!"
else
    echo "🔧 Setting up monitoring..."
    ./scripts/deployment/setup_monitoring.sh
fi

echo ""
echo "📋 Keep-Alive Options:"
echo ""

echo "1. 🕐 Manual Testing (Recommended first step):"
echo "   cd monitoring && npm run once"
echo ""

echo "2. 🔄 Continuous Monitoring (Local):"
echo "   cd monitoring && npm start"
echo ""

echo "3. ⏰ Cron Job (Recommended for production):"
echo "   Add this line to your crontab (crontab -e):"
echo "   */10 * * * * cd $(pwd)/monitoring && npm run once"
echo ""

echo "4. 🌐 External Monitoring Services:"
echo "   - UptimeRobot: https://uptimerobot.com"
echo "   - Cronitor: https://cronitor.io"
echo "   - Pingdom: https://pingdom.com"
echo ""

echo "🔗 Health Check URLs:"
echo "   - https://jewgo.onrender.com/health"
echo "   - https://jewgo.onrender.com/api/restaurants?limit=1"
echo ""

echo "📊 Test the endpoints now:"
echo "   curl https://jewgo.onrender.com/health"
echo "   curl https://jewgo.onrender.com/api/restaurants?limit=1"
echo ""

echo "✅ Setup complete! Choose an option above to start monitoring."
