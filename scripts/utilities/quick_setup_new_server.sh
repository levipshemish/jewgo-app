#!/bin/bash

# Quick Setup Script for New JewGo Server
# Run this after establishing SSH connection to 150.136.63.50

set -e

echo "🚀 Quick Setup for New JewGo Server"
echo "===================================="

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install dependencies
echo "🔧 Installing system dependencies..."
sudo apt install -y docker.io docker-compose git curl wget htop postgresql postgresql-contrib redis-server nginx python3 python3-pip python3-venv certbot python3-certbot-nginx

# Setup Docker
echo "🐳 Setting up Docker..."
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

# Setup PostgreSQL
echo "🐘 Setting up PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo -u postgres createdb jewgo_db 2>/dev/null || echo "Database already exists"
sudo -u postgres createuser jewgo_user 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "ALTER USER jewgo_user PASSWORD 'jewgo_password_2024';" 2>/dev/null || echo "Password already set"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE jewgo_db TO jewgo_user;" 2>/dev/null || echo "Privileges already granted"

# Setup Redis
echo "🔴 Setting up Redis..."
sudo systemctl start redis-server
sudo systemctl enable redis-server
sudo sed -i 's/# requirepass foobared/requirepass jewgo_redis_prod_2024/' /etc/redis/redis.conf
sudo systemctl restart redis-server

# Clone repository
echo "📥 Cloning repository..."
cd /home/ubuntu
if [ ! -d "jewgo-app" ]; then
    git clone https://github.com/mml555/jewgo-app.git
fi
cd jewgo-app

# Create environment file
echo "⚙️ Creating environment configuration..."
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://jewgo_user:jewgo_password_2024@localhost:5432/jewgo_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jewgo_db
DB_USER=jewgo_user
DB_PASSWORD=jewgo_password_2024

# Redis Configuration
REDIS_URL=redis://:jewgo_redis_prod_2024@localhost:6379/0
CACHE_REDIS_URL=redis://:jewgo_redis_prod_2024@localhost:6379/1
RATE_LIMIT_STORAGE_URL=redis://:jewgo_redis_prod_2024@localhost:6379/2

# Application Configuration
FLASK_ENV=production
SECRET_KEY=jewgo_secret_key_2024_production
CORS_ORIGINS=https://jewgo.app,https://www.jewgo.app,https://api.jewgo.app

# Performance Settings
RATE_LIMIT_ENABLED=true
CACHE_ENABLED=true
CDN_ENABLED=true

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true

# SSL Configuration
SSL_CERT_PATH=/etc/letsencrypt/live/api.jewgo.app/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/api.jewgo.app/privkey.pem
EOF

# Setup Python environment
echo "🐍 Setting up Python environment..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Initialize database
echo "🗄️ Initializing database..."
python init_db.py

# Import restaurant data
echo "🍽️ Importing restaurant data..."
cd /home/ubuntu
cat > import_restaurants.py << 'EOF'
#!/usr/bin/env python3
import json
import psycopg2
import sys
import os
from datetime import datetime

# Database connection
conn = psycopg2.connect(
    host="localhost",
    database="jewgo_db",
    user="jewgo_user",
    password="jewgo_password_2024"
)
cur = conn.cursor()

def import_restaurants():
    """Import restaurant data from backup"""
    try:
        with open('/home/ubuntu/jewgo-app/server_backup_20250908_030822/restaurants.json', 'r') as f:
            data = json.load(f)
        
        if 'items' in data:
            for restaurant in data['items']:
                # Insert restaurant data
                cur.execute("""
                    INSERT INTO restaurants (
                        id, name, address, city, state, zip_code, 
                        latitude, longitude, phone_number, website,
                        kosher_category, certifying_agency, price_range,
                        google_rating, google_review_count, image_url,
                        status, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        address = EXCLUDED.address,
                        city = EXCLUDED.city,
                        state = EXCLUDED.state,
                        zip_code = EXCLUDED.zip_code,
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude,
                        phone_number = EXCLUDED.phone_number,
                        website = EXCLUDED.website,
                        kosher_category = EXCLUDED.kosher_category,
                        certifying_agency = EXCLUDED.certifying_agency,
                        price_range = EXCLUDED.price_range,
                        google_rating = EXCLUDED.google_rating,
                        google_review_count = EXCLUDED.google_review_count,
                        image_url = EXCLUDED.image_url,
                        status = EXCLUDED.status,
                        updated_at = EXCLUDED.updated_at
                """, (
                    restaurant.get('id'),
                    restaurant.get('name'),
                    restaurant.get('address'),
                    restaurant.get('city'),
                    restaurant.get('state'),
                    restaurant.get('zip_code'),
                    restaurant.get('latitude'),
                    restaurant.get('longitude'),
                    restaurant.get('phone_number'),
                    restaurant.get('website'),
                    restaurant.get('kosher_category'),
                    restaurant.get('certifying_agency'),
                    restaurant.get('price_range'),
                    restaurant.get('google_rating'),
                    restaurant.get('google_review_count'),
                    restaurant.get('image_url'),
                    restaurant.get('status'),
                    restaurant.get('created_at'),
                    restaurant.get('updated_at')
                ))
        
        conn.commit()
        print(f"✅ Imported {len(data.get('items', []))} restaurants")
        
    except Exception as e:
        print(f"❌ Error importing restaurants: {e}")
        conn.rollback()

if __name__ == "__main__":
    print("🔄 Starting restaurant data import...")
    import_restaurants()
    conn.close()
    print("✅ Restaurant data import completed!")
EOF

python3 import_restaurants.py

# Setup SSL certificates
echo "🔒 Setting up SSL certificates..."
sudo certbot --nginx -d api.jewgo.app --non-interactive --agree-tos --email admin@jewgo.app

# Configure Nginx
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/jewgo << 'EOF'
server {
    listen 80;
    server_name api.jewgo.app 150.136.63.50;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.jewgo.app 150.136.63.50;

    ssl_certificate /etc/letsencrypt/live/api.jewgo.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.jewgo.app/privkey.pem;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "no-referrer-when-downgrade";

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://localhost:5000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/jewgo /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Setup firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3001  # Grafana
sudo ufw allow 9090  # Prometheus
sudo ufw --force enable

# Start the application
echo "🚀 Starting the application..."
cd /home/ubuntu/jewgo-app/backend
source venv/bin/activate
nohup python app.py > /home/ubuntu/app.log 2>&1 &

# Test the setup
echo "🧪 Testing the setup..."
sleep 5
curl -s https://api.jewgo.app/health || echo "Health check failed - may need to wait for DNS propagation"

echo ""
echo "🎉 Setup completed!"
echo "=================="
echo "📊 Check restaurant count:"
psql -h localhost -U jewgo_user -d jewgo_db -c "SELECT COUNT(*) FROM restaurants;"
echo ""
echo "🌐 API should be accessible at: https://api.jewgo.app"
echo "📈 Health check: https://api.jewgo.app/health"
echo "🍽️ Restaurants: https://api.jewgo.app/api/restaurants"
echo ""
echo "📋 Next steps:"
echo "1. Wait for DNS propagation (may take a few minutes)"
echo "2. Test all endpoints"
echo "3. Set up monitoring if needed: cd /home/ubuntu/jewgo-app && docker-compose -f docker-compose.webhook.yml up -d"
echo ""
echo "✅ New JewGo server is ready!"
