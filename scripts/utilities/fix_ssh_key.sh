#!/bin/bash

# Fix SSH Key Access Script
# This script provides multiple ways to add your SSH key to the server

echo "🔧 SSH Key Troubleshooting & Fix"
echo "================================="
echo ""

echo "🔍 Current Status:"
echo "✅ SSH key pair is valid"
echo "✅ Server is accessible on port 22"
echo "❌ Public key not added to server's authorized_keys"
echo ""

echo "📋 Your public key fingerprint:"
ssh-keygen -lf ssh-key-2025-09-08.key.pub
echo ""

echo "🔧 Solutions to add your key to the server:"
echo "==========================================="
echo ""

echo "1. 🌐 Use Cloud Provider Console (Recommended):"
echo "   - Go to your cloud provider dashboard"
echo "   - Find your server at 150.136.63.50"
echo "   - Click 'Console', 'Terminal', or 'SSH'"
echo "   - Run this command:"
echo ""
echo "   mkdir -p ~/.ssh"
echo "   echo '$(cat ssh-key-2025-09-08.key.pub)' >> ~/.ssh/authorized_keys"
echo "   chmod 600 ~/.ssh/authorized_keys"
echo "   chmod 700 ~/.ssh"
echo ""

echo "2. 🔑 Use ssh-copy-id (if password auth is enabled):"
echo "   ssh-copy-id -i ssh-key-2025-09-08.key.pub ubuntu@150.136.63.50"
echo ""

echo "3. 📤 Manual key addition via cloud provider:"
echo "   - Some providers let you add SSH keys during server creation"
echo "   - Check if you can add this key through the dashboard"
echo ""

echo "4. 🔄 Generate a new key pair and add it:"
echo "   ssh-keygen -t rsa -b 4096 -f new-key -C 'jewgo-server-$(date +%Y%m%d)'"
echo "   # Then add the new-key.pub to your server"
echo ""

echo "🧪 Test connection after adding the key:"
echo "======================================="
echo "ssh -i ssh-key-2025-09-08.key ubuntu@150.136.63.50"
echo ""

echo "📞 Which cloud provider are you using?"
echo "======================================"
echo "- AWS: EC2 Instance Connect, Session Manager, or CloudShell"
echo "- DigitalOcean: Droplet Console or Cloud Shell"
echo "- Google Cloud: SSH in browser or Cloud Shell"
echo "- Azure: Cloud Shell or Bastion"
echo "- Linode: Lish Console"
echo "- Vultr: VNC Console"
echo ""

echo "💡 Quick copy-paste command for your server console:"
echo "==================================================="
echo "mkdir -p ~/.ssh && echo '$(cat ssh-key-2025-09-08.key.pub)' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && chmod 700 ~/.ssh && echo 'SSH key added successfully!'"
