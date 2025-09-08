#!/bin/bash

# JewGo Monitoring Stack Server Deployment Script
# This script deploys the monitoring stack to a remote server via SSH

set -e

# Configuration
SERVER_USER="${SERVER_USER:-ubuntu}"
SERVER_HOST="${SERVER_HOST:-}"
SERVER_PORT="${SERVER_PORT:-22}"
SSH_KEY="${SSH_KEY:-~/.ssh/id_rsa}"
REMOTE_PATH="${REMOTE_PATH:-/home/ubuntu/jewgo-app}"

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

# Function to check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    if ! command -v ssh &> /dev/null; then
        print_error "SSH client is not installed"
        exit 1
    fi
    
    if ! command -v rsync &> /dev/null; then
        print_error "rsync is not installed"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed locally"
        exit 1
    fi
    
    print_success "All requirements met"
}

# Function to validate server connection
test_connection() {
    print_status "Testing connection to server..."
    
    if [ -z "$SERVER_HOST" ]; then
        print_error "SERVER_HOST environment variable is not set"
        print_status "Usage: SERVER_HOST=your-server.com ./deploy-to-server.sh"
        exit 1
    fi
    
    if ! ssh -i "$SSH_KEY" -p "$SERVER_PORT" -o ConnectTimeout=10 -o BatchMode=yes "$SERVER_USER@$SERVER_HOST" "echo 'Connection successful'" &> /dev/null; then
        print_error "Cannot connect to server $SERVER_HOST"
        print_status "Please check:"
        print_status "  - Server hostname/IP: $SERVER_HOST"
        print_status "  - SSH key: $SSH_KEY"
        print_status "  - Username: $SERVER_USER"
        print_status "  - Port: $SERVER_PORT"
        exit 1
    fi
    
    print_success "Server connection successful"
}

# Function to check server requirements
check_server_requirements() {
    print_status "Checking server requirements..."
    
    ssh -i "$SSH_KEY" -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" << 'EOF'
        # Check if Docker is installed
        if ! command -v docker &> /dev/null; then
            echo "Docker is not installed on the server"
            exit 1
        fi
        
        # Check if docker-compose is installed
        if ! command -v docker-compose &> /dev/null; then
            echo "docker-compose is not installed on the server"
            exit 1
        fi
        
        # Check if Docker daemon is running
        if ! docker info &> /dev/null; then
            echo "Docker daemon is not running"
            exit 1
        fi
        
        echo "Server requirements met"
EOF
    
    if [ $? -eq 0 ]; then
        print_success "Server requirements met"
    else
        print_error "Server requirements not met"
        exit 1
    fi
}

# Function to create server directories
setup_server_directories() {
    print_status "Setting up server directories..."
    
    ssh -i "$SSH_KEY" -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" << EOF
        mkdir -p $REMOTE_PATH/monitoring/grafana/provisioning/datasources
        mkdir -p $REMOTE_PATH/monitoring/grafana/provisioning/dashboards
        mkdir -p $REMOTE_PATH/monitoring/grafana/dashboards
        chmod -R 755 $REMOTE_PATH/monitoring/grafana/
        echo "Directories created successfully"
EOF
    
    print_success "Server directories created"
}

# Function to sync monitoring files
sync_monitoring_files() {
    print_status "Syncing monitoring files to server..."
    
    # Sync monitoring configuration files
    rsync -avz -e "ssh -i $SSH_KEY -p $SERVER_PORT" \
        --exclude="*.log" \
        --exclude="node_modules" \
        --exclude=".git" \
        ./monitoring/ "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/monitoring/"
    
    # Sync updated docker-compose.yml
    rsync -avz -e "ssh -i $SSH_KEY -p $SERVER_PORT" \
        ./docker-compose.yml "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/"
    
    # Sync backend metrics files
    rsync -avz -e "ssh -i $SSH_KEY -p $SERVER_PORT" \
        ./backend/routes/metrics.py "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/backend/routes/"
    
    rsync -avz -e "ssh -i $SSH_KEY -p $SERVER_PORT" \
        ./backend/middleware/metrics_middleware.py "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/backend/middleware/"
    
    rsync -avz -e "ssh -i $SSH_KEY -p $SERVER_PORT" \
        ./backend/app.py "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/backend/"
    
    # Sync frontend metrics files
    rsync -avz -e "ssh -i $SSH_KEY -p $SERVER_PORT" \
        ./frontend/app/api/metrics/ "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/frontend/app/api/metrics/"
    
    rsync -avz -e "ssh -i $SSH_KEY -p $SERVER_PORT" \
        ./frontend/lib/metrics.ts "$SERVER_USER@$SERVER_HOST:$REMOTE_PATH/frontend/lib/"
    
    print_success "Files synced to server"
}

# Function to install required Python packages
install_python_dependencies() {
    print_status "Installing Python dependencies on server..."
    
    ssh -i "$SSH_KEY" -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" << 'EOF'
        cd /home/ubuntu/jewgo-app/backend
        
        # Install prometheus_client if not already installed
        if [ -f requirements.txt ]; then
            # Add prometheus_client to requirements if not present
            if ! grep -q "prometheus_client" requirements.txt; then
                echo "prometheus_client==0.19.0" >> requirements.txt
            fi
            pip install -r requirements.txt
        else
            pip install prometheus_client==0.19.0
        fi
        
        echo "Python dependencies installed"
EOF
    
    print_success "Python dependencies installed"
}

# Function to start monitoring services
start_monitoring_services() {
    print_status "Starting monitoring services on server..."
    
    ssh -i "$SSH_KEY" -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" << 'EOF'
        cd /home/ubuntu/jewgo-app
        
        # Stop existing monitoring services if running
        docker-compose down prometheus alertmanager grafana node-exporter postgres-exporter redis-exporter nginx-exporter blackbox-exporter 2>/dev/null || true
        
        # Start monitoring services
        docker-compose up -d prometheus alertmanager grafana node-exporter postgres-exporter redis-exporter nginx-exporter blackbox-exporter
        
        # Wait for services to start
        sleep 15
        
        echo "Monitoring services started"
EOF
    
    print_success "Monitoring services started"
}

# Function to verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    ssh -i "$SSH_KEY" -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" << 'EOF'
        cd /home/ubuntu/jewgo-app
        
        # Check if containers are running
        echo "=== Running Containers ==="
        docker-compose ps | grep -E "(prometheus|grafana|alertmanager|exporter)" || echo "No monitoring containers found"
        
        # Check service health
        echo ""
        echo "=== Service Health ==="
        
        # Check Prometheus
        if curl -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
            echo "✅ Prometheus is healthy"
        else
            echo "❌ Prometheus is not responding"
        fi
        
        # Check Grafana
        if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
            echo "✅ Grafana is healthy"
        else
            echo "❌ Grafana is not responding"
        fi
        
        # Check AlertManager
        if curl -s http://localhost:9093/-/healthy > /dev/null 2>&1; then
            echo "✅ AlertManager is healthy"
        else
            echo "❌ AlertManager is not responding"
        fi
        
        echo ""
        echo "=== Port Status ==="
        netstat -tulpn | grep -E ":(3001|9090|9093)" || echo "No monitoring ports found"
EOF
    
    print_success "Deployment verification completed"
}

# Function to display access information
display_access_info() {
    print_success "🎉 JewGo Monitoring Stack deployed successfully!"
    echo ""
    echo "📊 Access URLs:"
    echo "   Grafana Dashboard: http://$SERVER_HOST:3001"
    echo "   Prometheus:        http://$SERVER_HOST:9090"
    echo "   AlertManager:      http://$SERVER_HOST:9093"
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
    echo "🔧 Management Commands:"
    echo "   Start:  ssh $SERVER_USER@$SERVER_HOST 'cd $REMOTE_PATH && docker-compose up -d'"
    echo "   Stop:   ssh $SERVER_USER@$SERVER_HOST 'cd $REMOTE_PATH && docker-compose down'"
    echo "   Logs:   ssh $SERVER_USER@$SERVER_HOST 'cd $REMOTE_PATH && docker-compose logs -f'"
    echo ""
    echo "📖 Documentation:"
    echo "   Server: $REMOTE_PATH/monitoring/README.md"
    echo ""
}

# Main deployment function
main() {
    echo "🚀 JewGo Monitoring Stack Server Deployment"
    echo "============================================="
    echo ""
    
    check_requirements
    test_connection
    check_server_requirements
    setup_server_directories
    sync_monitoring_files
    install_python_dependencies
    start_monitoring_services
    verify_deployment
    display_access_info
    
    print_success "Deployment completed successfully! 🎯"
}

# Run main function
main "$@"
