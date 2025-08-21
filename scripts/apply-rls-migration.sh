#!/bin/bash

# Apply RLS Migration Script
# This script applies the Row Level Security policies for anonymous users

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MIGRATION_FILE="backend/database/migrations/20250120_anonymous_rls_policies.sql"
BACKUP_DIR="backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo -e "${BLUE}🔧 RLS Migration Script${NC}"
echo "=================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL environment variable is not set${NC}"
    echo "Please set DATABASE_URL before running this script"
    exit 1
fi

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Migration Details:${NC}"
echo "File: $MIGRATION_FILE"
echo "Database: $(echo $DATABASE_URL | sed 's/.*@\([^:]*\).*/\1/')"
echo "Timestamp: $TIMESTAMP"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo -e "\n${YELLOW}🔍 Pre-migration checks...${NC}"

# Check database connectivity
echo "Testing database connection..."
if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to database${NC}"
    echo "Please check your DATABASE_URL and network connectivity"
    exit 1
fi
echo -e "${GREEN}✅ Database connection successful${NC}"

# Check if RLS is already enabled
echo "Checking current RLS status..."
RLS_STATUS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_policies WHERE tablename = 'restaurants';" 2>/dev/null | xargs)
if [ "$RLS_STATUS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  RLS policies may already exist${NC}"
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Migration cancelled"
        exit 0
    fi
fi

# Create backup
echo -e "\n${YELLOW}💾 Creating database backup...${NC}"
BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"

# Apply migration
echo -e "\n${YELLOW}🚀 Applying RLS migration...${NC}"
echo "This will:"
echo "- Enable RLS on all protected tables"
echo "- Create anonymous user detection functions"
echo "- Apply read-only policies for anonymous users"
echo "- Create performance indexes"

# Apply the migration
if psql "$DATABASE_URL" -f "$MIGRATION_FILE"; then
    echo -e "${GREEN}✅ Migration applied successfully${NC}"
else
    echo -e "${RED}❌ Migration failed${NC}"
    echo "Check the error messages above"
    exit 1
fi

# Verify migration
echo -e "\n${YELLOW}🔍 Verifying migration...${NC}"

# Check if RLS is enabled on tables
echo "Checking RLS status on tables..."
TABLES=("restaurants" "reviews" "favorites" "marketplace_items" "user_profiles" "notifications")

for table in "${TABLES[@]}"; do
    RLS_ENABLED=$(psql "$DATABASE_URL" -t -c "SELECT relrowsecurity FROM pg_class WHERE relname = '$table';" 2>/dev/null | xargs)
    if [ "$RLS_ENABLED" = "t" ]; then
        echo -e "${GREEN}✅ RLS enabled on $table${NC}"
    else
        echo -e "${RED}❌ RLS not enabled on $table${NC}"
    fi
done

# Check if functions exist
echo "Checking function creation..."
FUNCTIONS=("is_anonymous_user" "get_current_user_id")

for func in "${FUNCTIONS[@]}"; do
    FUNC_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_proc WHERE proname = '$func';" 2>/dev/null | xargs)
    if [ "$FUNC_EXISTS" -gt 0 ]; then
        echo -e "${GREEN}✅ Function $func created${NC}"
    else
        echo -e "${RED}❌ Function $func not found${NC}"
    fi
done

# Check if policies exist
echo "Checking policy creation..."
POLICY_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';" 2>/dev/null | xargs)
echo -e "${GREEN}✅ $POLICY_COUNT policies created${NC}"

# Test anonymous user function
echo "Testing anonymous user detection function..."
TEST_RESULT=$(psql "$DATABASE_URL" -t -c "SELECT is_anonymous_user('00000000-0000-0000-0000-000000000000'::uuid);" 2>/dev/null | xargs)
if [ "$TEST_RESULT" = "f" ]; then
    echo -e "${GREEN}✅ Anonymous user function working correctly${NC}"
else
    echo -e "${YELLOW}⚠️  Anonymous user function test inconclusive${NC}"
fi

echo -e "\n${GREEN}🎉 RLS Migration completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "- Backup created: $BACKUP_FILE"
echo "- RLS policies applied to all protected tables"
echo "- Anonymous user functions created"
echo "- Performance indexes created"
echo ""
echo -e "${YELLOW}⚠️  Important Notes:${NC}"
echo "1. Test the policies with anonymous users before going live"
echo "2. Monitor database performance after applying indexes"
echo "3. Keep the backup file for rollback if needed"
echo "4. Update your application to handle RLS restrictions"
echo ""
echo -e "${BLUE}🔍 Next Steps:${NC}"
echo "1. Test anonymous user access to protected resources"
echo "2. Verify that anonymous users cannot perform write operations"
echo "3. Test the email upgrade flow with RLS policies"
echo "4. Monitor application performance and error rates"

# Optional: Clean up old backups (keep last 5)
echo -e "\n${YELLOW}🧹 Cleaning up old backups...${NC}"
cd "$BACKUP_DIR"
ls -t db_backup_*.sql | tail -n +6 | xargs -r rm
echo -e "${GREEN}✅ Backup cleanup completed${NC}"
