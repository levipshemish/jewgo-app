#!/bin/bash

# Database Restore Script for Jewgo App
# This script helps restore the database from a backup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Database configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="app_db"
DB_USER="app_user"
DB_PASSWORD="Jewgo123"

print_status "Database Restore Script for Jewgo App"

# Check if PostgreSQL is running
print_status "Checking PostgreSQL status..."
if ! sudo systemctl is-active --quiet postgresql; then
    print_error "PostgreSQL is not running. Starting it..."
    sudo systemctl start postgresql
fi

# Test database connection
print_status "Testing database connection..."
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    print_error "Cannot connect to database. Please check your configuration."
    exit 1
fi

print_success "Database connection successful"

# Function to restore from SQL file
restore_from_sql() {
    local sql_file="$1"
    
    if [[ ! -f "$sql_file" ]]; then
        print_error "SQL file not found: $sql_file"
        return 1
    fi
    
    print_status "Restoring database from: $sql_file"
    
    # Drop existing database and recreate
    print_warning "Dropping and recreating database..."
    sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    
    # Restore the database
    print_status "Restoring database schema and data..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$sql_file"
    
    # Enable PostGIS extensions
    print_status "Enabling PostGIS extensions..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
GRANT ALL ON SCHEMA public TO $DB_USER;
EOF
    
    print_success "Database restored successfully from $sql_file"
}

# Function to restore from dump file
restore_from_dump() {
    local dump_file="$1"
    
    if [[ ! -f "$dump_file" ]]; then
        print_error "Dump file not found: $dump_file"
        return 1
    fi
    
    print_status "Restoring database from dump: $dump_file"
    
    # Drop existing database and recreate
    print_warning "Dropping and recreating database..."
    sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    
    # Restore the database
    print_status "Restoring database from dump..."
    PGPASSWORD="$DB_PASSWORD" pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --clean --if-exists "$dump_file"
    
    # Enable PostGIS extensions
    print_status "Enabling PostGIS extensions..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
GRANT ALL ON SCHEMA public TO $DB_USER;
EOF
    
    print_success "Database restored successfully from $dump_file"
}

# Function to create a fresh database with schema
create_fresh_database() {
    print_status "Creating fresh database with schema..."
    
    # Drop existing database and recreate
    print_warning "Dropping and recreating database..."
    sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    
    # Enable PostGIS extensions
    print_status "Setting up PostGIS extensions..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
GRANT ALL ON SCHEMA public TO $DB_USER;
EOF
    
    # Run database migrations if they exist
    if [[ -f "/home/ubuntu/jewgo-app/backend/migrations/init.sql" ]]; then
        print_status "Running database migrations..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < /home/ubuntu/jewgo-app/backend/migrations/init.sql
    fi
    
    # Run Prisma migrations if they exist
    if [[ -d "/home/ubuntu/jewgo-app/frontend/prisma" ]]; then
        print_status "Running Prisma migrations..."
        cd /home/ubuntu/jewgo-app/frontend
        if command -v npx > /dev/null; then
            DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" npx prisma migrate deploy
        fi
    fi
    
    print_success "Fresh database created successfully"
}

# Main script logic
print_status "Database restore options:"
echo "1. Restore from SQL file"
echo "2. Restore from PostgreSQL dump file"
echo "3. Create fresh database with schema"
echo "4. Show database status"
echo ""

read -p "Choose an option (1-4): " choice

case $choice in
    1)
        read -p "Enter path to SQL file: " sql_file
        restore_from_sql "$sql_file"
        ;;
    2)
        read -p "Enter path to dump file: " dump_file
        restore_from_dump "$dump_file"
        ;;
    3)
        create_fresh_database
        ;;
    4)
        print_status "Database status:"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt"
        echo ""
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();"
        ;;
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac

# Verify the restore
print_status "Verifying database restore..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"

print_success "Database restore completed!"
print_status "You can now start your application with: docker-compose up -d"
