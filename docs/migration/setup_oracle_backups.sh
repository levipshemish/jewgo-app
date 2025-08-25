#!/usr/bin/env bash
# Oracle Cloud PostgreSQL Backup Setup Script
# ==========================================
# This script sets up nightly database backups on the Oracle Cloud VM

set -euo pipefail

echo "🔧 Setting up Oracle Cloud PostgreSQL Backup System"
echo "=================================================="

# Create the backup script
echo "📝 Creating nightly backup script..."
sudo tee /usr/local/bin/pg-nightly-dump.sh >/dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
TS=$(date +%F)
mkdir -p /var/backups/pg
sudo -u postgres pg_dump -Fc app_db > /var/backups/pg/app_db-$TS.dump
ls -1t /var/backups/pg/app_db-*.dump | tail -n +8 | xargs -r rm -f
EOF

# Make the script executable
echo "🔐 Making backup script executable..."
sudo chmod +x /usr/local/bin/pg-nightly-dump.sh

# Set up cron job for nightly backup at 3:17am UTC
echo "⏰ Setting up cron job for nightly backup at 3:17am UTC..."
( crontab -l 2>/dev/null; echo "17 3 * * * /usr/local/bin/pg-nightly-dump.sh" ) | crontab -

# Create backup directory with proper permissions
echo "📁 Creating backup directory..."
sudo mkdir -p /var/backups/pg
sudo chown postgres:postgres /var/backups/pg
sudo chmod 750 /var/backups/pg

# Test the backup script
echo "🧪 Testing backup script..."
sudo /usr/local/bin/pg-nightly-dump.sh

# Verify backup was created
echo "✅ Verifying backup creation..."
if [ -f "/var/backups/pg/app_db-$(date +%F).dump" ]; then
    echo "✅ Backup created successfully!"
    ls -lh /var/backups/pg/
else
    echo "❌ Backup creation failed!"
    exit 1
fi

# Show cron jobs
echo "📅 Current cron jobs:"
crontab -l

echo ""
echo "🎉 Backup system setup complete!"
echo "=================================================="
echo "✅ Nightly backups will run at 3:17am UTC"
echo "✅ Backups stored in /var/backups/pg/"
echo "✅ Keeps last 7 days of backups"
echo "✅ Backup format: app_db-YYYY-MM-DD.dump"
echo ""
echo "📋 Manual backup commands:"
echo "   sudo /usr/local/bin/pg-nightly-dump.sh"
echo "   sudo -u postgres pg_dump -Fc app_db > backup.dump"
echo ""
echo "📋 Restore commands:"
echo "   sudo -u postgres pg_restore -d app_db backup.dump"
echo "   sudo -u postgres pg_restore -d app_db --clean --if-exists backup.dump"
