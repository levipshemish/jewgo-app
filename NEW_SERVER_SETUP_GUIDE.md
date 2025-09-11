# New Server Setup Guide - 157.151.254.18

This guide will help you set up the Jewgo App backend and restore the database on your new server.

## 🚀 Quick Start

### Step 1: Connect to the Server

First, you need to connect to your new server. There seems to be a permission issue with the SSH key, so let's try these approaches:

#### Option A: Fix SSH Key Permissions
```bash
# On your local machine
chmod 600 /Users/mendell/Downloads/ssh-key-2025-09-11.key
ssh -i /Users/mendell/Downloads/ssh-key-2025-09-11.key ubuntu@157.151.254.18
```

#### Option B: Copy Key to SSH Directory
```bash
# On your local machine
cp /Users/mendell/Downloads/ssh-key-2025-09-11.key ~/.ssh/jewgo-server-key
chmod 600 ~/.ssh/jewgo-server-key
ssh -i ~/.ssh/jewgo-server-key ubuntu@157.151.254.18
```

#### Option C: Use SSH Agent
```bash
# On your local machine
ssh-add /Users/mendell/Downloads/ssh-key-2025-09-11.key
ssh ubuntu@157.151.254.18
```

### Step 2: Run the Server Setup Script

Once connected to the server, run the setup script:

```bash
# Download and run the setup script
wget https://raw.githubusercontent.com/your-repo/jewgo-app/main/scripts/server-setup-new.sh
chmod +x server-setup-new.sh
./server-setup-new.sh
```

Or if you have the code locally, upload it:

```bash
# From your local machine (in a new terminal)
scp -i /Users/mendell/Downloads/ssh-key-2025-09-11.key scripts/server-setup-new.sh ubuntu@157.151.254.18:~/
```

Then on the server:
```bash
chmod +x server-setup-new.sh
./server-setup-new.sh
```

### Step 3: Upload Your Application Code

You need to get your application code onto the server. Choose one of these methods:

#### Option A: Git Clone (if repository is public)
```bash
cd /home/ubuntu/jewgo-app
git clone https://github.com/your-username/jewgo-app.git .
```

#### Option B: Upload via SCP
```bash
# From your local machine (compress first)
tar -czf jewgo-app.tar.gz --exclude='node_modules' --exclude='.git' --exclude='venv' .
scp -i /Users/mendell/Downloads/ssh-key-2025-09-11.key jewgo-app.tar.gz ubuntu@157.151.254.18:~/

# On the server
cd /home/ubuntu/jewgo-app
tar -xzf ~/jewgo-app.tar.gz
```

#### Option C: Use rsync
```bash
# From your local machine
rsync -avz --exclude='node_modules' --exclude='.git' --exclude='venv' -e "ssh -i /Users/mendell/Downloads/ssh-key-2025-09-11.key" . ubuntu@157.151.254.18:/home/ubuntu/jewgo-app/
```

### Step 4: Configure Environment Variables

Edit the environment file on the server:

```bash
nano /home/ubuntu/jewgo-app/.env
```

Update these variables with your actual values:
- `GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `FROM_EMAIL`
- `AWS_ACCESS_KEY_ID` (if using S3)
- `AWS_SECRET_ACCESS_KEY` (if using S3)

### Step 5: Restore the Database

Run the database restore script:

```bash
cd /home/ubuntu/jewgo-app
chmod +x scripts/restore-database.sh
./scripts/restore-database.sh
```

Choose option 3 to create a fresh database with schema, or option 1/2 if you have backup files.

### Step 6: Deploy the Application

```bash
cd /home/ubuntu/jewgo-app
docker-compose up -d
```

### Step 7: Configure SSL (Optional but Recommended)

```bash
# Install SSL certificate
sudo certbot --nginx -d your-domain.com

# Or for IP-based access, you can skip SSL for now
```

### Step 8: Test the Deployment

```bash
# Check all services
./monitor.sh

# Test the API
curl http://localhost:5000/health
curl http://localhost:5000/api/v5/health
```

## 🔧 Manual Setup (Alternative)

If the automated script doesn't work, here's the manual setup process:

### 1. Install Docker
```bash
sudo apt update
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker ubuntu
```

### 2. Install PostgreSQL with PostGIS
```bash
sudo apt install -y postgresql postgresql-contrib postgis postgresql-15-postgis-3
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3. Create Database
```bash
sudo -u postgres psql << EOF
CREATE USER app_user WITH PASSWORD 'Jewgo123';
CREATE DATABASE app_db OWNER app_user;
GRANT ALL PRIVILEGES ON DATABASE app_db TO app_user;
\c app_db
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
GRANT ALL ON SCHEMA public TO app_user;
EOF
```

### 4. Install Redis
```bash
sudo apt install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 5. Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 🗄️ Database Restoration Options

### Option 1: Fresh Database with Schema
```bash
./scripts/restore-database.sh
# Choose option 3
```

### Option 2: Restore from Backup
If you have a database backup file:
```bash
./scripts/restore-database.sh
# Choose option 1 for SQL file or option 2 for dump file
```

### Option 3: Manual Database Setup
```bash
# Connect to database
PGPASSWORD=Jewgo123 psql -h localhost -U app_user -d app_db

# Run your schema creation scripts
\i /path/to/your/schema.sql
```

## 🔍 Troubleshooting

### SSH Connection Issues
```bash
# Check key permissions
ls -la /Users/mendell/Downloads/ssh-key-2025-09-11.key

# Try different SSH options
ssh -v -i /Users/mendell/Downloads/ssh-key-2025-09-11.key ubuntu@157.151.254.18
```

### Docker Issues
```bash
# Check Docker status
sudo systemctl status docker
docker --version
docker-compose --version

# Check if user is in docker group
groups ubuntu
```

### Database Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
PGPASSWORD=Jewgo123 psql -h localhost -U app_user -d app_db -c "SELECT 1;"

# Check PostGIS
PGPASSWORD=Jewgo123 psql -h localhost -U app_user -d app_db -c "SELECT PostGIS_version();"
```

### Application Issues
```bash
# Check container logs
docker logs jewgo-backend
docker logs jewgo-postgres
docker logs jewgo-redis

# Check application status
curl http://localhost:5000/health
curl http://localhost:5000/api/v5/health
```

## 📊 Monitoring

### Check System Status
```bash
./monitor.sh
```

### Check Service Logs
```bash
# Docker logs
docker logs jewgo-backend --tail 50 -f
docker logs jewgo-postgres --tail 50 -f

# System logs
sudo journalctl -u postgresql -f
sudo journalctl -u redis-server -f
sudo journalctl -u nginx -f
```

## 🔄 Updates and Maintenance

### Update Application
```bash
cd /home/ubuntu/jewgo-app
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Backup Database
```bash
PGPASSWORD=Jewgo123 pg_dump -h localhost -U app_user app_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restart Services
```bash
docker-compose restart
sudo systemctl restart postgresql redis-server nginx
```

## 📞 Support

If you encounter issues:

1. Check the logs: `./monitor.sh`
2. Verify all services are running: `docker ps`
3. Test database connection: `PGPASSWORD=Jewgo123 psql -h localhost -U app_user -d app_db -c "SELECT 1;"`
4. Test API endpoints: `curl http://localhost:5000/health`

## 🎯 Final Checklist

- [ ] Server setup script completed successfully
- [ ] Application code uploaded to `/home/ubuntu/jewgo-app`
- [ ] Environment variables configured
- [ ] Database restored and PostGIS enabled
- [ ] Docker containers running (`docker ps`)
- [ ] API health check passing (`curl http://localhost:5000/health`)
- [ ] Nginx configured and running
- [ ] SSL certificate installed (optional)
- [ ] Monitoring script working (`./monitor.sh`)

Once all items are checked, your Jewgo App backend should be fully operational on the new server!
