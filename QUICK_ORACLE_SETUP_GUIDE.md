# Quick Oracle Cloud Setup Guide

## 🚨 **Current Issue**
Your Oracle Cloud server at `141.148.50.111` is not accessible from external locations. The connection test shows "Operation timed out".

## 🔧 **Immediate Action Required**

### **Step 1: Run Server Setup Test**
SSH into your Oracle Cloud server and run the diagnostic script:

```bash
# SSH into your server
ssh ubuntu@141.148.50.111

# Copy and run the test script
# (Copy the contents of backend/test_server_setup.sh)
chmod +x test_server_setup.sh
./test_server_setup.sh
```

### **Step 2: Configure Oracle Cloud Security Lists (CRITICAL)**

This is the most common cause of connection issues:

1. **Log into Oracle Cloud Console**
2. **Go to Networking → Virtual Cloud Networks**
3. **Select your VCN**
4. **Click on Security Lists**
5. **Click on your security list**
6. **Click "Add Ingress Rules"**
7. **Add this rule:**
   - **Source**: `0.0.0.0/0`
   - **Port**: `5432`
   - **Protocol**: `TCP`
   - **Description**: `PostgreSQL`

### **Step 3: Verify PostgreSQL Configuration**

On your Oracle Cloud server:

```bash
# Check PostgreSQL configuration
sudo grep "listen_addresses" /etc/postgresql/*/main/postgresql.conf

# Should show: listen_addresses = '*'
# If not, edit the file and change it

# Check client authentication
sudo grep -E "host.*all.*all.*0\.0\.0\.0/0" /etc/postgresql/*/main/pg_hba.conf

# Should show a line like: host    all         all           0.0.0.0/0               md5
# If not, add it to the end of the file

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### **Step 4: Test Connectivity**

After making changes:

```bash
# Test from your local machine
nc -zv 141.148.50.111 5432

# If successful, test the database connection
cd backend
python test_oracle_cloud_connection.py
```

## 🎯 **Most Likely Issue**

Based on the timeout error, the **Oracle Cloud Security Lists** are probably not configured to allow incoming connections on port 5432. This is the most common cause of this type of connection failure.

## 📝 **After Fixing the Connection**

Once the connection works:

1. **Set up migration environment**:
   ```bash
   cd backend
   python setup_oracle_migration_env.py
   ```

2. **Run migration**:
   ```bash
   python migrate_neon_to_oracle.py
   ```

3. **Update Render DATABASE_URL** to use Oracle Cloud

## 🚨 **If Still Not Working**

If the connection still fails after configuring security lists:

1. **Check if the server is accessible**:
   ```bash
   ping 141.148.50.111
   ```

2. **Verify the IP address** is correct and the server is running

3. **Check Oracle Cloud instance status** in the console

4. **Consider using a different port** or **VPN connection**
