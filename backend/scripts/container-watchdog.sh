#!/bin/bash
LOG_FILE="/var/log/container-watchdog.log"
log() {
    echo "[$(date)] $1" | tee -a "$LOG_FILE"
}
CRITICAL_CONTAINERS=("jewgo-nginx" "jewgo-backend-new")
check_and_restart_container() {
    local container_name="$1"
    if ! docker ps | grep -q "$container_name"; then
        log "WARNING: Critical container $container_name is not running. Attempting to start..."
        if docker start "$container_name" 2>/dev/null; then
            log "SUCCESS: Container $container_name started successfully"
            sleep 10
            if docker ps | grep -q "$container_name"; then
                log "Container $container_name is now running and healthy"
            else
                log "ERROR: Container $container_name failed to start properly"
            fi
        else
            log "ERROR: Failed to start container $container_name"
        fi
    else
        log "Container $container_name is running - OK"
    fi
}
main() {
    log "Starting container watchdog check"
    for container in "${CRITICAL_CONTAINERS[@]}"; do
        check_and_restart_container "$container"
    done
    log "Container watchdog check completed"
}
main
