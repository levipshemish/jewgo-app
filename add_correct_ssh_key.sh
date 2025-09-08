#!/bin/bash

# Add Correct SSH Key to Server Script
# This script helps you add the right public key to your server

SERVER_IP="129.159.109.238"

echo "🔑 Adding Correct SSH Key to Server $SERVER_IP"
echo "=============================================="
echo ""

echo "📋 Available SSH Keys:"
echo "====================="
echo ""

echo "1. 🔑 jewgo_console_rsa (RSA 4096):"
echo "   Fingerprint: $(ssh-keygen -lf ~/.ssh/jewgo_console_rsa.pub)"
echo "   Public Key:"
cat ~/.ssh/jewgo_console_rsa.pub
echo ""

echo "2. 🔑 jewgo_key (ED25519):"
echo "   Fingerprint: $(ssh-keygen -lf ~/.ssh/jewgo_key.pub)"
echo "   Public Key:"
cat ~/.ssh/jewgo_key.pub
echo ""

echo "3. 🔑 ssh-key-2025-09-08.key (RSA 4096 - Generated today):"
echo "   Fingerprint: $(ssh-keygen -lf ssh-key-2025-09-08.key.pub)"
echo "   Public Key:"
cat ssh-key-2025-09-08.key.pub
echo ""

echo "🔧 Instructions:"
echo "==============="
echo ""
echo "1. 🌐 Access your server console through your cloud provider"
echo "2. 📝 Add the public key that was used to create the server"
echo "3. 🧪 Test the connection"
echo ""

echo "💡 Quick commands for each key:"
echo "==============================="
echo ""

echo "For jewgo_console_rsa:"
echo "mkdir -p ~/.ssh && echo '$(cat ~/.ssh/jewgo_console_rsa.pub)' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
echo ""

echo "For jewgo_key:"
echo "mkdir -p ~/.ssh && echo '$(cat ~/.ssh/jewgo_key.pub)' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
echo ""

echo "For ssh-key-2025-09-08.key:"
echo "mkdir -p ~/.ssh && echo '$(cat ssh-key-2025-09-08.key.pub)' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh"
echo ""

echo "🧪 Test connection after adding the key:"
echo "======================================="
echo "ssh -i ~/.ssh/jewgo_console_rsa ubuntu@$SERVER_IP"
echo "ssh -i ~/.ssh/jewgo_key ubuntu@$SERVER_IP"
echo "ssh -i ssh-key-2025-09-08.key ubuntu@$SERVER_IP"
echo ""

echo "📞 Which key was used to create the server?"
echo "=========================================="
echo "- Check your cloud provider dashboard"
echo "- Look at the server creation details"
echo "- Check which key was selected during server setup"
