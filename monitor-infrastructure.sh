#!/bin/bash
echo "🏥 JewGo Infrastructure Health Check"
echo "====================================="

# Check Redis
echo "Redis Status:"
if redis-cli -a "ddbdbe33595452921b4ea6b03d7975ba" ping > /dev/null 2>&1; then
    echo "✅ Redis: Running"
else
    echo "❌ Redis: Not responding"
fi

# Check backend instances
echo ""
echo "Backend Instances:"
for port in 8082 8083 8084; do
    if curl -s http://127.0.0.1:$port/health/lb > /dev/null 2>&1; then
        echo "✅ Port $port: Healthy"
    else
        echo "❌ Port $port: Not responding"
    fi
done

# Check load balancer
echo ""
echo "Load Balancer:"
if curl -s https://api.jewgo.app/health/lb > /dev/null 2>&1; then
    echo "✅ Load Balancer: Healthy"
else
    echo "❌ Load Balancer: Not responding"
fi

# Check systemd services
echo ""
echo "Systemd Services:"
for service in jewgo-backend jewgo-backend-2 jewgo-backend-3; do
    if systemctl is-active --quiet $service; then
        echo "✅ $service: Active"
    else
        echo "❌ $service: Inactive"
    fi
done

echo ""
echo "Health check complete!"
