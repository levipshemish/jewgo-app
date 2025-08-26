#!/bin/bash

# Admin Development Setup Script
# This script helps set up environment variables for admin role testing

set -e

FRONTEND_DIR="frontend"
ENV_FILE="$FRONTEND_DIR/.env.local"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Admin Development Setup${NC}"
echo "This script helps you set up admin role testing for local development."
echo ""

# Check if we're in the right directory
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Error: frontend directory not found${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Create .env.local if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}📝 Creating .env.local file...${NC}"
    touch "$ENV_FILE"
fi

echo -e "${BLUE}Available options:${NC}"
echo "1) system_admin - Full system access (recommended for most testing)"
echo "2) data_admin   - Data management access (restaurants, users, bulk operations)"
echo "3) moderator    - Basic moderation access (restaurants, reviews)"
echo "4) super_admin  - Complete bypass (all permissions)"
echo "5) Remove overrides (production-like behavior)"
echo ""

read -p "Choose an option (1-5): " choice

case $choice in
    1)
        echo -e "${GREEN}✅ Setting up system_admin role...${NC}"
        # Remove any existing admin overrides
        sed -i.bak '/^ADMIN_DEFAULT_ROLE=/d' "$ENV_FILE"
        sed -i.bak '/^ADMIN_BYPASS_PERMS=/d' "$ENV_FILE"
        echo "ADMIN_DEFAULT_ROLE=system_admin" >> "$ENV_FILE"
        echo -e "${GREEN}✅ Added ADMIN_DEFAULT_ROLE=system_admin to .env.local${NC}"
        ;;
    2)
        echo -e "${GREEN}✅ Setting up data_admin role...${NC}"
        sed -i.bak '/^ADMIN_DEFAULT_ROLE=/d' "$ENV_FILE"
        sed -i.bak '/^ADMIN_BYPASS_PERMS=/d' "$ENV_FILE"
        echo "ADMIN_DEFAULT_ROLE=data_admin" >> "$ENV_FILE"
        echo -e "${GREEN}✅ Added ADMIN_DEFAULT_ROLE=data_admin to .env.local${NC}"
        ;;
    3)
        echo -e "${GREEN}✅ Setting up moderator role...${NC}"
        sed -i.bak '/^ADMIN_DEFAULT_ROLE=/d' "$ENV_FILE"
        sed -i.bak '/^ADMIN_BYPASS_PERMS=/d' "$ENV_FILE"
        echo "ADMIN_DEFAULT_ROLE=moderator" >> "$ENV_FILE"
        echo -e "${GREEN}✅ Added ADMIN_DEFAULT_ROLE=moderator to .env.local${NC}"
        ;;
    4)
        echo -e "${GREEN}✅ Setting up super_admin bypass...${NC}"
        sed -i.bak '/^ADMIN_DEFAULT_ROLE=/d' "$ENV_FILE"
        sed -i.bak '/^ADMIN_BYPASS_PERMS=/d' "$ENV_FILE"
        echo "ADMIN_BYPASS_PERMS=true" >> "$ENV_FILE"
        echo -e "${GREEN}✅ Added ADMIN_BYPASS_PERMS=true to .env.local${NC}"
        ;;
    5)
        echo -e "${YELLOW}🗑️  Removing admin overrides...${NC}"
        sed -i.bak '/^ADMIN_DEFAULT_ROLE=/d' "$ENV_FILE"
        sed -i.bak '/^ADMIN_BYPASS_PERMS=/d' "$ENV_FILE"
        echo -e "${GREEN}✅ Removed admin overrides from .env.local${NC}"
        ;;
    *)
        echo -e "${RED}❌ Invalid option. Please run the script again.${NC}"
        exit 1
        ;;
esac

# Clean up backup files
rm -f "$ENV_FILE.bak"

echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Restart your development server:"
echo "   cd frontend && npm run dev"
echo ""
echo "2. Test the admin features:"
echo "   - Navigate to /admin/database/users"
echo "   - Check that you can access the features for your chosen role"
echo ""
echo -e "${YELLOW}⚠️  Security Note:${NC}"
echo "These overrides only work in development mode (NODE_ENV=development)"
echo "They are completely ignored in production environments."
echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
