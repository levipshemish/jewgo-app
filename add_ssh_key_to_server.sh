#!/bin/bash

# Script to add SSH public key to the new server
# This script will help you add the public key to your server

NEW_SERVER_IP="150.136.63.50"
PUBLIC_KEY_FILE="ssh-key-2025-09-08.key.pub"

echo "🔑 Adding SSH Public Key to New Server"
echo "======================================"
echo ""

if [ ! -f "$PUBLIC_KEY_FILE" ]; then
    echo "❌ Public key file $PUBLIC_KEY_FILE not found!"
    exit 1
fi

echo "✅ Found public key: $PUBLIC_KEY_FILE"
echo ""

# Display the public key
echo "📋 Your public key content:"
echo "=========================="
cat "$PUBLIC_KEY_FILE"
echo ""

echo "🔧 Instructions to add this key to your server:"
echo "=============================================="
echo ""
echo "1. 🌐 Access your server through your cloud provider's console:"
echo "   - AWS: EC2 Instance Connect or Session Manager"
echo "   - DigitalOcean: Droplet Console"
echo "   - Google Cloud: SSH in browser"
echo "   - Azure: Cloud Shell or Bastion"
echo ""
echo "2. 📝 Run these commands on your server:"
echo "   mkdir -p ~/.ssh"
echo "   echo '$(cat $PUBLIC_KEY_FILE)' >> ~/.ssh/authorized_keys"
echo "   chmod 600 ~/.ssh/authorized_keys"
echo "   chmod 700 ~/.ssh"
echo ""
echo "3. 🧪 Test the connection:"
echo "   ssh -i ssh-key-2025-09-08.key ubuntu@$NEW_SERVER_IP"
echo ""

# Create a one-liner command for easy copying
echo "📋 Copy this one-liner command to run on your server:"
echo "===================================================="
echo "mkdir -p ~/.ssh && echo '$(cat $PUBLIC_KEY_FILE)' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
echo ""

echo "🚀 After adding the key, run this to test:"
echo "=========================================="
echo "./connect_to_new_server.sh"
echo ""

echo "📞 If you need help accessing your server console:"
echo "================================================="
echo "- Check your cloud provider's documentation"
echo "- Look for 'Console', 'Terminal', or 'SSH' options"
echo "- Some providers have 'Connect' buttons in their dashboards"
