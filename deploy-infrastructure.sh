#!/bin/bash
echo "🚀 Deploying JewGo Infrastructure..."

# Start Redis
echo "Starting Redis..."
sudo systemctl start redis-server
sleep 5

# Start all backend instances
echo "Starting backend instances..."
sudo systemctl start jewgo-backend*
sleep 10

# Check all services
echo "Checking service status..."
sudo systemctl status jewgo-backend*

# Test health endpoints
echo "Testing health endpoints..."
curl -s http://127.0.0.1:8082/health/lb | jq '.instance_id'
curl -s http://127.0.0.1:8083/health/lb | jq '.instance_id'
curl -s http://127.0.0.1:8084/health/lb | jq '.instance_id'

# Test load balancer
echo "Testing load balancer..."
curl -s https://api.jewgo.app/health/lb | jq '.instance_id'

echo "✅ Infrastructure deployment complete!"
