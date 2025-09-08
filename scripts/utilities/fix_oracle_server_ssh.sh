#!/bin/bash

# Fix SSH Access to Oracle Cloud Server
# Server: 129.213.166.201
# Key: ssh-key-2025-09-08.key

echo "🔧 Fixing SSH Access to Oracle Cloud Server"
echo "==========================================="
echo ""

echo "🌐 Server Details:"
echo "   IP: 129.213.166.201"
echo "   User: ubuntu"
echo "   Key: ssh-key-2025-09-08.key"
echo ""

echo "📋 Your Public Key:"
echo "==================="
cat ssh-key-2025-09-08.key.pub
echo ""

echo "🔧 Steps to Fix SSH Access:"
echo "==========================="
echo ""

echo "1. 🌐 Access Oracle Cloud Console:"
echo "   - Go to: https://cloud.oracle.com"
echo "   - Sign in to your account"
echo "   - Navigate to: Compute > Instances"
echo "   - Find instance: 129.213.166.201"
echo ""

echo "2. 🖥️ Open Instance Console:"
echo "   - Click on your instance name"
echo "   - Click 'Console Connection'"
echo "   - Click 'Launch Cloud Shell' or 'Launch Remote Console'"
echo ""

echo "3. 📝 Add SSH Key:"
echo "   Run this command in the console:"
echo ""
echo "   mkdir -p ~/.ssh"
echo "   echo '$(cat ssh-key-2025-09-08.key.pub)' >> ~/.ssh/authorized_keys"
echo "   chmod 600 ~/.ssh/authorized_keys"
echo "   chmod 700 ~/.ssh"
echo "   echo 'SSH key added successfully!'"
echo ""

echo "4. 🧪 Test Connection:"
echo "   Come back here and run:"
echo "   ssh -i ssh-key-2025-09-08.key ubuntu@129.213.166.201"
echo ""

echo "5. 🚀 Run Setup Script:"
echo "   Once connected, run:"
echo "   wget https://raw.githubusercontent.com/mml555/jewgo-app/main/quick_setup_new_server.sh"
echo "   chmod +x quick_setup_new_server.sh"
echo "   ./quick_setup_new_server.sh"
echo ""

echo "💡 Oracle Cloud Console Tips:"
echo "============================="
echo "- Instance Console works even if SSH is not configured"
echo "- Cloud Shell has internet access"
echo "- You can copy/paste commands directly"
echo ""

echo "💰 Cost Comparison:"
echo "==================="
echo "Single Server: ~$20-40/month"
echo "GKE Setup: ~$225/month"
echo "Savings: ~$185-205/month (5-10x cheaper!)"
echo ""

echo "🎯 Why Single Server is Better for Now:"
echo "======================================="
echo "✅ Much cheaper ($20-40 vs $225/month)"
echo "✅ Simpler to manage"
echo "✅ Perfect for current traffic levels"
echo "✅ Can always migrate to GKE later when needed"
echo "✅ All your backed up data ready to import"
echo ""

echo "🚀 Ready to proceed with single server setup?"
