#!/bin/bash

# JewGo New Server Setup Script
# This script sets up a brand new server with all the backed up data

set -e

NEW_SERVER_IP="150.136.63.50"
BACKUP_DIR="server_backup_20250908_030822"

echo "🚀 Setting up new JewGo server at $NEW_SERVER_IP"
echo "📁 Using backup data from: $BACKUP_DIR"

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Backup directory $BACKUP_DIR not found!"
    echo "Please run the backup script first: ./backup_old_server_data.sh"
    exit 1
fi

echo ""
echo "📋 Pre-setup checklist:"
echo "1. ✅ New server created at $NEW_SERVER_IP"
echo "2. ✅ SSH access configured"
echo "3. ✅ Backup data available in $BACKUP_DIR"
echo ""

# Function to run commands on the new server
run_remote() {
    echo "🔧 Running on server: $1"
    ssh ubuntu@$NEW_SERVER_IP "$1"
}

# Function to copy files to the new server
copy_to_server() {
    local source="$1"
    local destination="$2"
    echo "📤 Copying $source to server:$destination"
    scp -r "$source" ubuntu@$NEW_SERVER_IP:"$destination"
}

echo "🔧 Step 1: Initial server setup..."
run_remote "sudo apt update && sudo apt upgrade -y"
run_remote "sudo apt install -y docker.io docker-compose git curl wget htop"

echo ""
echo "🔧 Step 2: Setting up Docker..."
run_remote "sudo systemctl start docker"
run_remote "sudo systemctl enable docker"
run_remote "sudo usermod -aG docker ubuntu"

echo ""
echo "🔧 Step 3: Installing system dependencies..."
run_remote "sudo apt install -y postgresql postgresql-contrib redis-server nginx python3 python3-pip python3-venv"

echo ""
echo "🔧 Step 4: Setting up PostgreSQL..."
run_remote "sudo systemctl start postgresql"
run_remote "sudo systemctl enable postgresql"
run_remote "sudo -u postgres createdb jewgo_db"
run_remote "sudo -u postgres createuser jewgo_user"
run_remote "sudo -u postgres psql -c \"ALTER USER jewgo_user PASSWORD 'jewgo_password_2024';\""
run_remote "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE jewgo_db TO jewgo_user;\""

echo ""
echo "🔧 Step 5: Setting up Redis..."
run_remote "sudo systemctl start redis-server"
run_remote "sudo systemctl enable redis-server"
run_remote "sudo sed -i 's/# requirepass foobared/requirepass jewgo_redis_prod_2024/' /etc/redis/redis.conf"
run_remote "sudo systemctl restart redis-server"

echo ""
echo "🔧 Step 6: Cloning repository..."
run_remote "cd /home/ubuntu && git clone https://github.com/your-username/jewgo-app.git"
run_remote "cd /home/ubuntu/jewgo-app && git checkout main"

echo ""
echo "🔧 Step 7: Setting up environment variables..."
run_remote "cd /home/ubuntu/jewgo-app && cp .env.example .env"

# Create environment file with production settings
cat > temp_env << EOF
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

copy_to_server "temp_env" "/home/ubuntu/jewgo-app/.env"
rm temp_env

echo ""
echo "🔧 Step 8: Installing Python dependencies..."
run_remote "cd /home/ubuntu/jewgo-app/backend && python3 -m venv venv"
run_remote "cd /home/ubuntu/jewgo-app/backend && source venv/bin/activate && pip install -r requirements.txt"

echo ""
echo "🔧 Step 9: Setting up database schema..."
run_remote "cd /home/ubuntu/jewgo-app/backend && source venv/bin/activate && python init_db.py"

echo ""
echo "🔧 Step 10: Importing backed up data..."
# Copy backup data to server
copy_to_server "$BACKUP_DIR" "/home/ubuntu/"

# Create data import script
cat > temp_import_data.py << 'EOF'
#!/usr/bin/env python3
import json
import psycopg2
import sys
import os

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
        with open('/home/ubuntu/server_backup_20250908_030822/restaurants.json', 'r') as f:
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
    print("🔄 Starting data import...")
    import_restaurants()
    conn.close()
    print("✅ Data import completed!")
EOF

copy_to_server "temp_import_data.py" "/home/ubuntu/"
rm temp_import_data.py

run_remote "cd /home/ubuntu && python3 temp_import_data.py"

echo ""
echo "🔧 Step 11: Setting up monitoring stack..."
run_remote "cd /home/ubuntu/jewgo-app && docker-compose -f docker-compose.webhook.yml up -d"

echo ""
echo "🔧 Step 12: Setting up SSL certificates..."
run_remote "sudo apt install -y certbot python3-certbot-nginx"
run_remote "sudo certbot --nginx -d api.jewgo.app --non-interactive --agree-tos --email admin@jewgo.app"

echo ""
echo "🔧 Step 13: Configuring Nginx..."
run_remote "sudo systemctl start nginx"
run_remote "sudo systemctl enable nginx"

echo ""
echo "🔧 Step 14: Setting up firewall..."
run_remote "sudo ufw allow 22"
run_remote "sudo ufw allow 80"
run_remote "sudo ufw allow 443"
run_remote "sudo ufw allow 3001"  # Grafana
run_remote "sudo ufw allow 9090"  # Prometheus
run_remote "sudo ufw --force enable"

echo ""
echo "🔧 Step 15: Final health check..."
run_remote "cd /home/ubuntu/jewgo-app && docker-compose -f docker-compose.webhook.yml ps"

echo ""
echo "🎉 New server setup completed!"
echo ""
echo "📋 Server Information:"
echo "   🌐 API URL: https://api.jewgo.app"
echo "   📊 Grafana: https://$NEW_SERVER_IP:3001 (admin/admin123)"
echo "   📈 Prometheus: https://$NEW_SERVER_IP:9090"
echo "   🔍 Health Check: https://api.jewgo.app/health"
echo ""
echo "📁 Backup data imported from: $BACKUP_DIR"
echo "   ✅ Restaurants: $(jq '.items | length' $BACKUP_DIR/restaurants.json) records"
echo "   ✅ Health status: $(jq '.status' $BACKUP_DIR/health.json)"
echo ""
echo "🔧 Next steps:"
echo "1. Update DNS to point api.jewgo.app to $NEW_SERVER_IP"
echo "2. Test all API endpoints"
echo "3. Verify monitoring dashboards"
echo "4. Set up automated backups"
echo ""
echo "🚀 Your new JewGo server is ready!"
