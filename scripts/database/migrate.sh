#!/bin/bash

# Database Migration Orchestrator Wrapper
# =======================================
#
# This script provides a simple interface to the migration orchestrator.
#
# Usage:
#   ./migrate.sh [command] [options]
#
# Commands:
#   list                    List all available migrations
#   run <migration> <category>  Run a specific migration
#   run-all [category]      Run all pending migrations
#   status                  Show migration status
#   rollback <migration> <category>  Rollback a specific migration
#   verify <migration> <category>  Verify a migration
#   dry-run <migration> <category>  Test migration without applying
#   backup                  Create database backup
#   help                    Show this help message

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ORCHESTRATOR_SCRIPT="$SCRIPT_DIR/migration_orchestrator.py"
CONFIG_FILE="$SCRIPT_DIR/migration_config.json"

# Check if orchestrator script exists
if [ ! -f "$ORCHESTRATOR_SCRIPT" ]; then
    echo -e "${RED}❌ Migration orchestrator script not found: $ORCHESTRATOR_SCRIPT${NC}"
    exit 1
fi

# Function to show help
show_help() {
    echo -e "${BLUE}Database Migration Orchestrator${NC}"
    echo "======================================"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  list                    List all available migrations"
    echo "  run <migration> <category>  Run a specific migration"
    echo "  run-all [category]      Run all pending migrations"
    echo "  status                  Show migration status"
    echo "  rollback <migration> <category>  Rollback a specific migration"
    echo "  verify <migration> <category>  Verify a migration"
    echo "  dry-run <migration> <category>  Test migration without applying"
    echo "  backup                  Create database backup"
    echo "  help                    Show this help message"
    echo ""
    echo "Categories:"
    echo "  backend                 Backend Python migrations"
    echo "  supabase                Supabase SQL migrations"
    echo "  prisma                  Prisma migrations"
    echo "  deployment              Deployment scripts"
    echo "  maintenance             Database maintenance scripts"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 run create_marketplace_unified backend"
    echo "  $0 run-all backend"
    echo "  $0 status"
    echo "  $0 dry-run create_marketplace_unified backend"
    echo ""
}

# Function to check if Python is available
check_python() {
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python 3 is required but not installed${NC}"
        exit 1
    fi
}

# Function to check if DATABASE_URL is set
check_database_url() {
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${YELLOW}⚠️  Warning: DATABASE_URL environment variable is not set${NC}"
        echo "   Some migrations may fail without proper database connection"
        echo ""
    fi
}

# Function to run the orchestrator
run_orchestrator() {
    local cmd="$1"
    shift
    
    echo -e "${BLUE}🔧 Running migration orchestrator: $cmd${NC}"
    echo ""
    
    python3 "$ORCHESTRATOR_SCRIPT" "$cmd" "$@"
}

# Main script logic
main() {
    # Check prerequisites
    check_python
    check_database_url
    
    # Parse command
    case "${1:-help}" in
        "list")
            if [ $# -ge 2 ]; then
                run_orchestrator "list" "--category" "$2"
            else
                run_orchestrator "list"
            fi
            ;;
        "run")
            if [ $# -lt 3 ]; then
                echo -e "${RED}❌ Error: 'run' command requires migration name and category${NC}"
                echo "Usage: $0 run <migration_name> <category>"
                exit 1
            fi
            run_orchestrator "run" "--migration" "$2" "--category" "$3"
            ;;
        "run-all")
            if [ $# -ge 2 ]; then
                run_orchestrator "run-all" "--category" "$2"
            else
                run_orchestrator "run-all"
            fi
            ;;
        "status")
            run_orchestrator "status"
            ;;
        "rollback")
            if [ $# -lt 3 ]; then
                echo -e "${RED}❌ Error: 'rollback' command requires migration name and category${NC}"
                echo "Usage: $0 rollback <migration_name> <category>"
                exit 1
            fi
            run_orchestrator "rollback" "--migration" "$2" "--category" "$3"
            ;;
        "verify")
            if [ $# -lt 3 ]; then
                echo -e "${RED}❌ Error: 'verify' command requires migration name and category${NC}"
                echo "Usage: $0 verify <migration_name> <category>"
                exit 1
            fi
            run_orchestrator "verify" "--migration" "$2" "--category" "$3"
            ;;
        "dry-run")
            if [ $# -lt 3 ]; then
                echo -e "${RED}❌ Error: 'dry-run' command requires migration name and category${NC}"
                echo "Usage: $0 dry-run <migration_name> <category>"
                exit 1
            fi
            run_orchestrator "run" "--migration" "$2" "--category" "$3" "--dry-run"
            ;;
        "backup")
            echo -e "${YELLOW}⚠️  Backup functionality not yet implemented${NC}"
            echo "   Use the orchestrator directly: python3 $ORCHESTRATOR_SCRIPT backup"
            exit 1
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
