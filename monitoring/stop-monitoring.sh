#!/bin/bash

# JewGo Monitoring Stack Shutdown Script
# This script stops the complete monitoring stack for JewGo

set -e

echo "🛑 Stopping JewGo Monitoring Stack..."

# Stop monitoring services
echo "🐳 Stopping monitoring services..."
docker-compose down

# Optional: Remove volumes (uncomment if you want to reset all data)
# echo "🗑️  Removing monitoring data volumes..."
# docker-compose down -v

echo ""
echo "✅ JewGo Monitoring Stack has been stopped!"
echo ""
echo "📝 Note: Monitoring data is preserved in Docker volumes."
echo "   To completely reset monitoring data, run:"
echo "   docker-compose down -v"
echo ""
echo "🚀 To start the monitoring stack again, run:"
echo "   ./monitoring/start-monitoring.sh"
echo ""
