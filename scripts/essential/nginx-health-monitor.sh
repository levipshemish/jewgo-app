#!/bin/bash

# Nginx Health Monitor Script
LOG_FILE="/var/log/nginx-health-monitor.log"
NGINX_CONTAINER="jewgo-nginx"

log() {
    echo "[$(date)] $1" | tee -a "$LOG_FILE"
}

check_nginx_status() {
    if docker ps | grep -q "$NGINX_CONTAINER"; then
        return 0
    else
        return 1
    fi
}

check_nginx_health() {
    if curl -f -s -o /dev/null "https://api.jewgo.app/health" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

restart_nginx() {
    log "Attempting to restart nginx container..."
    docker stop "$NGINX_CONTAINER" 2>/dev/null || true
    if docker start "$NGINX_CONTAINER"; then
        log "Nginx container restarted successfully"
        sleep 10
        if check_nginx_health; then
            log "Nginx health check passed after restart"
            return 0
        else
            log "WARNING: Nginx restarted but health check failed"
            return 1
        fi
    else
        log "ERROR: Failed to restart nginx container"
        return 1
    fi
}

main() {
    log "Starting nginx health check"
    if check_nginx_status; then
        if check_nginx_health; then
            log "Nginx is running and healthy"
            exit 0
        else
            log "WARNING: Nginx is running but not responding to health checks"
            restart_nginx
        fi
    else
        log "ERROR: Nginx container is not running"
        restart_nginx
    fi
}

main
