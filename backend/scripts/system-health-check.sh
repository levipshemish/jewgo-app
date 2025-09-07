#!/bin/bash

# Comprehensive System Health Check Script
LOG_FILE="/var/log/system-health-check.log"

log() {
    echo "[$(date)] $1" | tee -a "$LOG_FILE"
}

check_docker_containers() {
    log "Checking Docker containers..."
    local unhealthy_containers=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep -v "healthy" | grep -v "NAMES" | wc -l)
    if [ "$unhealthy_containers" -gt 0 ]; then
        log "WARNING: Found $unhealthy_containers potentially unhealthy containers"
        docker ps --format "table {{.Names}}\t{{.Status}}" | grep -v "healthy" | tee -a "$LOG_FILE"
    else
        log "All Docker containers are healthy"
    fi
}

check_disk_space() {
    log "Checking disk space..."
    local disk_usage=$(df / | tail -1 | awk "{print \$5}" | sed "s/%//")
    if [ "$disk_usage" -gt 80 ]; then
        log "WARNING: Disk usage is at ${disk_usage}%"
    else
        log "Disk usage is at ${disk_usage}% - OK"
    fi
}

check_memory() {
    log "Checking memory usage..."
    local mem_usage=$(free | grep Mem | awk "{printf \"%.0f\", \$3/\$2 * 100.0}")
    if [ "$mem_usage" -gt 90 ]; then
        log "WARNING: Memory usage is at ${mem_usage}%"
    else
        log "Memory usage is at ${mem_usage}% - OK"
    fi
}

check_nginx_health() {
    log "Checking nginx health..."
    if curl -f -s -o /dev/null "https://api.jewgo.app/health" 2>/dev/null; then
        log "Nginx health check passed"
    else
        log "ERROR: Nginx health check failed"
        return 1
    fi
}

main() {
    log "Starting comprehensive system health check"
    check_docker_containers
    check_disk_space
    check_memory
    check_nginx_health
    log "System health check completed"
}

main
