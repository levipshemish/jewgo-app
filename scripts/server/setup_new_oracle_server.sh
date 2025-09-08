#!/bin/bash

# Setup New Oracle Cloud Server Script
# Server: 129.213.166.201 with ssh-key-2025-09-08.key

NEW_SERVER_IP="129.213.166.201"
KEY_FILE="ssh-key-2025-09-08.key"

echo "☁️ New Oracle Cloud Server Setup"
echo "================================="
echo "Server IP: $NEW_SERVER_IP"
echo "SSH Key: $KEY_FILE"
echo ""

echo "🔍 Current Status:"
echo "✅ Server is accessible on port 22"
echo "❌ SSH key authentication failing"
echo ""

echo "📋 Your Public Key:"
echo "==================="
cat "$KEY_FILE.pub"
echo ""

echo "🔧 Solution: Add Key via Oracle Cloud Console"
echo "============================================="
echo ""
echo "1. 🌐 Go to Oracle Cloud Console:"
echo "   https://cloud.oracle.com"
echo ""
echo "2. 🖥️ Access Instance Console:"
echo "   - Navigate to: Compute > Instances"
echo "   - Find instance at $NEW_SERVER_IP"
echo "   - Click 'Console Connection'"
echo "   - Click 'Launch Cloud Shell' or 'Launch Remote Console'"
echo ""
echo "3. 🔑 Add Your Public Key:"
echo "   mkdir -p ~/.ssh"
echo "   echo '$(cat $KEY_FILE.pub)' >> ~/.ssh/authorized_keys"
echo "   chmod 600 ~/.ssh/authorized_keys"
echo "   chmod 700 ~/.ssh"
echo ""

echo "💡 One-liner command for Oracle Cloud Console:"
echo "============================================="
echo "mkdir -p ~/.ssh && echo '$(cat $KEY_FILE.pub)' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh && echo 'SSH key added successfully!'"
echo ""

echo "🧪 Test Connection After Adding Key:"
echo "===================================="
echo "ssh -i $KEY_FILE ubuntu@$NEW_SERVER_IP"
echo ""

echo "🚀 Once Connected, Run Setup:"
echo "============================="
echo "wget https://raw.githubusercontent.com/mml555/jewgo-app/main/quick_setup_new_server.sh"
echo "chmod +x quick_setup_new_server.sh"
echo "./quick_setup_new_server.sh"
echo ""

echo "📊 Expected Results After Setup:"
echo "================================"
echo "✅ API accessible at https://api.jewgo.app"
echo "✅ 30 restaurant records imported"
echo "✅ SSL certificates configured"
echo "✅ PostgreSQL database with fresh data"
echo "✅ Redis caching enabled"
echo "✅ All performance improvements active"
echo ""

echo "🎯 Ready to proceed with Oracle Cloud console access!"
