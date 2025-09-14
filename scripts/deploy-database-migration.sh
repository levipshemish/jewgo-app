#!/bin/bash

# Database Migration Deployment Script
# This script applies the missing columns migration to the production database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configuration
SSH_USER="ubuntu"
SSH_HOST="129.80.190.110"
SSH_KEY=".secrets/ssh-key-2025-09-08.key"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="jewgo_db"
DB_USER="app_user"
DB_PASSWORD="Jewgo123"
MIGRATION_FILE="backend/migrations/fix_column_mapping_2025_01_14.sql"

echo -e "${BLUE}🗄️  JewGo Database Migration Deployment${NC}"
echo -e "${BLUE}=======================================${NC}"
echo "Database: $DB_NAME"
echo "SSH: $SSH_USER@$SSH_HOST"
echo "DB Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo "Migration: $MIGRATION_FILE"
echo ""

# Function to execute SQL command via SSH
execute_sql() {
    local sql_command="$1"
    local description="$2"
    
    echo -e "${BLUE}Executing: $description${NC}"
    
    if ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "PGPASSWORD='$DB_PASSWORD' psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME' -c '$sql_command'"; then
        echo -e "${GREEN}✅ Success: $description${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed: $description${NC}"
        return 1
    fi
}

# Function to check if migration has already been applied
check_migration_status() {
    local migration_name="fix_column_mapping_2025_01_14"
    
    echo -e "${BLUE}🔍 Checking migration status...${NC}"
    
    # Create migrations table if it doesn't exist
    execute_sql "
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id SERIAL PRIMARY KEY,
            migration_name VARCHAR(255) UNIQUE NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            description TEXT
        );
    " "Create migrations tracking table"
    
    # Check if this migration has already been applied
    local result=$(ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "PGPASSWORD='$DB_PASSWORD' psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME' -t -c \"SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '$migration_name';\"" | tr -d ' ')
    
    if [ "$result" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Migration '$migration_name' has already been applied${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Migration '$migration_name' not yet applied${NC}"
        return 0
    fi
}

# Function to backup database before migration
backup_database() {
    local backup_file="jewgo_db_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    echo -e "${BLUE}💾 Creating database backup...${NC}"
    echo "Backup file: $backup_file"
    
    if ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "PGPASSWORD='$DB_PASSWORD' pg_dump -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME'" > "$backup_file"; then
        echo -e "${GREEN}✅ Database backup created: $backup_file${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to create database backup${NC}"
        return 1
    fi
}

# Function to apply migration
apply_migration() {
    echo -e "${BLUE}🚀 Applying migration...${NC}"
    
    if [ ! -f "$MIGRATION_FILE" ]; then
        echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
        return 1
    fi
    
    if ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "PGPASSWORD='$DB_PASSWORD' psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME'" < "$MIGRATION_FILE"; then
        echo -e "${GREEN}✅ Migration applied successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ Migration failed${NC}"
        return 1
    fi
}

# Function to record migration in tracking table
record_migration() {
    local migration_name="fix_column_mapping_2025_01_14"
    local description="Add missing columns to mikvah and stores tables"
    
    execute_sql "
        INSERT INTO schema_migrations (migration_name, description) 
        VALUES ('$migration_name', '$description')
        ON CONFLICT (migration_name) DO NOTHING;
    " "Record migration in tracking table"
}

# Function to verify migration
verify_migration() {
    echo -e "${BLUE}🔍 Verifying migration...${NC}"
    
    # Check if key columns exist
    local mikvah_view_exists=$(ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "PGPASSWORD='$DB_PASSWORD' psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME' -t -c \"SELECT COUNT(*) FROM information_schema.views WHERE table_name = 'mikvah_search_view';\"" | tr -d ' ')
    
    local stores_view_exists=$(ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "PGPASSWORD='$DB_PASSWORD' psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME' -t -c \"SELECT COUNT(*) FROM information_schema.views WHERE table_name = 'stores_search_view';\"" | tr -d ' ')
    
    if [ "$mikvah_view_exists" -gt 0 ] && [ "$stores_view_exists" -gt 0 ]; then
        echo -e "${GREEN}✅ Migration verification successful${NC}"
        echo -e "  - mikvah_search_view exists"
        echo -e "  - stores_search_view exists"
        return 0
    else
        echo -e "${RED}❌ Migration verification failed${NC}"
        echo -e "  - mikvah_search_view: $([ "$mikvah_view_exists" -gt 0 ] && echo "✅ exists" || echo "❌ missing")"
        echo -e "  - stores_search_view: $([ "$stores_view_exists" -gt 0 ] && echo "✅ exists" || echo "❌ missing")"
        return 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}Starting database migration process...${NC}"
    
    # Check if migration has already been applied
    if ! check_migration_status; then
        echo -e "${YELLOW}Migration already applied. Exiting.${NC}"
        exit 0
    fi
    
    # Create backup
    if ! backup_database; then
        echo -e "${RED}Failed to create backup. Aborting migration.${NC}"
        exit 1
    fi
    
    # Apply migration
    if ! apply_migration; then
        echo -e "${RED}Migration failed. Check the backup file for rollback if needed.${NC}"
        exit 1
    fi
    
    # Record migration
    if ! record_migration; then
        echo -e "${YELLOW}⚠️  Failed to record migration, but migration was applied successfully${NC}"
    fi
    
    # Verify migration
    if ! verify_migration; then
        echo -e "${RED}Migration verification failed${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Database migration completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Summary:${NC}"
    echo -e "  - Added missing columns to mikvah and stores tables"
    echo -e "  - Migration recorded in schema_migrations table"
    echo -e "  - Database backup created for safety"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "  1. Test the search API to ensure no more column errors"
    echo -e "  2. Update any application code that uses the new columns"
    echo -e "  3. Consider adding indexes on frequently queried columns"
}

# Check if psql is available
if ! command -v psql > /dev/null; then
    echo -e "${RED}❌ psql command not found. Please install PostgreSQL client tools.${NC}"
    exit 1
fi

# Check if pg_dump is available
if ! command -v pg_dump > /dev/null; then
    echo -e "${RED}❌ pg_dump command not found. Please install PostgreSQL client tools.${NC}"
    exit 1
fi

# Run main function
main "$@"
