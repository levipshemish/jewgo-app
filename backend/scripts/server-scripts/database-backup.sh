#!/bin/bash
BACKUP_DIR="/backups/database"
LOG_FILE="/var/log/database-backup.log"
DB_NAME="app_db"
DB_USER="app_user"
DB_PASSWORD="Jewgo123"
RETENTION_DAYS=30

log() {
    echo "[$(date)] $1" | tee -a "$LOG_FILE"
}

log "Starting database backup"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/app_db_$(date +%Y%m%d_%H%M%S).sql"

export PGPASSWORD="$DB_PASSWORD"
if pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"; then
    log "Backup created: $BACKUP_FILE"
    gzip "$BACKUP_FILE"
    log "Backup compressed: ${BACKUP_FILE}.gz"
    find "$BACKUP_DIR" -name "app_db_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    log "Old backups cleaned up"
else
    log "ERROR: Backup failed"
    exit 1
fi
unset PGPASSWORD
log "Backup completed"
