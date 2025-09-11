#!/bin/bash

# New Server Setup Script for Jewgo App
# Run this script on the new server: 157.151.254.18

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_status "Starting new server setup for Jewgo App..."

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
print_status "Installing Docker..."
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add ubuntu user to docker group
print_status "Adding ubuntu user to docker group..."
sudo usermod -aG docker ubuntu

# Install Docker Compose (standalone)
print_status "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install PostgreSQL and PostGIS
print_status "Installing PostgreSQL with PostGIS..."
sudo apt install -y postgresql postgresql-contrib postgis postgresql-15-postgis-3

# Install Redis
print_status "Installing Redis..."
sudo apt install -y redis-server

# Install Nginx
print_status "Installing Nginx..."
sudo apt install -y nginx

# Install additional tools
print_status "Installing additional tools..."
sudo apt install -y git curl wget unzip htop

# Create application directory
print_status "Creating application directory..."
mkdir -p /home/ubuntu/jewgo-app
cd /home/ubuntu/jewgo-app

# Clone the repository (you'll need to do this manually or provide access)
print_status "Repository setup..."
print_warning "You need to clone the repository or upload the code to /home/ubuntu/jewgo-app"
print_warning "Use: git clone <your-repo-url> ."

# Configure PostgreSQL
print_status "Configuring PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE USER app_user WITH PASSWORD 'Jewgo123';
CREATE DATABASE app_db OWNER app_user;
GRANT ALL PRIVILEGES ON DATABASE app_db TO app_user;
\c app_db
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
GRANT ALL ON SCHEMA public TO app_user;
EOF

# Configure Redis
print_status "Configuring Redis..."
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Configure Nginx
print_status "Configuring Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Create SSL directory
print_status "Creating SSL directory..."
sudo mkdir -p /etc/nginx/ssl

# Install Certbot for SSL certificates
print_status "Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Create environment file
print_status "Creating environment configuration..."
cat > /home/ubuntu/jewgo-app/.env << 'EOF'
# Production Environment Configuration for New Server

# --- Database Configuration ---
POSTGRES_DB=app_db
POSTGRES_USER=app_user
POSTGRES_PASSWORD=Jewgo123
DATABASE_URL=postgresql://app_user:Jewgo123@localhost:5432/app_db

# --- Redis Configuration ---
REDIS_PASSWORD=
REDIS_URL=redis://localhost:6379

# --- Application Configuration ---
NODE_ENV=production
FLASK_ENV=production
SECRET_KEY=prod-secret-key-change-in-production-2025
JWT_SECRET_KEY=prod-jwt-secret-key-change-in-production-2025

# --- CORS Configuration ---
CORS_ORIGINS=https://jewgo.app,https://www.jewgo.app,https://api.jewgo.app,http://localhost:3000,http://127.0.0.1:3000

# --- Google Maps API ---
GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY}
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=${NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID}

# --- Email Configuration ---
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=${SMTP_USER}
SMTP_PASSWORD=${SMTP_PASSWORD}
FROM_EMAIL=${FROM_EMAIL}

# --- GitHub Webhook Configuration ---
GITHUB_WEBHOOK_SECRET=dsljkgsadfhkahbdskdhbasksdbhf89346945hbvnklxv09bq47u9043yFDGGGHWYSGQBW

# --- Monitoring and Error Tracking ---
SENTRY_DSN=https://48a8a5542011706348cddd01c6dc685a@o4509798929858560.ingest.us.sentry.io/4509798933004288

# --- AWS S3 Backup Configuration ---
AWS_REGION=us-east-1
S3_BACKUP_BUCKET=jewgo-backups1

# --- Development/Testing ---
DEBUG=false
TESTING=false

# --- V5 API Configuration ---
CURSOR_HMAC_SECRET_V5=prod-cursor-hmac-secret-change-in-production-2025
EOF

# Create basic Nginx configuration
print_status "Creating Nginx configuration..."
sudo tee /etc/nginx/sites-available/jewgo-app << 'EOF'
server {
    listen 80;
    server_name 157.151.254.18;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/jewgo-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Create backup directory
print_status "Creating backup directory..."
mkdir -p /home/ubuntu/backups

# Create systemd service for the application (if needed)
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/jewgo-backend.service << 'EOF'
[Unit]
Description=Jewgo Backend Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/jewgo-app
ExecStart=/usr/local/bin/docker-compose up -d backend
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Set up log rotation
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/jewgo-app << 'EOF'
/home/ubuntu/jewgo-app/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 ubuntu ubuntu
    postrotate
        docker restart jewgo-backend > /dev/null 2>&1 || true
    endscript
}
EOF

# Create monitoring script
print_status "Creating monitoring script..."
cat > /home/ubuntu/jewgo-app/monitor.sh << 'EOF'
#!/bin/bash
echo "=== System Status ==="
echo "Date: $(date)"
echo "Uptime: $(uptime)"
echo "Disk Usage:"
df -h
echo ""
echo "=== Docker Status ==="
docker ps
echo ""
echo "=== Service Status ==="
sudo systemctl status postgresql --no-pager -l
sudo systemctl status redis-server --no-pager -l
sudo systemctl status nginx --no-pager -l
echo ""
echo "=== Application Health ==="
curl -s http://localhost:5000/health || echo "Backend not responding"
EOF

chmod +x /home/ubuntu/jewgo-app/monitor.sh

# Set proper permissions
print_status "Setting permissions..."
sudo chown -R ubuntu:ubuntu /home/ubuntu/jewgo-app
chmod +x /home/ubuntu/jewgo-app/monitor.sh

print_success "Server setup completed!"
print_status "Next steps:"
echo "1. Clone or upload your application code to /home/ubuntu/jewgo-app"
echo "2. Update the .env file with your actual API keys"
echo "3. Run: cd /home/ubuntu/jewgo-app && docker-compose up -d"
echo "4. Test the deployment with: ./monitor.sh"
echo ""
print_status "Database connection:"
echo "Host: localhost:5432"
echo "Database: app_db"
echo "User: app_user"
echo "Password: Jewgo123"
echo ""
print_status "Services installed:"
echo "- Docker & Docker Compose"
echo "- PostgreSQL with PostGIS"
echo "- Redis"
echo "- Nginx"
echo "- Certbot (for SSL)"
echo ""
print_warning "Remember to:"
echo "- Set up SSL certificates with Certbot"
echo "- Configure firewall rules"
echo "- Set up automated backups"
echo "- Configure monitoring and alerts"
