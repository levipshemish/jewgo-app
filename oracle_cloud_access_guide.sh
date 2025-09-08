#!/bin/bash

# Oracle Cloud Access Guide
# This script provides instructions for accessing your Oracle Cloud instance

echo "☁️ Oracle Cloud Access Guide"
echo "============================"
echo ""

echo "🌐 Accessing Oracle Cloud Console:"
echo "=================================="
echo "1. Go to: https://cloud.oracle.com"
echo "2. Sign in to your Oracle Cloud account"
echo "3. Navigate to: Compute > Instances"
echo "4. Find your instance at 129.159.109.238"
echo ""

echo "🔧 Two Ways to Access Your Instance:"
echo "===================================="
echo ""

echo "Method 1: 🖥️ Instance Console (Recommended)"
echo "------------------------------------------"
echo "1. Click on your instance name"
echo "2. Click 'Console Connection'"
echo "3. Click 'Launch Cloud Shell' or 'Launch Remote Console'"
echo "4. This opens a browser-based terminal"
echo ""

echo "Method 2: ☁️ Cloud Shell"
echo "------------------------"
echo "1. Click the Cloud Shell icon (terminal icon) in the top right"
echo "2. This opens a browser-based terminal"
echo "3. You can SSH from there: ssh ubuntu@129.159.109.238"
echo ""

echo "🔑 Adding SSH Key via Console:"
echo "=============================="
echo "Once you have console access, run these commands:"
echo ""

echo "1. Create SSH directory:"
echo "   mkdir -p ~/.ssh"
echo ""

echo "2. Add your public key (choose one):"
echo ""

echo "   For jewgo_console_rsa:"
echo "   echo 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDUV3SydTLNJ/12buy+3f21ORrlzbadNHGXjUwdO6cH0eadE4HmrhDdmwlkUiOkMpJ5oLoxNbTtXsASXQcOf0788oBbtQeE9AoFWO8dU5XdofTq3tui0yb8T9r7rDP50zc5gclqAM2wu79EBYIp2NNvjYjZPxP7guFLhY2r/BrZZP8IKhJ/PkCdNvswaxFkql0X392feDRCjFQJPSdd5972fmr6SRxPaHWmfTZOj1wCnlKEryLBXfSB5ZtU0xWt4yjKgkOWeERTn3nOpIhhGDn/WMff5Bs9Fv6qISssm+6cFoSPaqQ6NRkaS9c3Gnqfp3wH3Y8/8aXZzNY3CIGaytFF5d8yoPWNLQv/613GdG2knNo9I7prom5vfApOb5WpXanngdr6ITfW/Dwpve9jFPr82btKQ7zKgVUGl0sdCix23EjySh32rS9/sVnbMQjZIAsXdZJwC6iiDA0qXxk5U9B4N7sWkaCTBcrj3II9mEI/6T31D4OzIU9bVa7HWjad0+xJqcYkmt0re8qB2BAbSKWlTaTNCm2RpzeElyAlEthBL84snqeOqNO/+GqpYJRZb+2PEzUceUtjy9TpQ0EI2flcZuxDZKXdndP6DA/bNBE857GInr8AAftEjrOhyl5CnfF4p7Jtjb3jXJUXcWvC6DaYJhLrMyWRKs4I8kn5dIDpow== jewgo-console' >> ~/.ssh/authorized_keys"
echo ""

echo "   For jewgo_key:"
echo "   echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIEDsQvxHqkmGycvcPDxzSZbr27QrOXVCZJF74NzSfg/M mendell@MacBookPro' >> ~/.ssh/authorized_keys"
echo ""

echo "3. Set correct permissions:"
echo "   chmod 600 ~/.ssh/authorized_keys"
echo "   chmod 700 ~/.ssh"
echo ""

echo "🧪 Test Connection:"
echo "=================="
echo "After adding the key, test from your laptop:"
echo "ssh -i ~/.ssh/jewgo_console_rsa ubuntu@129.159.109.238"
echo "ssh -i ~/.ssh/jewgo_key ubuntu@129.159.109.238"
echo ""

echo "🚀 Once Connected, Run Setup:"
echo "============================="
echo "wget https://raw.githubusercontent.com/mml555/jewgo-app/main/quick_setup_new_server.sh"
echo "chmod +x quick_setup_new_server.sh"
echo "./quick_setup_new_server.sh"
echo ""

echo "💡 Oracle Cloud Tips:"
echo "===================="
echo "- Instance Console works even if SSH is not configured"
echo "- Cloud Shell has internet access and can download files"
echo "- Make sure your instance has a public IP (129.159.109.238)"
echo "- Check security lists allow SSH (port 22) from your IP"
