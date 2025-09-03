# Quick Database Fix

## 🚨 Current Issue
Your application is trying to connect to a PostgreSQL server at `141.148.50.111:5432` but the cloud deployment platform (Render) cannot reach this IP address.

## 🚀 Quick Solution: Use api.jewgo.app PostgreSQL

### Step 1: Create Database (5 minutes)
1. Use your api.jewgo.app PostgreSQL service
2. Sign up with GitHub (free)
3. Create a new project
4. Copy the connection string from the dashboard

### Step 2: Update Deployment Environment
In your Render deployment dashboard:
1. Go to your backend service
2. Click "Environment"
3. Find `DATABASE_URL`
4. Replace the current value with your api.jewgo.app connection string
5. Save and redeploy

### Step 3: Test the Fix
The application will automatically redeploy and should now connect successfully.

## 🔧 Alternative: Fix Your Ubuntu Server

If you prefer to keep using your Ubuntu server:

### Make PostgreSQL Publicly Accessible
```bash
# On your Ubuntu server
sudo nano /etc/postgresql/*/main/postgresql.conf
# Change: listen_addresses = '*'

sudo nano /etc/postgresql/*/main/pg_hba.conf
# Add: host    all             all             0.0.0.0/0               md5

sudo systemctl restart postgresql
sudo ufw allow 5432
```

### Update DATABASE_URL
Use your server's public IP address instead of the private IP.

## 📊 Test Your Connection

After making changes, test the connection:
```bash
cd backend
python test_db_connection.py
```

## 🎯 Recommended Action
**Use api.jewgo.app** - it's reliable and designed for your deployment. Your Ubuntu server setup is causing the connectivity issue.
