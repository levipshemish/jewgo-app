#!/bin/sh

# Deployment script for Jewgo App
echo "🚀 Starting deployment..."

# Navigate to the project directory
cd /home/ubuntu/jewgo-app

# Pull the latest changes from the main branch
echo "📥 Pulling latest changes from GitHub..."
git config --global --add safe.directory /home/ubuntu/jewgo-app
git fetch origin
git reset --hard origin/main

# Clear Redis cache to ensure fresh data
echo "🧹 Clearing Redis cache..."
docker exec jewgo_redis redis-cli FLUSHALL || echo "⚠️  Redis cache clear failed (container may not be running)"

# Rebuild and restart the backend container to pick up changes
echo "🔨 Rebuilding backend container with latest code..."
docker build -t jewgo-app-backend ./backend
docker stop jewgo_backend || true
docker rm jewgo_backend || true
docker run -d --name jewgo_backend --network jewgo-app_default -p 5000:5000 --env-file .env jewgo-app-backend

# Wait for the backend to start
echo "⏳ Waiting for backend to start..."
sleep 20

# Check if the backend is healthy
echo "🏥 Checking backend health..."
max_attempts=10
attempt=1
while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost:5000/healthz > /dev/null 2>&1; then
        echo "✅ Backend is healthy"
        break
    else
        echo "⏳ Attempt $attempt/$max_attempts: Backend not ready yet..."
        sleep 5
        attempt=$((attempt + 1))
    fi
done

if [ $attempt -gt $max_attempts ]; then
    echo "❌ Backend health check failed after $max_attempts attempts"
    echo "📋 Backend logs:"
    docker logs --tail 20 jewgo_backend
    exit 1
fi

# Verify the deployment by checking a test endpoint
echo "🧪 Verifying deployment..."
if curl -f http://localhost:5000/api/restaurants?limit=1 > /dev/null 2>&1; then
    echo "✅ API endpoint verification successful"
else
    echo "⚠️  API endpoint verification failed"
fi

echo "🎉 Deployment completed successfully!"
echo "📊 Container status:"
docker ps --filter "name=jewgo_"