#!/bin/bash

# Redis Setup Script for JewGo App
# This script helps set up Redis for development and production environments

set -e

echo "🚀 Setting up Redis for JewGo App..."

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

# Check if Redis is already installed
check_redis_installed() {
    if command -v redis-server &> /dev/null; then
        print_success "Redis is already installed"
        redis-server --version
        return 0
    else
        print_warning "Redis is not installed"
        return 1
    fi
}

# Install Redis based on OS
install_redis() {
    print_status "Installing Redis..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install redis
            brew services start redis
        else
            print_error "Homebrew is required for macOS. Please install it first: https://brew.sh/"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            # Ubuntu/Debian
            sudo apt-get update
            sudo apt-get install -y redis-server
            sudo systemctl enable redis-server
            sudo systemctl start redis-server
        elif command -v yum &> /dev/null; then
            # CentOS/RHEL
            sudo yum install -y redis
            sudo systemctl enable redis
            sudo systemctl start redis
        else
            print_error "Unsupported Linux distribution. Please install Redis manually."
            exit 1
        fi
    else
        print_error "Unsupported operating system: $OSTYPE"
        exit 1
    fi
}

# Configure Redis
configure_redis() {
    print_status "Configuring Redis..."
    
    # Create Redis config directory if it doesn't exist
    sudo mkdir -p /etc/redis
    
    # Create a basic Redis configuration
    cat > redis.conf << EOF
# Redis configuration for JewGo App
bind 127.0.0.1
port 6379
timeout 300
tcp-keepalive 60
loglevel notice
logfile /var/log/redis/redis-server.log
databases 16
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis
maxmemory 256mb
maxmemory-policy allkeys-lru
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
EOF

    # Copy configuration to system location
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - use local config
        cp redis.conf /usr/local/etc/redis.conf
    else
        # Linux
        sudo cp redis.conf /etc/redis/redis.conf
        sudo chown redis:redis /etc/redis/redis.conf
    fi
    
    print_success "Redis configuration created"
}

# Test Redis connection
test_redis() {
    print_status "Testing Redis connection..."
    
    if redis-cli ping | grep -q "PONG"; then
        print_success "Redis is running and responding"
        return 0
    else
        print_error "Redis is not responding"
        return 1
    fi
}

# Set up environment variables
setup_env() {
    print_status "Setting up environment variables..."
    
    # Check if .env file exists
    if [ -f "backend/.env" ]; then
        print_warning ".env file already exists. Please add the following Redis configuration:"
        echo "REDIS_URL=redis://localhost:6379"
        echo "REDIS_HOST=localhost"
        echo "REDIS_PORT=6379"
        echo "REDIS_DB=0"
    else
        print_status "Creating .env file with Redis configuration..."
        cat >> backend/.env << EOF

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
EOF
        print_success "Environment variables added to backend/.env"
    fi
}

# Install Python Redis dependencies
install_python_deps() {
    print_status "Installing Python Redis dependencies..."
    
    cd backend
    
    # Install Redis Python packages
    pip install redis==5.0.1 Flask-Caching==2.1.0 Flask-Session==0.5.0
    
    print_success "Python Redis dependencies installed"
    cd ..
}

# Main setup function
main() {
    print_status "Starting Redis setup for JewGo App..."
    
    # Check if Redis is installed
    if ! check_redis_installed; then
        install_redis
    fi
    
    # Configure Redis
    configure_redis
    
    # Test Redis
    if test_redis; then
        print_success "Redis setup completed successfully!"
    else
        print_error "Redis setup failed. Please check the installation."
        exit 1
    fi
    
    # Set up environment variables
    setup_env
    
    # Install Python dependencies
    install_python_deps
    
    print_success "🎉 Redis setup completed successfully!"
    print_status "You can now start your JewGo app with Redis caching enabled."
    print_status "To test Redis, run: redis-cli ping"
    print_status "To monitor Redis: redis-cli monitor"
}

# Run main function
main "$@"
