#!/bin/bash

# JewGo Backend VPS Deployment Script
# This script copies the Docker setup to your VPS server

set -e  # Exit on any error

# Configuration
VPS_USER="ubuntu"
VPS_HOST="141.148.50.111"
VPS_PATH="/srv"
LOCAL_PATH="."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 JewGo Backend VPS Deployment Script${NC}"
echo "================================================"

# Check if required tools are installed
check_requirements() {
    echo -e "${YELLOW}Checking requirements...${NC}"
    
    if ! command -v rsync &> /dev/null; then
        echo -e "${RED}❌ rsync is not installed. Please install it first.${NC}"
        exit 1
    fi
    
    if ! command -v ssh &> /dev/null; then
        echo -e "${RED}❌ ssh is not installed. Please install it first.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Requirements check passed${NC}"
}

# Test SSH connection
test_connection() {
    echo -e "${YELLOW}Testing SSH connection to ${VPS_HOST}...${NC}"
    
    if ssh -o ConnectTimeout=10 -o BatchMode=yes ${VPS_USER}@${VPS_HOST} exit 2>/dev/null; then
        echo -e "${GREEN}✅ SSH connection successful${NC}"
    else
        echo -e "${RED}❌ SSH connection failed. Please check:${NC}"
        echo "   - VPS IP/domain is correct"
        echo "   - SSH key is set up"
        echo "   - Firewall allows SSH connections"
        exit 1
    fi
}

# Create directory structure on VPS
setup_vps_directories() {
    echo -e "${YELLOW}Setting up directory structure on VPS...${NC}"
    
    ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
        # Create main directory with sudo
        sudo mkdir -p /srv/jewgo-backend
        sudo mkdir -p /srv/jewgo-backend/logs
        sudo mkdir -p /srv/jewgo-backend/nginx/conf.d
        sudo mkdir -p /srv/jewgo-backend/nginx/ssl
        sudo mkdir -p /srv/jewgo-backend/nginx/logs
        
        # Set proper permissions and ownership
        sudo chown -R ubuntu:ubuntu /srv/jewgo-backend
        sudo chmod -R 755 /srv/jewgo-backend
        
        echo "Directory structure created successfully"
EOF
    
    echo -e "${GREEN}✅ VPS directories created${NC}"
}

# Copy Docker files to VPS
copy_docker_files() {
    echo -e "${YELLOW}Copying Docker files to VPS...${NC}"
    
    # Copy main files to the correct path
    rsync -avz --progress \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='.venv' \
        --exclude='__pycache__' \
        --exclude='*.pyc' \
        --exclude='.pytest_cache' \
        --exclude='htmlcov' \
        --exclude='coverage.xml' \
        --exclude='.DS_Store' \
        --exclude='.claude' \
        --exclude='.gemini' \
        --exclude='.github' \
        --exclude='.husky' \
        --exclude='.serena' \
        --exclude='.vscode' \
        ${LOCAL_PATH}/ ${VPS_USER}@${VPS_HOST}:/srv/jewgo-backend/
    
    echo -e "${GREEN}✅ Docker files copied successfully${NC}"
}

# Install Docker and Docker Compose on VPS
install_docker() {
    echo -e "${YELLOW}Installing Docker and Docker Compose on VPS...${NC}"
    
    ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
        # Update package list
        sudo apt-get update
        
        # Install required packages
        sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
        
        # Add Docker's official GPG key
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        
        # Add Docker repository
        echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        # Install Docker
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io
        
        # Install Docker Compose
        sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        
        # Start and enable Docker
        sudo systemctl start docker
        sudo systemctl enable docker
        
        # Add ubuntu user to docker group
        sudo usermod -aG docker ubuntu
        
        echo "Docker and Docker Compose installed successfully"
EOF
    
    echo -e "${GREEN}✅ Docker installation completed${NC}"
}

# Setup environment file
setup_environment() {
    echo -e "${YELLOW}Setting up environment configuration...${NC}"
    
    if [ -f "env.production.template" ]; then
        echo -e "${BLUE}📝 Please copy env.production.template to .env and configure it:${NC}"
        echo "   ssh ${VPS_USER}@${VPS_HOST}"
        echo "   cd /srv/jewgo-backend"
        echo "   cp env.production.template .env"
        echo "   nano .env"
        echo ""
        echo -e "${YELLOW}⚠️  IMPORTANT: Update the .env file with your actual values before starting!${NC}"
    else
        echo -e "${RED}❌ env.production.template not found${NC}"
    fi
}

# Start services
start_services() {
    echo -e "${YELLOW}Starting Docker services...${NC}"
    
    ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
        cd /srv/jewgo-backend
        
        # Pull latest images
        docker-compose pull
        
        # Start services
        docker-compose up -d
        
        # Show status
        docker-compose ps
        
        echo "Services started successfully"
EOF
    
    echo -e "${GREEN}✅ Services started${NC}"
}

# Show deployment status
show_status() {
    echo -e "${YELLOW}Checking deployment status...${NC}"
    
    ssh ${VPS_USER}@${VPS_HOST} << 'EOF'
        cd /srv/jewgo-backend
        
        echo "=== Docker Services Status ==="
        docker-compose ps
        
        echo ""
        echo "=== Service Logs ==="
        docker-compose logs --tail=20 backend
        
        echo ""
        echo "=== Health Check ==="
        curl -s http://localhost/api/health || echo "Health check failed"
EOF
    
    echo -e "${GREEN}✅ Deployment status checked${NC}"
}

# Main deployment flow
main() {
    echo -e "${BLUE}Starting deployment process...${NC}"
    
    check_requirements
    test_connection
    setup_vps_directories
    copy_docker_files
    install_docker
    setup_environment
    
    echo ""
    echo -e "${GREEN}🎉 Deployment preparation completed!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. SSH to your VPS: ssh ${VPS_USER}@${VPS_HOST}"
    echo "2. Navigate to: cd /srv/jewgo-backend"
    echo "3. Configure environment: cp env.production.template .env && nano .env"
    echo "4. Start services: docker-compose up -d"
    echo "5. Check status: docker-compose ps"
    echo ""
    echo -e "${BLUE}Would you like to proceed with starting the services now? (y/n)${NC}"
    read -r response
    
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        start_services
        show_status
    else
        echo -e "${YELLOW}Services not started. You can start them manually later.${NC}"
    fi
}

# Run main function
main
