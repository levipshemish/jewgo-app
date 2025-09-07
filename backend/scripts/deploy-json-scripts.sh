#!/bin/bash

# Script to deploy JSON investigation scripts to the server

echo "🚀 Deploying JSON investigation scripts to server..."

# Copy scripts to server
echo "📁 Copying scripts to server..."
scp backend/scripts/investigate-json.py ubuntu@api.jewgo.app:/tmp/
scp backend/scripts/fix-malformed-json.py ubuntu@api.jewgo.app:/tmp/

# Make scripts executable
echo "🔧 Making scripts executable..."
ssh ubuntu@api.jewgo.app "chmod +x /tmp/investigate-json.py /tmp/fix-malformed-json.py"

# Install required Python packages if needed
echo "📦 Installing required Python packages..."
ssh ubuntu@api.jewgo.app "sudo apt-get update && sudo apt-get install -y python3-psycopg2"

echo "✅ Scripts deployed successfully!"
echo ""
echo "To investigate JSON data, run:"
echo "  ssh ubuntu@api.jewgo.app 'python3 /tmp/investigate-json.py'"
echo ""
echo "To fix malformed JSON, run:"
echo "  ssh ubuntu@api.jewgo.app 'python3 /tmp/fix-malformed-json.py'"
