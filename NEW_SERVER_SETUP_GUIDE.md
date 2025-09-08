# New Server Setup Guide - 150.136.63.50

## 🚀 Step-by-Step Setup Instructions

### Step 1: Initial SSH Connection
```bash
# Connect to the new server (you may need to accept the host key)
ssh ubuntu@150.136.63.50

# If you get host key verification error, add the key:
ssh-keyscan -H 150.136.63.50 >> ~/.ssh/known_hosts
ssh ubuntu@150.136.63.50
```

### Step 2: Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git curl wget htop
```

### Step 3: Setup Docker
```bash
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
# Log out and back in for group changes to take effect
exit
ssh ubuntu@150.136.63.50
```

### Step 4: Install System Dependencies
```bash
sudo apt install -y postgresql postgresql-contrib redis-server nginx python3 python3-pip python3-venv
```

### Step 5: Setup PostgreSQL
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres createdb jewgo_db
sudo -u postgres createuser jewgo_user
sudo -u postgres psql -c "ALTER USER jewgo_user PASSWORD 'jewgo_password_2024';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE jewgo_db TO jewgo_user;"

# Test connection
psql -h localhost -U jewgo_user -d jewgo_db -c "SELECT version();"
```

### Step 6: Setup Redis
```bash
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Configure Redis with password
sudo sed -i 's/# requirepass foobared/requirepass jewgo_redis_prod_2024/' /etc/redis/redis.conf
sudo systemctl restart redis-server

# Test Redis connection
redis-cli -a jewgo_redis_prod_2024 ping
```

### Step 7: Clone Repository
```bash
cd /home/ubuntu
git clone https://github.com/mml555/jewgo-app.git
cd jewgo-app
```

### Step 8: Setup Environment Variables
```bash
# Create .env file
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

# SSL Configuration (will be set up later)
SSL_CERT_PATH=/etc/letsencrypt/live/api.jewgo.app/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/api.jewgo.app/privkey.pem
EOF
```

### Step 9: Install Python Dependencies
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 10: Initialize Database
```bash
# Make sure you're in the backend directory with venv activated
source venv/bin/activate
python init_db.py
```

### Step 11: Import Restaurant Data
```bash
# Create data import script
cat > /home/ubuntu/import_restaurants.py << 'EOF'
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

# Run the import script
cd /home/ubuntu
python3 import_restaurants.py
```

### Step 12: Setup SSL Certificates
```bash
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.jewgo.app --non-interactive --agree-tos --email admin@jewgo.app
```

### Step 13: Configure Nginx
```bash
# Create Nginx configuration
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

# Enable the site
sudo ln -s /etc/nginx/sites-available/jewgo /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Step 14: Start the Application
```bash
cd /home/ubuntu/jewgo-app/backend
source venv/bin/activate

# Start the Flask application
python app.py &
```

### Step 15: Setup Monitoring (Optional)
```bash
cd /home/ubuntu/jewgo-app
docker-compose -f docker-compose.webhook.yml up -d
```

### Step 16: Configure Firewall
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3001  # Grafana
sudo ufw allow 9090  # Prometheus
sudo ufw --force enable
```

### Step 17: Test the Setup
```bash
# Test health endpoint
curl https://api.jewgo.app/health

# Test restaurants endpoint
curl https://api.jewgo.app/api/restaurants

# Check if data was imported
psql -h localhost -U jewgo_user -d jewgo_db -c "SELECT COUNT(*) FROM restaurants;"
```

## 🎯 Expected Results

After completing these steps, you should have:

- ✅ **API accessible** at https://api.jewgo.app
- ✅ **30 restaurant records** imported from backup
- ✅ **SSL certificates** configured
- ✅ **PostgreSQL database** with proper user permissions
- ✅ **Redis caching** with authentication
- ✅ **Nginx reverse proxy** with SSL termination
- ✅ **Monitoring stack** (if Step 15 was completed)

## 🚨 Troubleshooting

If you encounter issues:

1. **Check logs**: `sudo journalctl -u nginx -f`
2. **Test database**: `psql -h localhost -U jewgo_user -d jewgo_db`
3. **Test Redis**: `redis-cli -a jewgo_redis_prod_2024 ping`
4. **Check application**: `ps aux | grep python`

## 📞 Next Steps

1. Verify all endpoints work
2. Update DNS to point to new server
3. Test external access
4. Set up automated backups
5. Configure monitoring alerts
