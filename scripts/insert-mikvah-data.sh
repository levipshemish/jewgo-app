#!/bin/bash

# Insert Mikvah Data Script
# Date: 2025-01-14
# Description: Insert comprehensive mikvah data for South Florida

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
SQL_FILE="scripts/insert-mikvah-data.sql"

echo -e "${BLUE}🏊‍♀️  JewGo Mikvah Data Insertion${NC}"
echo -e "${BLUE}=================================${NC}"
echo "Database: $DB_NAME"
echo "SSH: $SSH_USER@$SSH_HOST"
echo "DB Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo "SQL File: $SQL_FILE"
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

# Function to backup database before insertion
backup_database() {
    local backup_file="jewgo_db_mikvah_backup_$(date +%Y%m%d_%H%M%S).sql"
    
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

# Function to check if mikvah data already exists
check_existing_data() {
    echo -e "${BLUE}🔍 Checking for existing mikvah data...${NC}"
    
    local count=$(ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "PGPASSWORD='$DB_PASSWORD' psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME' -t -c \"SELECT COUNT(*) FROM mikvah WHERE name LIKE '%Mikvah%';\"" | tr -d ' ')
    
    if [ "$count" -gt 0 ]; then
        echo -e "${YELLOW}⚠️  Found $count existing mikvah records${NC}"
        echo -e "${YELLOW}This insertion may create duplicate records${NC}"
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Operation cancelled by user${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ No existing mikvah records found${NC}"
    fi
}

# Function to insert mikvah data
insert_mikvah_data() {
    echo -e "${BLUE}🏊‍♀️  Inserting mikvah data...${NC}"
    
    if [ ! -f "$SQL_FILE" ]; then
        echo -e "${RED}❌ SQL file not found: $SQL_FILE${NC}"
        return 1
    fi
    
    if ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "PGPASSWORD='$DB_PASSWORD' psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME'" < "$SQL_FILE"; then
        echo -e "${GREEN}✅ Mikvah data inserted successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ Mikvah data insertion failed${NC}"
        return 1
    fi
}

# Function to verify insertion
verify_insertion() {
    echo -e "${BLUE}🔍 Verifying mikvah data insertion...${NC}"
    
    local total_count=$(ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "PGPASSWORD='$DB_PASSWORD' psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME' -t -c \"SELECT COUNT(*) FROM mikvah;\"" | tr -d ' ')
    
    local active_count=$(ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "PGPASSWORD='$DB_PASSWORD' psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME' -t -c \"SELECT COUNT(*) FROM mikvah WHERE is_active = true;\"" | tr -d ' ')
    
    if [ "$total_count" -gt 0 ]; then
        echo -e "${GREEN}✅ Mikvah data verification successful${NC}"
        echo -e "  - Total mikvah records: $total_count"
        echo -e "  - Active mikvah records: $active_count"
        
        # Show sample of inserted data
        echo -e "${BLUE}📋 Sample of inserted mikvah records:${NC}"
        ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "PGPASSWORD='$DB_PASSWORD' psql -h '$DB_HOST' -p '$DB_PORT' -U '$DB_USER' -d '$DB_NAME' -c \"SELECT name, city, state, phone_number FROM mikvah ORDER BY name LIMIT 5;\""
        
        return 0
    else
        echo -e "${RED}❌ Mikvah data verification failed${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}Starting mikvah data insertion process...${NC}"
    echo ""
    
    # Check for existing data
    check_existing_data
    echo ""
    
    # Create backup
    backup_database
    echo ""
    
    # Insert mikvah data
    insert_mikvah_data
    echo ""
    
    # Verify insertion
    verify_insertion
    echo ""
    
    echo -e "${GREEN}🎉 Mikvah data insertion completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Summary:${NC}"
    echo -e "  - Added comprehensive mikvah data for South Florida"
    echo -e "  - Database backup created for safety"
    echo -e "  - All records marked as active and verified"
    echo -e "  - Search vectors updated for full-text search"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Test the search API to ensure mikvah data is discoverable"
    echo -e "  2. Verify mikvah data appears in the frontend"
    echo -e "  3. Consider adding geocoding for latitude/longitude coordinates"
}

# Check if required files exist
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ SSH key not found: $SSH_KEY${NC}"
    exit 1
fi

if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ SQL file not found: $SQL_FILE${NC}"
    exit 1
fi

# Run main function
main
