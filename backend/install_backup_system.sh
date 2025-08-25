#!/usr/bin/env bash
# Oracle Cloud PostgreSQL Backup System Installer
# ===============================================
# Copy this script to your Oracle Cloud VM and run it to set up automated backups

set -euo pipefail

echo "🔧 Oracle Cloud PostgreSQL Backup System Installer"
echo "=================================================="
echo "This script will set up automated nightly backups for your PostgreSQL database."
echo ""

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should not be run as root. Please run as a regular user."
   exit 1
fi

# Check if PostgreSQL is running
if ! sudo systemctl is-active --quiet postgresql; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

echo "✅ PostgreSQL is running"
echo ""

# Create the backup script
echo "📝 Creating nightly backup script..."
sudo tee /usr/local/bin/pg-nightly-dump.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

# Set up logging
LOG_FILE="/var/log/pg-backup.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

echo "$(date): Starting nightly backup..."

TS=$(date +%F)
BACKUP_DIR="/var/backups/pg"
BACKUP_FILE="$BACKUP_DIR/app_db-$TS.dump"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
echo "$(date): Creating backup: $BACKUP_FILE"
sudo -u postgres pg_dump -Fc app_db > "$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "$(date): Backup completed successfully"
    
    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "$(date): Backup size: $BACKUP_SIZE"
    
    # Clean up old backups (keep last 7 days)
    echo "$(date): Cleaning up old backups..."
    ls -1t "$BACKUP_DIR"/app_db-*.dump 2>/dev/null | tail -n +8 | xargs -r rm -f
    
    # List remaining backups
    echo "$(date): Remaining backups:"
    ls -lh "$BACKUP_DIR"/app_db-*.dump 2>/dev/null || echo "No backups found"
    
else
    echo "$(date): Backup failed!"
    exit 1
fi

echo "$(date): Nightly backup process completed"
EOF

# Make the script executable
echo "🔐 Making backup script executable..."
sudo chmod +x /usr/local/bin/pg-nightly-dump.sh

# Create backup directory with proper permissions
echo "📁 Creating backup directory..."
sudo mkdir -p /var/backups/pg
sudo chown postgres:postgres /var/backups/pg
sudo chmod 750 /var/backups/pg

# Set up cron job for nightly backup at 3:17am UTC
echo "⏰ Setting up cron job for nightly backup at 3:17am UTC..."
( crontab -l 2>/dev/null; echo "17 3 * * * /usr/local/bin/pg-nightly-dump.sh" ) | crontab -

# Test the backup script
echo "🧪 Testing backup script..."
sudo /usr/local/bin/pg-nightly-dump.sh

# Verify backup was created
echo "✅ Verifying backup creation..."
if [ -f "/var/backups/pg/app_db-$(date +%F).dump" ]; then
    echo "✅ Backup created successfully!"
    echo ""
    echo "📊 Backup details:"
    ls -lh /var/backups/pg/
else
    echo "❌ Backup creation failed!"
    exit 1
fi

# Show cron jobs
echo ""
echo "📅 Current cron jobs:"
crontab -l

echo ""
echo "🎉 Backup system setup complete!"
echo "=================================================="
echo "✅ Nightly backups will run at 3:17am UTC"
echo "✅ Backups stored in /var/backups/pg/"
echo "✅ Keeps last 7 days of backups"
echo "✅ Backup format: app_db-YYYY-MM-DD.dump"
echo "✅ Logs stored in /var/log/pg-backup.log"
echo ""
echo "📋 Manual backup commands:"
echo "   sudo /usr/local/bin/pg-nightly-dump.sh"
echo "   sudo -u postgres pg_dump -Fc app_db > backup.dump"
echo ""
echo "📋 Restore commands:"
echo "   sudo -u postgres pg_restore -d app_db backup.dump"
echo "   sudo -u postgres pg_restore -d app_db --clean --if-exists backup.dump"
echo ""
echo "📋 Monitoring commands:"
echo "   ls -lh /var/backups/pg/"
echo "   tail -f /var/log/pg-backup.log"
echo "   crontab -l"
echo ""
echo "🔍 To monitor backups, check:"
echo "   - Backup files: /var/backups/pg/"
echo "   - Backup logs: /var/log/pg-backup.log"
echo "   - Cron jobs: crontab -l"
