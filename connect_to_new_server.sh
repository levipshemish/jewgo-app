#!/bin/bash

# Connect to New JewGo Server Script
# This script helps you connect to the new server at 150.136.63.50

NEW_SERVER_IP="150.136.63.50"
PUBLIC_KEY_FILE="ssh-key-2025-09-08.key.pub"

echo "🔑 JewGo New Server Connection Helper"
echo "====================================="
echo ""

# Check if public key exists
if [ ! -f "$PUBLIC_KEY_FILE" ]; then
    echo "❌ Public key file $PUBLIC_KEY_FILE not found!"
    exit 1
fi

echo "✅ Found public key: $PUBLIC_KEY_FILE"
echo ""

# Display the public key fingerprint
echo "🔍 Public Key Fingerprint:"
ssh-keygen -lf "$PUBLIC_KEY_FILE"
echo ""

# Check if private key exists
PRIVATE_KEY_FILE="ssh-key-2025-09-08.key"
if [ -f "$PRIVATE_KEY_FILE" ]; then
    echo "✅ Found private key: $PRIVATE_KEY_FILE"
    echo ""
    echo "🚀 Attempting to connect to server..."
    echo "   Server: ubuntu@$NEW_SERVER_IP"
    echo "   Key: $PRIVATE_KEY_FILE"
    echo ""
    
    # Set proper permissions for private key
    chmod 600 "$PRIVATE_KEY_FILE"
    
    # Attempt SSH connection
    ssh -i "$PRIVATE_KEY_FILE" -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@$NEW_SERVER_IP "echo '✅ SSH connection successful! Server is ready for setup.'"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Connection successful!"
        echo ""
        echo "📋 Next steps:"
        echo "1. Run the setup script:"
        echo "   ssh -i $PRIVATE_KEY_FILE ubuntu@$NEW_SERVER_IP"
        echo "   wget https://raw.githubusercontent.com/mml555/jewgo-app/main/quick_setup_new_server.sh"
        echo "   chmod +x quick_setup_new_server.sh"
        echo "   ./quick_setup_new_server.sh"
        echo ""
        echo "2. Or follow the manual guide:"
        echo "   ssh -i $PRIVATE_KEY_FILE ubuntu@$NEW_SERVER_IP"
        echo "   # Then follow NEW_SERVER_SETUP_GUIDE.md"
    else
        echo "❌ SSH connection failed. Possible issues:"
        echo "   - Server not ready yet"
        echo "   - Firewall blocking SSH"
        echo "   - Wrong private key"
        echo "   - Server not accessible"
    fi
else
    echo "❌ Private key file $PRIVATE_KEY_FILE not found!"
    echo ""
    echo "📋 You need the private key file to connect. Options:"
    echo ""
    echo "1. 🔍 Find the private key file:"
    echo "   - Look for 'ssh-key-2025-09-08.key' (without .pub)"
    echo "   - Check your Downloads folder"
    echo "   - Check where you generated the key pair"
    echo ""
    echo "2. 🔑 Generate a new key pair:"
    echo "   ssh-keygen -t rsa -b 4096 -f ssh-key-2025-09-08.key"
    echo ""
    echo "3. 📤 Add the public key to your server:"
    echo "   - Copy the public key content:"
    cat "$PUBLIC_KEY_FILE"
    echo ""
    echo "   - Add it to ~/.ssh/authorized_keys on the server"
    echo ""
    echo "4. 🔧 Alternative connection methods:"
    echo "   - Use password authentication if enabled"
    echo "   - Use cloud provider console/terminal"
    echo "   - Contact your server provider for access"
fi

echo ""
echo "📞 If you need help:"
echo "   - Check server provider documentation"
echo "   - Verify server is running and accessible"
echo "   - Ensure SSH service is enabled on the server"