#!/bin/bash
set -euo pipefail

# JewGo Security Hardening Deployment Script
# This script deploys all security hardening components including:
# - Backend security fixes
# - Nginx configuration
# - Monitoring setup
# - Key rotation system

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$BACKEND_DIR")"
NGINX_CONFIG_DIR="/etc/nginx/sites-available"
SYSTEMD_DIR="/etc/systemd/system"
LOG_FILE="/var/log/jewgo-security-deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
        error "Please run as the jewgo user with sudo privileges"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if required commands exist
    local required_commands=("python3" "pip3" "nginx" "systemctl" "redis-cli" "psql")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command '$cmd' not found"
            exit 1
        fi
    done
    
    # Check if backend directory exists
    if [[ ! -d "$BACKEND_DIR" ]]; then
        error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    
    # Check if virtual environment exists
    if [[ ! -d "$BACKEND_DIR/.venv" ]]; then
        error "Python virtual environment not found: $BACKEND_DIR/.venv"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Install Python dependencies
install_dependencies() {
    log "Installing Python dependencies..."
    
    cd "$BACKEND_DIR"
    source .venv/bin/activate
    
    # Install/upgrade security-related packages
    pip install --upgrade \
        cryptography \
        pyjwt \
        redis \
        prometheus-client \
        psycopg2-binary
    
    success "Python dependencies installed"
}

# Deploy backend security fixes
deploy_backend_security() {
    log "Deploying backend security fixes..."
    
    cd "$BACKEND_DIR"
    source .venv/bin/activate
    
    # Run dependency checker
    if python utils/dependency_checker.py; then
        success "Dependency check passed"
    else
        error "Dependency check failed"
        exit 1
    fi
    
    # Run configuration validator
    if python utils/config_validator.py; then
        success "Configuration validation passed"
    else
        error "Configuration validation failed"
        exit 1
    fi
    
    # Initialize JWT keys if needed
    if python scripts/rotate_jwt_keys.py status | grep -q "No current key"; then
        log "Initializing JWT keys..."
        python scripts/rotate_jwt_keys.py init
        success "JWT keys initialized"
    else
        log "JWT keys already exist"
    fi
    
    success "Backend security deployment completed"
}

# Deploy Nginx configuration
deploy_nginx_config() {
    log "Deploying Nginx configuration..."
    
    # Backup existing configuration
    if [[ -f "$NGINX_CONFIG_DIR/jewgo" ]]; then
        sudo cp "$NGINX_CONFIG_DIR/jewgo" "$NGINX_CONFIG_DIR/jewgo.backup.$(date +%Y%m%d_%H%M%S)"
        log "Existing Nginx config backed up"
    fi
    
    # Copy new configuration
    sudo cp "$BACKEND_DIR/nginx/jewgo-security.conf" "$NGINX_CONFIG_DIR/jewgo"
    
    # Create error pages directory
    sudo mkdir -p /var/www/jewgo/error-pages
    sudo cp "$BACKEND_DIR/nginx/rate-limit-error.html" /var/www/jewgo/error-pages/429.html
    
    # Set proper permissions
    sudo chown -R www-data:www-data /var/www/jewgo
    sudo chmod -R 644 /var/www/jewgo/error-pages/*
    
    # Test Nginx configuration
    if sudo nginx -t; then
        success "Nginx configuration test passed"
        
        # Enable site
        sudo ln -sf "$NGINX_CONFIG_DIR/jewgo" /etc/nginx/sites-enabled/jewgo
        
        # Reload Nginx
        sudo systemctl reload nginx
        success "Nginx configuration deployed and reloaded"
    else
        error "Nginx configuration test failed"
        exit 1
    fi
}

# Deploy monitoring configuration
deploy_monitoring() {
    log "Deploying monitoring configuration..."
    
    # Create monitoring directories
    sudo mkdir -p /etc/prometheus/rules
    sudo mkdir -p /var/lib/grafana/dashboards
    
    # Copy Prometheus configuration
    sudo cp "$BACKEND_DIR/monitoring/prometheus-security.yml" /etc/prometheus/prometheus.yml
    sudo cp "$BACKEND_DIR/monitoring/security_rules.yml" /etc/prometheus/rules/
    
    # Copy Grafana dashboard
    sudo cp "$BACKEND_DIR/monitoring/grafana-security-dashboard.json" /var/lib/grafana/dashboards/
    
    # Set proper permissions
    sudo chown -R prometheus:prometheus /etc/prometheus
    sudo chown -R grafana:grafana /var/lib/grafana/dashboards
    
    # Restart services
    if systemctl is-active --quiet prometheus; then
        sudo systemctl restart prometheus
        success "Prometheus restarted"
    else
        warning "Prometheus service not running"
    fi
    
    if systemctl is-active --quiet grafana-server; then
        sudo systemctl restart grafana-server
        success "Grafana restarted"
    else
        warning "Grafana service not running"
    fi
    
    success "Monitoring configuration deployed"
}

# Deploy key rotation system
deploy_key_rotation() {
    log "Deploying key rotation system..."
    
    # Copy systemd service file
    sudo cp "$BACKEND_DIR/scripts/jewgo-key-rotation.service" "$SYSTEMD_DIR/"
    
    # Reload systemd
    sudo systemctl daemon-reload
    
    # Enable and start service
    sudo systemctl enable jewgo-key-rotation.service
    
    if sudo systemctl start jewgo-key-rotation.service; then
        success "Key rotation service started"
    else
        error "Failed to start key rotation service"
        sudo journalctl -u jewgo-key-rotation.service --no-pager -n 20
        exit 1
    fi
    
    # Check service status
    if sudo systemctl is-active --quiet jewgo-key-rotation.service; then
        success "Key rotation service is running"
    else
        error "Key rotation service is not running"
        exit 1
    fi
    
    success "Key rotation system deployed"
}

# Run security tests
run_security_tests() {
    log "Running security tests..."
    
    cd "$BACKEND_DIR"
    source .venv/bin/activate
    
    # Run integration tests
    if python -m pytest tests/integration/test_auth_security.py -v; then
        success "Security integration tests passed"
    else
        error "Security integration tests failed"
        exit 1
    fi
    
    # Test key rotation
    if python scripts/rotate_jwt_keys.py status; then
        success "Key rotation system test passed"
    else
        error "Key rotation system test failed"
        exit 1
    fi
    
    success "Security tests completed"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check services
    local services=("nginx" "jewgo-key-rotation")
    for service in "${services[@]}"; do
        if sudo systemctl is-active --quiet "$service"; then
            success "$service is running"
        else
            error "$service is not running"
            exit 1
        fi
    done
    
    # Check endpoints
    local endpoints=(
        "https://jewgo.app/health"
        "https://api.jewgo.app/health"
        "https://api.jewgo.app/api/v5/auth/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -s -f "$endpoint" > /dev/null; then
            success "$endpoint is accessible"
        else
            warning "$endpoint is not accessible (may be expected in some environments)"
        fi
    done
    
    # Check JWT keys
    cd "$BACKEND_DIR"
    source .venv/bin/activate
    
    if python scripts/rotate_jwt_keys.py status | grep -q "Current Key:"; then
        success "JWT keys are properly configured"
    else
        error "JWT keys are not properly configured"
        exit 1
    fi
    
    success "Deployment verification completed"
}

# Generate deployment report
generate_report() {
    log "Generating deployment report..."
    
    local report_file="/tmp/jewgo-security-deployment-report.txt"
    
    cat > "$report_file" << EOF
JewGo Security Hardening Deployment Report
==========================================
Date: $(date)
Deployed by: $(whoami)
Server: $(hostname)

Components Deployed:
- Backend security fixes
- Enhanced authentication system
- Nginx security configuration
- Prometheus monitoring
- Grafana security dashboard
- Automated JWT key rotation

Service Status:
EOF
    
    # Add service status to report
    local services=("nginx" "jewgo-key-rotation" "prometheus" "grafana-server")
    for service in "${services[@]}"; do
        if sudo systemctl is-active --quiet "$service" 2>/dev/null; then
            echo "- $service: RUNNING" >> "$report_file"
        else
            echo "- $service: NOT RUNNING" >> "$report_file"
        fi
    done
    
    cat >> "$report_file" << EOF

Security Features Enabled:
- JWT token authentication with automatic refresh
- Rate limiting (10 req/min for auth, 100 req/min for API)
- CSRF protection
- Step-up authentication for sensitive operations
- WebAuthn support (if enabled)
- Security headers (HSTS, CSP, X-Frame-Options, etc.)
- Automated key rotation (weekly)
- Security monitoring and alerting

Next Steps:
1. Review and customize rate limiting rules if needed
2. Configure SSL certificates for production
3. Set up alerting endpoints (email, Slack, etc.)
4. Review security logs regularly
5. Test step-up authentication flows
6. Configure WebAuthn if desired

Log Files:
- Deployment log: $LOG_FILE
- Nginx logs: /var/log/nginx/jewgo_*.log
- Key rotation logs: journalctl -u jewgo-key-rotation.service
- Application logs: Check your application log directory

For support, see: https://docs.jewgo.app/security/
EOF
    
    success "Deployment report generated: $report_file"
    cat "$report_file"
}

# Main deployment function
main() {
    log "Starting JewGo Security Hardening Deployment"
    log "============================================="
    
    check_root
    check_prerequisites
    install_dependencies
    deploy_backend_security
    deploy_nginx_config
    deploy_monitoring
    deploy_key_rotation
    run_security_tests
    verify_deployment
    generate_report
    
    success "Security hardening deployment completed successfully!"
    success "Please review the deployment report above and follow the next steps."
}

# Handle script interruption
trap 'error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"