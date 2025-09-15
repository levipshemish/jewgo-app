#!/bin/bash

# Health Check Monitoring Script
# Monitors backend health and sends alerts for issues

set -e

# Configuration
BASE_URL="${BASE_URL:-https://api.jewgo.app}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"  # seconds
MAX_FAILURES="${MAX_FAILURES:-3}"
LOG_FILE="${LOG_FILE:-/var/log/health-monitor.log}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# State tracking
failure_count=0
last_alert_time=0
alert_cooldown=300  # 5 minutes between alerts

# Logging functions
log_info() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1"
    echo -e "${BLUE}${message}${NC}"
    echo "$message" >> "$LOG_FILE"
}

log_success() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] [SUCCESS] $1"
    echo -e "${GREEN}${message}${NC}"
    echo "$message" >> "$LOG_FILE"
}

log_warning() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] [WARNING] $1"
    echo -e "${YELLOW}${message}${NC}"
    echo "$message" >> "$LOG_FILE"
}

log_error() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1"
    echo -e "${RED}${message}${NC}"
    echo "$message" >> "$LOG_FILE"
}

# Send alert function
send_alert() {
    local alert_type="$1"
    local message="$2"
    local details="$3"
    
    local current_time=$(date +%s)
    
    # Check alert cooldown
    if [ $((current_time - last_alert_time)) -lt $alert_cooldown ]; then
        log_info "Alert suppressed due to cooldown period"
        return
    fi
    
    last_alert_time=$current_time
    
    log_error "ALERT: $alert_type - $message"
    
    # Send email alert if configured
    if [ -n "$ALERT_EMAIL" ]; then
        echo "Subject: [JewGo Health Alert] $alert_type" > /tmp/health_alert.txt
        echo "To: $ALERT_EMAIL" >> /tmp/health_alert.txt
        echo "" >> /tmp/health_alert.txt
        echo "$message" >> /tmp/health_alert.txt
        echo "" >> /tmp/health_alert.txt
        echo "Details:" >> /tmp/health_alert.txt
        echo "$details" >> /tmp/health_alert.txt
        echo "" >> /tmp/health_alert.txt
        echo "Time: $(date)" >> /tmp/health_alert.txt
        echo "URL: $BASE_URL" >> /tmp/health_alert.txt
        
        # Send email (requires mail command or similar)
        if command -v mail >/dev/null 2>&1; then
            mail -s "[JewGo Health Alert] $alert_type" "$ALERT_EMAIL" < /tmp/health_alert.txt
            log_info "Email alert sent to $ALERT_EMAIL"
        else
            log_warning "Email alert configured but mail command not available"
        fi
        
        rm -f /tmp/health_alert.txt
    fi
    
    # Send Slack alert if configured
    if [ -n "$SLACK_WEBHOOK" ]; then
        local slack_payload=$(cat <<EOF
{
    "text": "🚨 JewGo Health Alert",
    "attachments": [
        {
            "color": "danger",
            "fields": [
                {
                    "title": "Alert Type",
                    "value": "$alert_type",
                    "short": true
                },
                {
                    "title": "Message",
                    "value": "$message",
                    "short": false
                },
                {
                    "title": "Time",
                    "value": "$(date)",
                    "short": true
                },
                {
                    "title": "URL",
                    "value": "$BASE_URL",
                    "short": true
                }
            ]
        }
    ]
}
EOF
        )
        
        curl -X POST -H 'Content-type: application/json' \
            --data "$slack_payload" \
            "$SLACK_WEBHOOK" >/dev/null 2>&1 && log_info "Slack alert sent" || log_warning "Failed to send Slack alert"
    fi
}

# Check basic health endpoint
check_basic_health() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/healthz" || echo "000")
    
    if [ "$response" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# Check comprehensive health endpoint
check_comprehensive_health() {
    local response=$(curl -s "$BASE_URL/health" || echo "")
    
    if [ -z "$response" ]; then
        echo "CRITICAL: No response from health endpoint"
        return 1
    fi
    
    # Parse JSON response (basic check)
    local status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    
    case "$status" in
        "healthy")
            echo "OK: All systems healthy"
            return 0
            ;;
        "degraded")
            echo "WARNING: System degraded"
            echo "$response"
            return 2
            ;;
        "unhealthy")
            echo "CRITICAL: System unhealthy"
            echo "$response"
            return 1
            ;;
        *)
            echo "UNKNOWN: Unexpected status: $status"
            echo "$response"
            return 3
            ;;
    esac
}

# Check auth-specific health
check_auth_health() {
    local response=$(curl -s "$BASE_URL/health/auth" || echo "")
    
    if [ -z "$response" ]; then
        echo "CRITICAL: No response from auth health endpoint"
        return 1
    fi
    
    local status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    
    case "$status" in
        "healthy")
            echo "OK: Auth systems healthy"
            return 0
            ;;
        "degraded")
            echo "WARNING: Auth system degraded"
            echo "$response"
            return 2
            ;;
        "unhealthy")
            echo "CRITICAL: Auth system unhealthy"
            echo "$response"
            return 1
            ;;
        *)
            echo "UNKNOWN: Auth status: $status"
            echo "$response"
            return 3
            ;;
    esac
}

# Check response time
check_response_time() {
    local start_time=$(date +%s.%N)
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" || echo "000")
    local end_time=$(date +%s.%N)
    
    local response_time=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
    local response_time_ms=$(echo "$response_time * 1000" | bc -l 2>/dev/null || echo "0")
    
    if [ "$response_code" = "200" ]; then
        if (( $(echo "$response_time_ms > 1000" | bc -l) )); then
            echo "WARNING: Response time ${response_time_ms}ms exceeds 1000ms"
            return 2
        else
            echo "OK: Response time ${response_time_ms}ms"
            return 0
        fi
    else
        echo "CRITICAL: Response code $response_code"
        return 1
    fi
}

# Main health check function
run_health_checks() {
    local overall_status=0
    local check_results=""
    
    log_info "Running health checks against $BASE_URL"
    
    # Basic health check
    if check_basic_health; then
        check_results="$check_results\n✅ Basic health: OK"
    else
        check_results="$check_results\n❌ Basic health: FAILED"
        overall_status=1
    fi
    
    # Comprehensive health check
    local comp_result=$(check_comprehensive_health)
    local comp_exit_code=$?
    
    case $comp_exit_code in
        0)
            check_results="$check_results\n✅ Comprehensive health: OK"
            ;;
        2)
            check_results="$check_results\n⚠️  Comprehensive health: DEGRADED"
            if [ $overall_status -eq 0 ]; then
                overall_status=2
            fi
            ;;
        1)
            check_results="$check_results\n❌ Comprehensive health: CRITICAL"
            overall_status=1
            ;;
        *)
            check_results="$check_results\n❓ Comprehensive health: UNKNOWN"
            overall_status=3
            ;;
    esac
    
    # Auth health check
    local auth_result=$(check_auth_health)
    local auth_exit_code=$?
    
    case $auth_exit_code in
        0)
            check_results="$check_results\n✅ Auth health: OK"
            ;;
        2)
            check_results="$check_results\n⚠️  Auth health: DEGRADED"
            if [ $overall_status -eq 0 ]; then
                overall_status=2
            fi
            ;;
        1)
            check_results="$check_results\n❌ Auth health: CRITICAL"
            overall_status=1
            ;;
        *)
            check_results="$check_results\n❓ Auth health: UNKNOWN"
            overall_status=3
            ;;
    esac
    
    # Response time check
    local response_result=$(check_response_time)
    local response_exit_code=$?
    
    case $response_exit_code in
        0)
            check_results="$check_results\n✅ Response time: OK"
            ;;
        2)
            check_results="$check_results\n⚠️  Response time: SLOW"
            if [ $overall_status -eq 0 ]; then
                overall_status=2
            fi
            ;;
        1)
            check_results="$check_results\n❌ Response time: CRITICAL"
            overall_status=1
            ;;
    esac
    
    # Log results
    echo -e "$check_results"
    
    return $overall_status
}

# Main monitoring loop
monitor_loop() {
    log_info "Starting health monitoring (interval: ${CHECK_INTERVAL}s)"
    
    while true; do
        if run_health_checks; then
            # Health checks passed
            if [ $failure_count -gt 0 ]; then
                log_success "Health checks recovered after $failure_count failures"
                failure_count=0
            fi
        else
            # Health checks failed
            ((failure_count++))
            log_warning "Health check failed (attempt $failure_count/$MAX_FAILURES)"
            
            if [ $failure_count -ge $MAX_FAILURES ]; then
                send_alert "CRITICAL" "Health checks failed $failure_count times in a row" "$check_results"
                log_error "Alert sent due to consecutive failures"
            fi
        fi
        
        log_info "Waiting ${CHECK_INTERVAL} seconds until next check..."
        sleep "$CHECK_INTERVAL"
    done
}

# Single check mode
single_check() {
    log_info "Running single health check"
    
    if run_health_checks; then
        log_success "All health checks passed"
        exit 0
    else
        log_error "Health checks failed"
        exit 1
    fi
}

# Help function
show_help() {
    cat << EOF
Health Check Monitoring Script

Usage: $0 [OPTIONS] [COMMAND]

Options:
    -u, --url URL           Base URL to monitor (default: https://api.jewgo.app)
    -i, --interval SECONDS  Check interval in seconds (default: 60)
    -m, --max-failures NUM  Max consecutive failures before alert (default: 3)
    -e, --email EMAIL       Email address for alerts
    -s, --slack WEBHOOK     Slack webhook URL for alerts
    -l, --log-file FILE     Log file path (default: /var/log/health-monitor.log)
    -h, --help              Show this help message

Commands:
    monitor                 Run continuous monitoring (default)
    check                   Run single health check
    test                    Test alert system

Environment Variables:
    BASE_URL                Base URL to monitor
    CHECK_INTERVAL          Check interval in seconds
    MAX_FAILURES           Max consecutive failures before alert
    ALERT_EMAIL            Email address for alerts
    SLACK_WEBHOOK          Slack webhook URL for alerts
    LOG_FILE               Log file path

Examples:
    $0                      # Run continuous monitoring with defaults
    $0 check                # Run single health check
    $0 -u http://localhost  # Monitor localhost
    $0 -i 30 -m 5           # Check every 30s, alert after 5 failures

EOF
}

# Parse command line arguments
COMMAND="monitor"

while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -i|--interval)
            CHECK_INTERVAL="$2"
            shift 2
            ;;
        -m|--max-failures)
            MAX_FAILURES="$2"
            shift 2
            ;;
        -e|--email)
            ALERT_EMAIL="$2"
            shift 2
            ;;
        -s|--slack)
            SLACK_WEBHOOK="$2"
            shift 2
            ;;
        -l|--log-file)
            LOG_FILE="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        monitor|check|test)
            COMMAND="$1"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Handle different commands
case "$COMMAND" in
    monitor)
        monitor_loop
        ;;
    check)
        single_check
        ;;
    test)
        log_info "Testing alert system"
        send_alert "TEST" "This is a test alert" "Alert system is working correctly"
        log_success "Test alert sent"
        ;;
    *)
        echo "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
