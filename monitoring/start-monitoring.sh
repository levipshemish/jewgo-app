#!/bin/bash

# JewGo Monitoring Stack Startup Script
# This script starts the complete monitoring stack for JewGo

set -e

echo "🚀 Starting JewGo Monitoring Stack..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install docker-compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating monitoring directories..."
mkdir -p monitoring/grafana/provisioning/datasources
mkdir -p monitoring/grafana/provisioning/dashboards
mkdir -p monitoring/grafana/dashboards

# Set proper permissions for Grafana
echo "🔐 Setting permissions..."
chmod -R 755 monitoring/grafana/

# Start monitoring services
echo "🐳 Starting monitoring services..."
docker-compose up -d prometheus alertmanager grafana node-exporter postgres-exporter redis-exporter nginx-exporter blackbox-exporter

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."

# Check Prometheus
if curl -s http://localhost:9090/-/healthy > /dev/null; then
    echo "✅ Prometheus is healthy"
else
    echo "❌ Prometheus is not responding"
fi

# Check Grafana
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Grafana is healthy"
else
    echo "❌ Grafana is not responding"
fi

# Check AlertManager
if curl -s http://localhost:9093/-/healthy > /dev/null; then
    echo "✅ AlertManager is healthy"
else
    echo "❌ AlertManager is not responding"
fi

# Check JewGo API health endpoints (if available)
echo "🔍 Checking JewGo API health endpoints..."
if command -v curl > /dev/null; then
    API_BASE=${API_BASE:-"https://api.jewgo.app"}
    
    # Check basic health
    echo -n "Checking API healthz... "
    if curl -s -f "$API_BASE/healthz" > /dev/null 2>&1; then
        echo "✅ API healthz is healthy"
    else
        echo "❌ API healthz is not responding"
    fi
    
    # Check v5 auth health
    echo -n "Checking API v5 auth health... "
    if curl -s -f "$API_BASE/api/v5/auth/health" > /dev/null 2>&1; then
        echo "✅ API v5 auth health is healthy"
    else
        echo "❌ API v5 auth health is not responding"
    fi
    
    # Check v5 search health
    echo -n "Checking API v5 search health... "
    if curl -s -f "$API_BASE/api/v5/search/health" > /dev/null 2>&1; then
        echo "✅ API v5 search health is healthy"
    else
        echo "❌ API v5 search health is not responding"
    fi
fi

# Display access information
echo ""
echo "🎉 JewGo Monitoring Stack is running!"
echo ""
echo "📊 Access URLs:"
echo "   Grafana Dashboard: http://localhost:3001"
echo "   Prometheus:        http://localhost:9090"
echo "   AlertManager:      http://localhost:9093"
echo ""
echo "🔑 Default Credentials:"
echo "   Grafana: admin / admin123"
echo ""
echo "📋 Available Dashboards:"
echo "   - JewGo Application Overview"
echo "   - JewGo Infrastructure Monitoring"
echo "   - JewGo Database Monitoring"
echo "   - JWT Authentication System Monitoring"
echo ""
echo "🔧 To stop the monitoring stack:"
echo "   docker-compose down"
echo ""
echo "📖 For detailed setup instructions, see:"
echo "   monitoring/MONITORING_SETUP_GUIDE.md"
echo ""

# Show running containers
echo "🐳 Running monitoring containers:"
docker-compose ps | grep -E "(prometheus|grafana|alertmanager|exporter)"

echo ""
echo "✨ Setup complete! Happy monitoring! 🎯"
