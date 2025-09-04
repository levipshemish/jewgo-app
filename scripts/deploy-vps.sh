#!/bin/bash
echo "🚀 Deploying JewGo Backend to VPS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run with sudo privileges"
    exit 1
fi

# Stop existing services
print_status "Stopping existing backend services..."
systemctl stop jewgo-backend* 2>/dev/null || true
sleep 3

# Copy systemd service files
print_status "Installing systemd service files..."
cp config/systemd/jewgo-backend*.service /etc/systemd/system/

# Set proper permissions
chmod 644 /etc/systemd/system/jewgo-backend*.service

# Copy environment file
print_status "Setting up environment configuration..."
cp config/environment/active/backend.vps.env backend/backend/.env

# Reload systemd
print_status "Reloading systemd configuration..."
systemctl daemon-reload

# Start services one by one
print_status "Starting backend services..."
systemctl start jewgo-backend
sleep 5
systemctl start jewgo-backend-2
sleep 5
systemctl start jewgo-backend-3

# Enable services to start on boot
print_status "Enabling services to start on boot..."
systemctl enable jewgo-backend
systemctl enable jewgo-backend-2
systemctl enable jewgo-backend-3

# Check service status
print_status "Checking service status..."
systemctl status jewgo-backend* --no-pager

# Test health endpoints
print_status "Testing health endpoints..."
sleep 10

for port in 8082 8083 8084; do
    if curl -s http://127.0.0.1:$port/health/lb > /dev/null 2>&1; then
        print_success "Port $port: Healthy"
    else
        print_warning "Port $port: Not responding"
    fi
done

# Run monitoring script if available
if [ -f "monitor-infrastructure.sh" ]; then
    print_status "Running infrastructure health check..."
    ./monitor-infrastructure.sh
fi

print_success "VPS deployment complete!"
echo
echo "Next steps:"
echo "1. Verify all services are running: sudo systemctl status jewgo-backend*"
echo "2. Check logs if needed: sudo journalctl -u jewgo-backend* -f"
echo "3. Test external access: curl https://api.jewgo.app/health/lb"
