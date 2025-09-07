#!/bin/bash
BACKUP_DIR="/backups/application"
LOG_FILE="/var/log/application-backup.log"
APP_DIR="/home/ubuntu"
RETENTION_DAYS=7

log() {
    echo "[$(date)] $1" | tee -a "$LOG_FILE"
}

log "Starting application backup"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/jewgo_app_$(date +%Y%m%d_%H%M%S).tar.gz"

if tar -czf "$BACKUP_FILE" --exclude="node_modules" --exclude=".git" --exclude="*.log" -C "$APP_DIR" .; then
    log "Application backup created: $BACKUP_FILE"
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup size: $BACKUP_SIZE"
    find "$BACKUP_DIR" -name "jewgo_app_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
    log "Old backups cleaned up"
else
    log "ERROR: Application backup failed"
    exit 1
fi
log "Application backup completed"
