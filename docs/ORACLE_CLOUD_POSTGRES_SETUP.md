# Oracle Cloud PostgreSQL Setup Guide

## 🚀 **Overview**

This guide helps you set up PostgreSQL on your Oracle Cloud server (`141.148.50.111`) and configure it to accept connections from your Render deployment.

## 📋 **Prerequisites**

- Oracle Cloud server running Ubuntu
- PostgreSQL installed on the server
- Access to server via SSH
- Render deployment platform

## 🔧 **Step 1: Configure PostgreSQL for Remote Access**

### 1.1 Update PostgreSQL Configuration

SSH into your Oracle Cloud server and run:

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/*/main/postgresql.conf

# Find and change this line:
listen_addresses = '*'

# Save and exit (Ctrl+X, Y, Enter)
```

### 1.2 Configure Client Authentication

```bash
# Edit client authentication
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Add these lines at the end:
host    app_db      app_user      0.0.0.0/0               md5
host    all         all           0.0.0.0/0               md5

# Save and exit
```

### 1.3 Restart PostgreSQL

```bash
sudo systemctl restart postgresql
sudo systemctl status postgresql
```

## 🔥 **Step 2: Configure Firewall**

### 2.1 Allow PostgreSQL Port

```bash
# Allow PostgreSQL port through firewall
sudo ufw allow 5432/tcp
sudo ufw status
```

### 2.2 Oracle Cloud Security Lists

In your Oracle Cloud Console:
1. Go to Networking → Virtual Cloud Networks
2. Select your VCN
3. Click on Security Lists
4. Add an Ingress Rule:
   - Source: `0.0.0.0/0`
   - Port: `5432`
   - Protocol: `TCP`

## 🌐 **Step 3: Test Local Connection**

On your Oracle Cloud server:

```bash
# Test connection locally
psql -h localhost -U app_user -d app_db
# Enter password: Jewgo123

# Test from server's public IP
psql -h 141.148.50.111 -U app_user -d app_db
# Enter password: Jewgo123
```

## 🔗 **Step 4: Test External Connection**

From your local machine or any external location:

```bash
# Test connection from external location
psql -h 141.148.50.111 -U app_user -d app_db
# Enter password: Jewgo123
```

## 📊 **Step 5: Verify Database Setup**

```sql
-- Connect to database and run:
\l                    -- List databases
\dt                   -- List tables
SELECT version();     -- Check PostgreSQL version
```

## 🚨 **Troubleshooting**

### Connection Refused
- Check if PostgreSQL is running: `sudo systemctl status postgresql`
- Verify firewall settings: `sudo ufw status`
- Check Oracle Cloud security lists

### Authentication Failed
- Verify user exists: `\du` in psql
- Check pg_hba.conf configuration
- Ensure password is correct

### Network Issues
- Test with telnet: `telnet 141.148.50.111 5432`
- Check Oracle Cloud security lists
- Verify server is accessible from internet

## 🔒 **Security Considerations**

- Use strong passwords
- Consider using SSL connections
- Limit access to specific IP ranges if possible
- Regularly update PostgreSQL
- Monitor access logs

## 📝 **Next Steps**

Once the server is configured:
1. Test the connection from Render's environment
2. Update your DATABASE_URL in Render
3. Migrate data from Neon
4. Monitor application logs
