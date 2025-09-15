# Auth Sessions Security Hardening Migration

This directory contains the migration files for implementing enhanced session management and security features for the JewGo authentication system.

## Overview

This migration implements requirements 2.1, 2.2, 2.3, 2.4, and 2.5 from the auth security hardening specification:

- **JWT ID Tracking**: Adds `current_jti` column for unique token identification
- **Replay Attack Detection**: Adds `reused_jti_of` column to track token reuse
- **Device Fingerprinting**: Adds `device_hash` column for device tracking
- **Privacy-Preserving IP Tracking**: Adds `last_ip_cidr` column for IP monitoring
- **Step-up Authentication**: Adds `auth_time` column for fresh authentication tracking
- **Session Family Management**: Enhanced family-based token revocation
- **Performance Indexes**: Optimized database indexes for security queries
- **Helper Functions**: Database functions for session management
- **Monitoring Views**: Views for session monitoring and management

## Files

### Migration Files
- `20250914_auth_sessions_security_hardening.sql` - Main migration SQL script
- `run_auth_sessions_security_hardening.py` - Python migration runner with safety checks
- `rollback_auth_sessions_security_hardening.sql` - Rollback SQL script
- `run_rollback_auth_sessions_security_hardening.py` - Python rollback runner
- `test_auth_sessions_migration.py` - Test suite for migration functionality

### Documentation
- `README_auth_sessions_migration.md` - This file

## Prerequisites

Before running the migration:

1. **Database Access**: Ensure you have PostgreSQL access with DDL privileges
2. **Backup**: Create a full database backup
3. **Extensions**: Ensure `uuid-ossp` extension is available
4. **Base Schema**: The `auth_sessions` table must exist (run `consolidate_auth_schema.sql` first if needed)

## Usage

### 1. Test the Migration (Recommended)

First, test the migration functionality:

```bash
cd backend/database/migrations
python test_auth_sessions_migration.py
```

This will:
- Create test data
- Test all migration functions
- Verify constraints and indexes
- Clean up test data

### 2. Apply the Migration

#### Option A: Using Python Runner (Recommended)

```bash
cd backend/database/migrations
python run_auth_sessions_security_hardening.py
```

Options:
- `--no-backup`: Skip creating backup table
- `--verify-only`: Only verify migration, don't apply

#### Option B: Direct SQL Execution

```bash
psql $DATABASE_URL -f 20250914_auth_sessions_security_hardening.sql
```

### 3. Verify Migration Success

Check the migration was applied correctly:

```bash
python run_auth_sessions_security_hardening.py --verify-only
```

### 4. Rollback (If Needed)

⚠️ **WARNING**: Rollback will remove security features and may cause data loss.

#### Option A: Using Python Runner (Recommended)

```bash
python run_rollback_auth_sessions_security_hardening.py
```

Options:
- `--no-backup`: Skip creating pre-rollback backup
- `--force`: Skip confirmation prompt
- `--verify-only`: Only verify rollback, don't apply

#### Option B: Direct SQL Execution

```bash
psql $DATABASE_URL -f rollback_auth_sessions_security_hardening.sql
```

## Migration Details

### New Columns Added

| Column | Type | Description |
|--------|------|-------------|
| `current_jti` | UUID | Current JWT ID for token verification and replay detection |
| `reused_jti_of` | UUID | JTI that was reused (for audit trail) |
| `device_hash` | VARCHAR(64) | SHA-256 hash of device fingerprint |
| `last_ip_cidr` | CIDR | Last known IP in CIDR format (privacy-preserving) |
| `auth_time` | TIMESTAMPTZ | Time of initial authentication |

### New Indexes Created

- `idx_auth_sessions_current_jti` - For token verification
- `idx_auth_sessions_device_hash` - For device tracking
- `idx_auth_sessions_last_ip_cidr` - For IP monitoring
- `idx_auth_sessions_auth_time` - For step-up authentication
- `idx_auth_sessions_reused_jti_of` - For replay detection
- `idx_auth_sessions_family_active` - For active session queries
- `idx_auth_sessions_unique_active_jti` - Unique constraint for active tokens

### New Functions Created

- `revoke_session_family(family_id, reason)` - Revoke all sessions in a family
- `handle_token_replay(jti, family_id)` - Detect and handle token replay
- `rotate_session_token(...)` - Safely rotate session tokens
- `cleanup_expired_sessions()` - Clean up old expired sessions

### New Views Created

- `active_sessions` - View of currently active sessions with user info
- `session_families` - Statistics view of session families

## Data Migration

The migration automatically:

1. **Backfills existing sessions** with default values:
   - `family_id`: Generated UUID (if missing)
   - `auth_time`: Set to `created_at` timestamp
   - `device_hash`: Generated from `user_agent`
   - `last_ip_cidr`: Derived from existing `ip` column

2. **Preserves existing data** in all original columns

3. **Adds constraints** after backfilling to ensure data integrity

## Monitoring

After migration, you can monitor sessions using:

```sql
-- View active sessions
SELECT * FROM active_sessions WHERE user_id = 'some_user_id';

-- View session family statistics
SELECT * FROM session_families WHERE user_id = 'some_user_id';

-- Check for recent replay attempts
SELECT * FROM auth_audit_log 
WHERE action = 'token_replay_detected' 
AND created_at > NOW() - INTERVAL '1 hour';
```

## Performance Impact

The migration adds several indexes to optimize security queries. Expected performance characteristics:

- **Token verification**: Sub-millisecond lookups via `current_jti` index
- **Family queries**: Optimized via composite `family_active` index
- **Device tracking**: Fast lookups via `device_hash` index
- **IP monitoring**: Efficient CIDR queries via `last_ip_cidr` index

## Security Benefits

After migration, the system provides:

1. **Replay Attack Protection**: Detects and prevents token reuse
2. **Family-based Revocation**: Revoke all related sessions on compromise
3. **Device Tracking**: Monitor sessions across devices
4. **Step-up Authentication**: Require fresh auth for sensitive operations
5. **Privacy-preserving IP Tracking**: Monitor without storing full IPs
6. **Comprehensive Audit Trail**: Track all security events

## Troubleshooting

### Common Issues

1. **Migration fails with "uuid-ossp not found"**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```

2. **Constraint violation during backfill**:
   - Check for duplicate data in existing sessions
   - Review the migration logs for specific errors

3. **Performance issues after migration**:
   - Run `ANALYZE auth_sessions;` to update statistics
   - Check that all indexes were created successfully

4. **Application errors after migration**:
   - Update application code to use new session management features
   - Check that database connection has necessary permissions

### Getting Help

If you encounter issues:

1. Check the migration logs for detailed error messages
2. Verify prerequisites are met
3. Test the migration on a copy of your data first
4. Contact the development team with specific error messages

## Next Steps

After successful migration:

1. **Update Application Code**: Implement the new session management features
2. **Configure Monitoring**: Set up alerts for security events
3. **Test Security Features**: Verify replay detection and family revocation work
4. **Update Documentation**: Document the new security capabilities
5. **Train Team**: Ensure team understands new security features

## Rollback Considerations

Before rolling back:

- **Data Loss**: Rollback will permanently delete security-related data
- **Application Impact**: Ensure application can work without new features
- **Security Impact**: System will lose enhanced security protections
- **Backup**: Always create backup before rollback

The rollback is designed to be safe but will remove all security enhancements added by this migration.