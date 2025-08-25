# Oracle Cloud PostgreSQL Setup Checklist

## 🚨 **Current Issue**
Your Oracle Cloud server at `141.148.50.111` is not accessible from external locations, including Render's deployment environment.

## ✅ **Setup Checklist**

### **Step 1: SSH into Your Oracle Cloud Server**
```bash
ssh ubuntu@141.148.50.111
# or your specific username and SSH key
```

### **Step 2: Verify PostgreSQL Installation**
```bash
# Check if PostgreSQL is installed
sudo systemctl status postgresql

# If not installed, install it:
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### **Step 3: Configure PostgreSQL for Remote Access**

#### 3.1 Edit PostgreSQL Configuration
```bash
# Find PostgreSQL version and edit config
sudo find /etc/postgresql -name "postgresql.conf" -type f
# Example: sudo nano /etc/postgresql/14/main/postgresql.conf

# Find and change this line:
# listen_addresses = 'localhost'
# TO:
listen_addresses = '*'
```

#### 3.2 Configure Client Authentication
```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Add these lines at the end:
host    app_db      app_user      0.0.0.0/0               md5
host    all         all           0.0.0.0/0               md5
```

#### 3.3 Restart PostgreSQL
```bash
sudo systemctl restart postgresql
sudo systemctl status postgresql
```

### **Step 4: Configure Firewall**

#### 4.1 Allow PostgreSQL Port
```bash
# Allow PostgreSQL port
sudo ufw allow 5432/tcp
sudo ufw status
```

#### 4.2 Check if UFW is enabled
```bash
sudo ufw status
# If it shows "Status: inactive", you may need to enable it:
# sudo ufw enable
```

### **Step 5: Oracle Cloud Console Configuration**

#### 5.1 Configure Security Lists
1. Log into Oracle Cloud Console
2. Go to **Networking** → **Virtual Cloud Networks**
3. Select your VCN
4. Click on **Security Lists**
5. Click on your security list
6. Click **Add Ingress Rules**
7. Add rule:
   - **Source**: `0.0.0.0/0`
   - **Port**: `5432`
   - **Protocol**: `TCP`
   - **Description**: `PostgreSQL`

#### 5.2 Verify Network Security Groups (if used)
1. Go to **Networking** → **Network Security Groups**
2. Check if your instance has NSGs attached
3. Add ingress rule for port 5432 if needed

### **Step 6: Test Local Connection**

On your Oracle Cloud server:
```bash
# Test local connection
psql -h localhost -U app_user -d app_db
# Enter password: Jewgo123

# Test from server's public IP
psql -h 141.148.50.111 -U app_user -d app_db
# Enter password: Jewgo123
```

### **Step 7: Test External Connection**

From your local machine:
```bash
# Test with telnet
telnet 141.148.50.111 5432

# Test with psql (if you have it installed)
psql -h 141.148.50.111 -U app_user -d app_db
# Enter password: Jewgo123
```

### **Step 8: Verify Database Setup**

```sql
-- Connect to database and run:
\l                    -- List databases
\dt                   -- List tables
SELECT version();     -- Check PostgreSQL version
\du                   -- List users
```

## 🔧 **Troubleshooting Commands**

### Check PostgreSQL Status
```bash
sudo systemctl status postgresql
sudo journalctl -u postgresql -f
```

### Check Firewall Status
```bash
sudo ufw status
sudo iptables -L
```

### Check Network Connectivity
```bash
# Test if port is listening
sudo netstat -tlnp | grep 5432
sudo ss -tlnp | grep 5432
```

### Check PostgreSQL Logs
```bash
sudo tail -f /var/log/postgresql/postgresql-*.log
```

## 🚨 **Common Issues**

### 1. Connection Refused
- PostgreSQL not running: `sudo systemctl start postgresql`
- Wrong listen_addresses: Check postgresql.conf
- Firewall blocking: Check UFW and Oracle Cloud security lists

### 2. Authentication Failed
- User doesn't exist: Create user in PostgreSQL
- Wrong password: Reset password
- pg_hba.conf misconfigured: Check authentication rules

### 3. Network Issues
- Oracle Cloud security lists not configured
- Firewall blocking connections
- Server not accessible from internet

## 📝 **Next Steps After Setup**

1. **Test connection** from your local machine
2. **Set environment variables** for migration:
   ```bash
   export ORACLE_DATABASE_URL="postgresql://app_user:Jewgo123@141.148.50.111:5432/app_db?sslmode=require"
   export NEON_DATABASE_URL="your_neon_connection_string"
   ```
3. **Run migration script**: `python migrate_neon_to_oracle.py`
4. **Update Render DATABASE_URL** to use Oracle Cloud
5. **Monitor application logs** for connectivity

## 🔒 **Security Notes**

- Consider using SSL connections
- Use strong passwords
- Limit access to specific IP ranges if possible
- Regularly update PostgreSQL
- Monitor access logs for suspicious activity
