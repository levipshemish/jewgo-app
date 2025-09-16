#!/bin/bash

# Import Grafana Dashboard for JewGo Authentication System

GRAFANA_URL="http://localhost:3003"
GRAFANA_USER="admin"
GRAFANA_PASSWORD="admin"
DASHBOARD_FILE="grafana/auth-dashboard.json"

echo "🚀 Importing JewGo Authentication Dashboard to Grafana..."

# Get Grafana API key
echo "📡 Getting Grafana API key..."
API_KEY=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"jewgo-dashboard\",\"role\":\"Admin\"}" \
  -u "$GRAFANA_USER:$GRAFANA_PASSWORD" \
  "$GRAFANA_URL/api/auth/keys" | jq -r '.key')

if [ "$API_KEY" = "null" ] || [ -z "$API_KEY" ]; then
    echo "❌ Failed to get API key. Trying alternative method..."
    
    # Alternative: Import dashboard directly
    echo "📊 Importing dashboard directly..."
    curl -X POST \
      -H "Content-Type: application/json" \
      -u "$GRAFANA_USER:$GRAFANA_PASSWORD" \
      -d @"$DASHBOARD_FILE" \
      "$GRAFANA_URL/api/dashboards/db"
    
    if [ $? -eq 0 ]; then
        echo "✅ Dashboard imported successfully!"
    else
        echo "❌ Failed to import dashboard"
        exit 1
    fi
else
    echo "✅ API key obtained: ${API_KEY:0:10}..."
    
    # Import dashboard using API key
    echo "📊 Importing dashboard..."
    curl -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $API_KEY" \
      -d @"$DASHBOARD_FILE" \
      "$GRAFANA_URL/api/dashboards/db"
    
    if [ $? -eq 0 ]; then
        echo "✅ Dashboard imported successfully!"
    else
        echo "❌ Failed to import dashboard"
        exit 1
    fi
fi

echo ""
echo "🎉 Dashboard setup complete!"
echo "📊 Access Grafana at: $GRAFANA_URL"
echo "👤 Username: $GRAFANA_USER"
echo "🔑 Password: $GRAFANA_PASSWORD"
echo ""
echo "📈 Dashboard: JewGo Authentication System Performance"
echo "🔗 Direct link: $GRAFANA_URL/d/jewgo-auth/jewgo-authentication-system-performance"
