# Oracle Cloud PostgreSQL Backup & Optimization Guide

## 🔧 Backup System Setup

### Automated Nightly Backups

The backup system has been configured to run automatically every night at 3:17am UTC and keeps the last 7 days of backups.

#### Setup Commands (Run on Oracle Cloud VM)

```bash
# Run the backup setup script
sudo bash /path/to/setup_oracle_backups.sh
```

#### Manual Backup Commands

```bash
# Create a manual backup
sudo /usr/local/bin/pg-nightly-dump.sh

# Create a custom backup
sudo -u postgres pg_dump -Fc app_db > /path/to/backup.dump

# Create a backup with timestamp
sudo -u postgres pg_dump -Fc app_db > /var/backups/pg/app_db-$(date +%Y%m%d_%H%M%S).dump
```

#### Restore Commands

```bash
# Restore from backup (will overwrite existing data)
sudo -u postgres pg_restore -d app_db backup.dump

# Restore with clean option (drops and recreates tables)
sudo -u postgres pg_restore -d app_db --clean --if-exists backup.dump

# Restore to a new database
sudo -u postgres createdb app_db_restore
sudo -u postgres pg_restore -d app_db_restore backup.dump
```

#### Backup Monitoring

```bash
# Check backup directory
ls -lh /var/backups/pg/

# Check cron jobs
crontab -l

# View backup logs
sudo tail -f /var/log/syslog | grep pg-nightly-dump
```

## 🚀 Database Connection Pool Optimization

### Current Configuration

The application has been optimized for Oracle Cloud PostgreSQL with the following settings:

#### Gunicorn Workers
- **Workers**: 2-4 (based on CPU cores, capped at 4)
- **Worker Class**: sync
- **Max Requests**: 1000 per worker
- **Timeout**: 60 seconds

#### Database Connection Pool
- **Pool Size**: 5 connections per worker
- **Max Overflow**: 10 additional connections
- **Pool Timeout**: 30 seconds
- **Pool Recycle**: 180 seconds (3 minutes)

### Environment Variables

Add these to your Render environment variables for optimal performance:

```bash
# Database Connection Pool Settings
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=180

# Gunicorn Settings
WEB_CONCURRENCY=2
```

### Performance Monitoring

#### Check Database Connections

```sql
-- Check active connections
SELECT 
    datname,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change
FROM pg_stat_activity 
WHERE datname = 'app_db';

-- Count connections by application
SELECT 
    application_name,
    COUNT(*) as connection_count
FROM pg_stat_activity 
WHERE datname = 'app_db'
GROUP BY application_name;

-- Check connection pool usage
SELECT 
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_connections,
    count(*) FILTER (WHERE state = 'idle') as idle_connections
FROM pg_stat_activity 
WHERE datname = 'app_db';
```

#### Monitor Query Performance

```sql
-- Check slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%restaurants%'
ORDER BY mean_time DESC 
LIMIT 10;

-- Check table statistics
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

## 🔍 Backup Verification

### Test Backup Integrity

```bash
# Test backup file integrity
sudo -u postgres pg_restore --list /var/backups/pg/app_db-2025-08-25.dump

# Verify backup contains expected tables
sudo -u postgres pg_restore --list /var/backups/pg/app_db-2025-08-25.dump | grep -E "(restaurants|restaurant_images|florida_synagogues)"

# Test restore to temporary database
sudo -u postgres createdb test_restore
sudo -u postgres pg_restore -d test_restore /var/backups/pg/app_db-2025-08-25.dump

# Verify data in test database
sudo -u postgres psql -d test_restore -c "SELECT COUNT(*) FROM restaurants;"
sudo -u postgres psql -d test_restore -c "SELECT COUNT(*) FROM restaurant_images;"

# Clean up test database
sudo -u postgres dropdb test_restore
```

## 📊 Backup Storage Management

### Backup Retention Policy

- **Daily Backups**: Last 7 days
- **Backup Format**: PostgreSQL custom format (`.dump`)
- **Compression**: Automatic (PostgreSQL custom format)
- **Location**: `/var/backups/pg/`

### Storage Monitoring

```bash
# Check backup directory size
du -sh /var/backups/pg/

# Check available disk space
df -h /var/backups/pg/

# List backups with sizes
ls -lh /var/backups/pg/
```

### Backup Cleanup

```bash
# Manual cleanup (keep only last 5 days)
ls -1t /var/backups/pg/app_db-*.dump | tail -n +6 | xargs -r rm -f

# Cleanup old backups (older than 30 days)
find /var/backups/pg/ -name "app_db-*.dump" -mtime +30 -delete
```

## 🚨 Disaster Recovery

### Complete Database Restore

```bash
# Stop the application
sudo systemctl stop your-app-service

# Drop and recreate database
sudo -u postgres dropdb app_db
sudo -u postgres createdb app_db

# Restore from backup
sudo -u postgres pg_restore -d app_db /var/backups/pg/app_db-2025-08-25.dump

# Restart the application
sudo systemctl start your-app-service
```

### Point-in-Time Recovery

```bash
# Restore to specific point in time (if using WAL archiving)
sudo -u postgres pg_restore -d app_db --clean --if-exists backup.dump
```

## 🔧 Maintenance Tasks

### Regular Maintenance

```bash
# Weekly maintenance (add to crontab)
0 2 * * 0 sudo -u postgres vacuumdb --analyze app_db

# Monthly maintenance
0 3 1 * * sudo -u postgres reindexdb app_db
```

### Performance Tuning

```sql
-- Update table statistics
ANALYZE;

-- Vacuum tables
VACUUM ANALYZE restaurants;
VACUUM ANALYZE restaurant_images;
VACUUM ANALYZE florida_synagogues;

-- Check for bloat
SELECT 
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    round(n_dead_tup * 100.0 / nullif(n_live_tup + n_dead_tup, 0), 2) as bloat_percent
FROM pg_stat_user_tables 
WHERE n_dead_tup > 0
ORDER BY bloat_percent DESC;
```

## 📋 Monitoring Checklist

### Daily Checks
- [ ] Verify backup was created successfully
- [ ] Check backup file size (should be consistent)
- [ ] Monitor database connection count
- [ ] Check application error logs

### Weekly Checks
- [ ] Test backup restore to temporary database
- [ ] Review slow query performance
- [ ] Check disk space usage
- [ ] Update table statistics

### Monthly Checks
- [ ] Review backup retention policy
- [ ] Test disaster recovery procedure
- [ ] Review connection pool performance
- [ ] Check for database bloat

## 🎯 Best Practices

1. **Always test backups** before relying on them
2. **Monitor disk space** for backup storage
3. **Keep multiple backup copies** in different locations
4. **Document restore procedures** for team members
5. **Regularly test disaster recovery** procedures
6. **Monitor connection pool usage** to prevent exhaustion
7. **Use connection pooling** to manage database connections efficiently
8. **Set appropriate timeouts** to prevent hanging connections

## 🔗 Useful Commands

### Backup Management
```bash
# List all backups
ls -la /var/backups/pg/

# Check backup age
find /var/backups/pg/ -name "*.dump" -exec ls -la {} \;

# Compress old backups
gzip /var/backups/pg/app_db-2025-08-18.dump
```

### Database Health
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log

# Check database size
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('app_db'));"
```

This backup and optimization system ensures your Oracle Cloud PostgreSQL database is properly maintained, backed up, and optimized for production use.
