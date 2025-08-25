#!/bin/bash
# Oracle Cloud Server PostgreSQL Setup Test
# Run this script directly on your Oracle Cloud server

echo "🔍 Oracle Cloud Server PostgreSQL Setup Test"
echo "============================================="

# Test 1: Check if PostgreSQL is running
echo "1. Checking PostgreSQL service status..."
if sudo systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL is running"
else
    echo "❌ PostgreSQL is not running"
    echo "   Run: sudo systemctl start postgresql"
    exit 1
fi

# Test 2: Check PostgreSQL configuration
echo "2. Checking PostgreSQL configuration..."
CONFIG_FILE=$(sudo find /etc/postgresql -name "postgresql.conf" -type f | head -1)
if [ -n "$CONFIG_FILE" ]; then
    echo "   Config file: $CONFIG_FILE"
    LISTEN_ADDRESSES=$(sudo grep "listen_addresses" "$CONFIG_FILE" | grep -v "^#" | cut -d'=' -f2 | tr -d ' ')
    if [ "$LISTEN_ADDRESSES" = "'*'" ]; then
        echo "✅ listen_addresses is set to '*'"
    else
        echo "❌ listen_addresses is not set to '*' (current: $LISTEN_ADDRESSES)"
        echo "   Edit $CONFIG_FILE and set: listen_addresses = '*'"
    fi
else
    echo "❌ Could not find postgresql.conf"
fi

# Test 3: Check client authentication
echo "3. Checking client authentication..."
HBA_FILE=$(sudo find /etc/postgresql -name "pg_hba.conf" -type f | head -1)
if [ -n "$HBA_FILE" ]; then
    echo "   HBA file: $HBA_FILE"
    REMOTE_ACCESS=$(sudo grep -E "host.*all.*all.*0\.0\.0\.0/0" "$HBA_FILE")
    if [ -n "$REMOTE_ACCESS" ]; then
        echo "✅ Remote access is configured in pg_hba.conf"
    else
        echo "❌ Remote access not configured in pg_hba.conf"
        echo "   Add this line to $HBA_FILE:"
        echo "   host    all         all           0.0.0.0/0               md5"
    fi
else
    echo "❌ Could not find pg_hba.conf"
fi

# Test 4: Check firewall
echo "4. Checking firewall settings..."
if command -v ufw >/dev/null 2>&1; then
    UFW_STATUS=$(sudo ufw status | grep "Status:")
    echo "   UFW Status: $UFW_STATUS"
    
    if sudo ufw status | grep -q "5432/tcp"; then
        echo "✅ Port 5432 is allowed in UFW"
    else
        echo "❌ Port 5432 is not allowed in UFW"
        echo "   Run: sudo ufw allow 5432/tcp"
    fi
else
    echo "ℹ️  UFW not found, checking iptables..."
    if sudo iptables -L | grep -q "5432"; then
        echo "✅ Port 5432 found in iptables"
    else
        echo "❌ Port 5432 not found in iptables"
    fi
fi

# Test 5: Check if PostgreSQL is listening
echo "5. Checking if PostgreSQL is listening..."
if sudo netstat -tlnp | grep -q ":5432"; then
    echo "✅ PostgreSQL is listening on port 5432"
    sudo netstat -tlnp | grep ":5432"
else
    echo "❌ PostgreSQL is not listening on port 5432"
fi

# Test 6: Test local connection
echo "6. Testing local database connection..."
if sudo -u postgres psql -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Local PostgreSQL connection works"
else
    echo "❌ Local PostgreSQL connection failed"
fi

# Test 7: Test connection from server's public IP
echo "7. Testing connection from server's public IP..."
SERVER_IP=$(curl -s ifconfig.me)
echo "   Server public IP: $SERVER_IP"

if sudo -u postgres psql -h "$SERVER_IP" -U app_user -d app_db -c "SELECT 1;" >/dev/null 2>&1; then
    echo "✅ Connection from public IP works"
else
    echo "❌ Connection from public IP failed"
    echo "   This might be due to Oracle Cloud security lists"
fi

echo ""
echo "📝 Summary:"
echo "==========="
echo "If you see any ❌ errors above, fix them before proceeding."
echo ""
echo "🔧 Next steps:"
echo "1. Configure Oracle Cloud security lists (most important)"
echo "2. Restart PostgreSQL after configuration changes"
echo "3. Test external connectivity"
echo "4. Run migration from your local machine"
