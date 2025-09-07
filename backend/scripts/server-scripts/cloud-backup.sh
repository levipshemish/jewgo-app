#!/bin/bash
# Cloud Backup Script for JewGo Application

set -e
LOG_FILE="/var/log/cloud-backup.log"

log() {
    echo "[$(date)] $1" | tee -a "$LOG_FILE"
}

# Database configuration
DB_NAME="app_db"
DB_USER="app_user"
DB_PASSWORD="Jewgo123"
DB_HOST="localhost"

# Application path
APP_PATH="/home/ubuntu"

log "Starting cloud backup process"

# Check if AWS credentials are configured
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    log "WARNING: AWS credentials not configured. Cloud backup skipped."
    log "To enable cloud backup, set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables."
    exit 0
fi

# Create database backup
log "Creating database backup..."
export PGPASSWORD="$DB_PASSWORD"
BACKUP_FILE="/tmp/jewgo_db_$(date +%Y%m%d_%H%M%S).sql"

if pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"; then
    log "Database backup created: $BACKUP_FILE"
    
    # Compress backup
    gzip "$BACKUP_FILE"
    log "Database backup compressed: ${BACKUP_FILE}.gz"
    
    # Upload to S3 (if configured)
    if command -v aws >/dev/null 2>&1; then
        S3_BUCKET="${S3_BACKUP_BUCKET:-jewgo-backups}"
        S3_KEY="database/$(basename ${BACKUP_FILE}.gz)"
        
        if aws s3 cp "${BACKUP_FILE}.gz" "s3://$S3_BUCKET/$S3_KEY"; then
            log "Database backup uploaded to S3: s3://$S3_BUCKET/$S3_KEY"
        else
            log "ERROR: Failed to upload database backup to S3"
        fi
    fi
    
    # Cleanup local backup
    rm -f "${BACKUP_FILE}.gz"
else
    log "ERROR: Database backup failed"
    exit 1
fi

unset PGPASSWORD

# Create application backup
log "Creating application backup..."
APP_BACKUP_FILE="/tmp/jewgo_app_$(date +%Y%m%d_%H%M%S).tar.gz"

if tar -czf "$APP_BACKUP_FILE" \
    --exclude="node_modules" \
    --exclude=".git" \
    --exclude="*.log" \
    --exclude="__pycache__" \
    --exclude="*.pyc" \
    "$APP_PATH"; then
    log "Application backup created: $APP_BACKUP_FILE"
    
    # Upload to S3 (if configured)
    if command -v aws >/dev/null 2>&1; then
        S3_BUCKET="${S3_BACKUP_BUCKET:-jewgo-backups}"
        S3_KEY="application/$(basename $APP_BACKUP_FILE)"
        
        if aws s3 cp "$APP_BACKUP_FILE" "s3://$S3_BUCKET/$S3_KEY"; then
            log "Application backup uploaded to S3: s3://$S3_BUCKET/$S3_KEY"
        else
            log "ERROR: Failed to upload application backup to S3"
        fi
    fi
    
    # Cleanup local backup
    rm -f "$APP_BACKUP_FILE"
else
    log "ERROR: Application backup failed"
    exit 1
fi

log "Cloud backup process completed successfully"
