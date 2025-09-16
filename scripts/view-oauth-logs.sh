#!/bin/bash

# OAuth Logs Viewer Script
# This script helps view OAuth-related logs from the backend server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Server configuration
SERVER_HOST="157.151.254.18"
SERVER_USER="ubuntu"
SERVER_PATH="/home/ubuntu/jewgo-app"
SSH_KEY=".secrets/ssh-key-2025-09-11.key"

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  live      - Watch OAuth logs in real-time (default)"
    echo "  recent    - Show last 50 OAuth-related log entries"
    echo "  callback  - Show OAuth callback logs specifically"
    echo "  errors    - Show OAuth error logs only"
    echo "  clear     - Clear OAuth debug logs"
    echo ""
    echo "Examples:"
    echo "  $0 live                     # Watch OAuth logs in real-time"
    echo "  $0 recent                   # Show recent OAuth logs"
    echo "  $0 callback                 # Show callback-specific logs"
    echo ""
}

# Function to test server connection
test_connection() {
    if [ ! -f "$SSH_KEY" ]; then
        print_error "SSH key not found at: $SSH_KEY"
        return 1
    fi

    chmod 600 "$SSH_KEY"

    if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o BatchMode=yes $SERVER_USER@$SERVER_HOST "echo 'Connection successful'" 2>/dev/null; then
        print_error "Cannot connect to server. Please check your SSH key and server configuration."
        return 1
    fi

    return 0
}

# Function to watch OAuth logs in real-time
watch_oauth_logs() {
    print_status "Watching OAuth logs in real-time..."
    print_status "Press Ctrl+C to stop"
    print_status "Now trigger an OAuth sign-in to see the logs"
    echo ""
    
    ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && docker logs -f \$(docker ps -q --filter 'name=backend') 2>&1 | grep -i --line-buffered 'oauth\|google\|callback'"
}

# Function to show recent OAuth logs
show_recent_logs() {
    print_status "Showing last 50 OAuth-related log entries..."
    echo ""
    
    ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && docker logs --tail=200 \$(docker ps -q --filter 'name=backend') 2>&1 | grep -i 'oauth\|google\|callback' | tail -50"
}

# Function to show OAuth callback logs
show_callback_logs() {
    print_status "Showing OAuth callback-specific logs..."
    echo ""
    
    ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && docker logs --tail=500 \$(docker ps -q --filter 'name=backend') 2>&1 | grep -i 'callback\|oauth.*callback\|google.*callback' | tail -30"
}

# Function to show OAuth error logs
show_error_logs() {
    print_status "Showing OAuth error logs..."
    echo ""
    
    ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && docker logs --tail=500 \$(docker ps -q --filter 'name=backend') 2>&1 | grep -i 'oauth.*error\|oauth.*failed\|google.*error' | tail -30"
}

# Function to clear OAuth debug logs
clear_logs() {
    print_status "Clearing OAuth debug logs..."
    
    ssh -i "$SSH_KEY" $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && docker logs --tail=0 \$(docker ps -q --filter 'name=backend') > /dev/null 2>&1"
    
    print_success "OAuth debug logs cleared"
}

# Main execution
if ! test_connection; then
    exit 1
fi

case "${1:-live}" in
    "live")
        watch_oauth_logs
        ;;
    "recent")
        show_recent_logs
        ;;
    "callback")
        show_callback_logs
        ;;
    "errors")
        show_error_logs
        ;;
    "clear")
        clear_logs
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac
