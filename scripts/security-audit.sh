#!/bin/bash

# =============================================================================
# Security Audit Script for JewGo Application
# =============================================================================
# This script checks for common security issues and potential secret leaks

echo "🔒 JewGo Security Audit"
echo "======================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any issues are found
ISSUES_FOUND=0

echo
echo "1. 🔍 Checking for committed secrets..."

# Check for potential Supabase keys
echo "   Checking for Supabase keys..."
if git log --all --grep="supabase" --oneline | head -5; then
    echo -e "${YELLOW}   ⚠️  Found Supabase-related commits${NC}"
fi

# Check for common secret patterns
echo "   Checking for common secret patterns..."
PATTERNS=(
    "sk_live_"
    "sk_test_"
    "eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*"
    "AKIA[0-9A-Z]{16}"
    "-----BEGIN.*PRIVATE KEY-----"
    "postgres://.*:.*@.*"
    "mongodb://.*:.*@.*"
    "redis://.*:.*@.*"
)

for pattern in "${PATTERNS[@]}"; do
    if git log --all -S"$pattern" --oneline | head -3; then
        echo -e "${RED}   🚨 Potential secret pattern found: $pattern${NC}"
        ISSUES_FOUND=1
    fi
done

echo
echo "2. 📁 Checking .gitignore coverage..."

# Check if critical files are gitignored
REQUIRED_IGNORES=(
    ".env"
    ".env.local" 
    ".env.*.local"
    "*.key"
    "*.pem"
)

for ignore in "${REQUIRED_IGNORES[@]}"; do
    if grep -q "$ignore" .gitignore; then
        echo -e "   ${GREEN}✅ $ignore is gitignored${NC}"
    else
        echo -e "   ${RED}❌ $ignore is NOT gitignored${NC}"
        ISSUES_FOUND=1
    fi
done

echo
echo "3. 🌐 Checking for hardcoded URLs and credentials..."

# Check for hardcoded credentials in code
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | \
    grep -v node_modules | \
    xargs grep -l -i -E "(password|secret|key|token).*=.*['\"][^'\"]*['\"]" | \
    head -5 | \
    while read file; do
        echo -e "   ${YELLOW}⚠️  Potential hardcoded credential in: $file${NC}"
        ISSUES_FOUND=1
    done

echo
echo "4. 🔐 Checking environment files..."

# List all environment files
echo "   Environment files found:"
find . -name ".env*" -not -path "./node_modules/*" | while read file; do
    if [[ -f "$file" ]]; then
        if git check-ignore "$file" >/dev/null 2>&1; then
            echo -e "   ${GREEN}✅ $file (gitignored)${NC}"
        else
            echo -e "   ${RED}❌ $file (NOT gitignored!)${NC}"
            ISSUES_FOUND=1
        fi
    fi
done

echo
echo "5. 🛡️ Checking security headers implementation..."

# Check if security middleware exists
if [[ -f "middleware-security.ts" ]]; then
    echo -e "   ${GREEN}✅ Security middleware found${NC}"
else
    echo -e "   ${RED}❌ Security middleware missing${NC}"
    ISSUES_FOUND=1
fi

# Check if CSP is implemented
if grep -q "Content-Security-Policy" middleware-security.ts 2>/dev/null; then
    echo -e "   ${GREEN}✅ CSP headers implemented${NC}"
else
    echo -e "   ${YELLOW}⚠️  CSP headers not found${NC}"
fi

echo
echo "6. 🔄 Checking for rate limiting..."

if grep -q "ratelimit" package.json 2>/dev/null; then
    echo -e "   ${GREEN}✅ Rate limiting dependency found${NC}"
else
    echo -e "   ${YELLOW}⚠️  Rate limiting dependency not found${NC}"
fi

echo
echo "7. 🍪 Checking cookie security..."

if grep -q "httpOnly.*true" lib/supabase/server.ts 2>/dev/null; then
    echo -e "   ${GREEN}✅ HttpOnly cookies implemented${NC}"
else
    echo -e "   ${YELLOW}⚠️  HttpOnly cookies not found${NC}"
fi

echo
echo "======================="
echo "🔒 Security Audit Complete"

if [[ $ISSUES_FOUND -eq 0 ]]; then
    echo -e "${GREEN}✅ No critical security issues found!${NC}"
    exit 0
else
    echo -e "${RED}❌ Security issues found - please review and fix${NC}"
    echo
    echo "🔧 Recommended actions:"
    echo "1. Rotate any leaked secrets immediately"
    echo "2. Add missing files to .gitignore"
    echo "3. Review hardcoded credentials"
    echo "4. Set up proper environment variable management"
    echo "5. Implement missing security features"
    exit 1
fi
