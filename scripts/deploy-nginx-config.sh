#!/bin/bash

# Nginx Configuration Deployment Script
# Deploys enhanced Nginx configuration with rate limiting and security headers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
NGINX_CONFIG_DIR="$PROJECT_ROOT/nginx"
NGINX_CONF_FILE="$NGINX_CONFIG_DIR/nginx.conf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "Running as root. Consider using a non-root user with sudo privileges."
    elif ! sudo -n true 2>/dev/null; then
        log_error "This script requires sudo privileges. Please run with sudo or configure sudoers."
        exit 1
    fi
}

# Validate Nginx configuration
validate_nginx_config() {
    log_info "Validating Nginx configuration..."
    
    if [ ! -f "$NGINX_CONF_FILE" ]; then
        log_error "Nginx configuration file not found: $NGINX_CONF_FILE"
        exit 1
    fi
    
    # Test Nginx configuration syntax
    if sudo nginx -t -c "$NGINX_CONF_FILE"; then
        log_success "Nginx configuration syntax is valid"
    else
        log_error "Nginx configuration syntax is invalid"
        exit 1
    fi
}

# Backup current configuration
backup_current_config() {
    local backup_dir="/etc/nginx/backups"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$backup_dir/nginx_$timestamp.conf"
    
    log_info "Creating backup of current Nginx configuration..."
    
    # Create backup directory if it doesn't exist
    sudo mkdir -p "$backup_dir"
    
    # Backup current config if it exists
    if [ -f "/etc/nginx/nginx.conf" ]; then
        sudo cp "/etc/nginx/nginx.conf" "$backup_file"
        log_success "Current configuration backed up to: $backup_file"
    else
        log_warning "No existing Nginx configuration found to backup"
    fi
}

# Deploy new configuration
deploy_config() {
    log_info "Deploying new Nginx configuration..."
    
    # Copy new configuration
    sudo cp "$NGINX_CONF_FILE" "/etc/nginx/nginx.conf"
    
    # Set proper permissions
    sudo chown root:root "/etc/nginx/nginx.conf"
    sudo chmod 644 "/etc/nginx/nginx.conf"
    
    log_success "Configuration deployed successfully"
}

# Reload Nginx
reload_nginx() {
    log_info "Reloading Nginx service..."
    
    if sudo systemctl reload nginx; then
        log_success "Nginx reloaded successfully"
    else
        log_error "Failed to reload Nginx. Check the logs: sudo journalctl -u nginx -f"
        exit 1
    fi
}

# Test rate limiting
test_rate_limiting() {
    log_info "Testing rate limiting configuration..."
    
    local test_url="https://api.jewgo.app/health"
    local max_requests=15
    local success_count=0
    local rate_limited_count=0
    
    log_info "Sending $max_requests requests to test rate limiting..."
    
    for i in $(seq 1 $max_requests); do
        response=$(curl -s -o /dev/null -w "%{http_code}" "$test_url" || echo "000")
        
        if [ "$response" = "200" ]; then
            ((success_count++))
        elif [ "$response" = "429" ]; then
            ((rate_limited_count++))
            log_info "Request $i: Rate limited (429)"
        else
            log_warning "Request $i: Unexpected response code $response"
        fi
        
        # Small delay between requests
        sleep 0.1
    done
    
    log_info "Rate limiting test results:"
    log_info "  Successful requests: $success_count"
    log_info "  Rate limited requests: $rate_limited_count"
    
    if [ $rate_limited_count -gt 0 ]; then
        log_success "Rate limiting is working correctly"
    else
        log_warning "No rate limiting detected. This might be expected depending on the rate limits."
    fi
}

# Test security headers
test_security_headers() {
    log_info "Testing security headers..."
    
    local test_url="https://api.jewgo.app/health"
    local headers=$(curl -s -I "$test_url")
    
    local required_headers=(
        "Strict-Transport-Security"
        "X-Frame-Options"
        "X-Content-Type-Options"
        "X-XSS-Protection"
        "Referrer-Policy"
        "Permissions-Policy"
    )
    
    local missing_headers=()
    
    for header in "${required_headers[@]}"; do
        if echo "$headers" | grep -qi "$header"; then
            log_success "Security header present: $header"
        else
            missing_headers+=("$header")
            log_warning "Security header missing: $header"
        fi
    done
    
    if [ ${#missing_headers[@]} -eq 0 ]; then
        log_success "All required security headers are present"
    else
        log_error "Missing security headers: ${missing_headers[*]}"
        return 1
    fi
}

# Test CORS configuration
test_cors_config() {
    log_info "Testing CORS configuration..."
    
    local test_url="https://api.jewgo.app/health"
    local origin="https://jewgo.app"
    
    local cors_headers=$(curl -s -I -H "Origin: $origin" "$test_url")
    
    if echo "$cors_headers" | grep -qi "Access-Control-Allow-Origin"; then
        log_success "CORS headers are present"
    else
        log_warning "CORS headers not detected"
    fi
}

# Main deployment function
main() {
    log_info "Starting Nginx configuration deployment..."
    
    # Check prerequisites
    check_permissions
    
    # Validate configuration
    validate_nginx_config
    
    # Create backup
    backup_current_config
    
    # Deploy new configuration
    deploy_config
    
    # Reload Nginx
    reload_nginx
    
    # Wait a moment for Nginx to fully reload
    sleep 2
    
    # Test configuration
    log_info "Testing deployed configuration..."
    
    if test_security_headers && test_cors_config; then
        log_success "Configuration deployment and testing completed successfully"
    else
        log_warning "Some tests failed, but configuration was deployed. Please verify manually."
    fi
    
    # Optional rate limiting test (commented out as it might be disruptive)
    # test_rate_limiting
    
    log_info "Deployment completed. Monitor Nginx logs with: sudo journalctl -u nginx -f"
}

# Help function
show_help() {
    cat << EOF
Nginx Configuration Deployment Script

Usage: $0 [OPTIONS]

Options:
    -h, --help      Show this help message
    -t, --test      Run tests only (no deployment)
    -v, --validate  Validate configuration only (no deployment)

Examples:
    $0              # Full deployment with testing
    $0 --test       # Run tests on current configuration
    $0 --validate   # Validate configuration file only

EOF
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    -t|--test)
        log_info "Running tests only..."
        check_permissions
        test_security_headers
        test_cors_config
        test_rate_limiting
        ;;
    -v|--validate)
        log_info "Validating configuration only..."
        validate_nginx_config
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac
