#!/bin/bash

# Update Monitoring Endpoints Script
# This script updates all monitoring configurations to use correct API endpoints with trailing slashes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Updating Monitoring Endpoints${NC}"
echo -e "${BLUE}================================${NC}"

# Function to backup files
backup_file() {
    local file=$1
    if [ -f "$file" ]; then
        cp "$file" "${file}.backup.$(date +%Y%m%d_%H%M%S)"
        echo -e "${YELLOW}📁 Backed up: $file${NC}"
    fi
}

# Function to update endpoint in file
update_endpoint() {
    local file=$1
    local old_pattern=$2
    local new_pattern=$3
    
    if [ -f "$file" ]; then
        if grep -q "$old_pattern" "$file"; then
            sed -i "s|$old_pattern|$new_pattern|g" "$file"
            echo -e "${GREEN}✅ Updated: $file${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  Pattern not found in: $file${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ File not found: $file${NC}"
        return 1
    fi
}

# Update Prometheus configuration
echo -e "${BLUE}📊 Updating Prometheus configuration...${NC}"
backup_file "monitoring/prometheus.yml"

# Add new health endpoints to Prometheus if not already present
if ! grep -q "api/v5/auth/health/" monitoring/prometheus.yml; then
    # Find the targets section and add new endpoints
    sed -i '/- https:\/\/api\.jewgo\.app\/webhook\/status/a\         - https://api.jewgo.app/api/v5/auth/health/\n         - https://api.jewgo.app/api/v5/search/health/\n         - https://api.jewgo.app/api/v5/monitoring/health/\n         - https://api.jewgo.app/api/v5/metrics/health/' monitoring/prometheus.yml
    echo -e "${GREEN}✅ Added new health endpoints to Prometheus${NC}"
fi

# Update frontend monitoring configuration
echo -e "${BLUE}🌐 Updating frontend monitoring configuration...${NC}"
backup_file "frontend/config/monitoring.json"

# Add API health endpoints to frontend monitoring
if ! grep -q "api.jewgo.app" frontend/config/monitoring.json; then
    # Add API endpoints to the monitoring configuration
    sed -i '/"https:\/\/jewgo-app-oyoh\.onrender\.com\/health"/a\        "https://api.jewgo.app/healthz",\n        "https://api.jewgo.app/api/v5/auth/health/",\n        "https://api.jewgo.app/api/v5/search/health/",\n        "https://api.jewgo.app/api/v5/monitoring/health/"' frontend/config/monitoring.json
    echo -e "${GREEN}✅ Added API health endpoints to frontend monitoring${NC}"
fi

# Update monitoring scripts
echo -e "${BLUE}🔧 Updating monitoring scripts...${NC}"

# Update start-monitoring.sh
if ! grep -q "api/v5/auth/health/" monitoring/start-monitoring.sh; then
    backup_file "monitoring/start-monitoring.sh"
    
    # Add API health checks to the end of the health check section
    cat >> monitoring/start-monitoring.sh << 'EOF'

# Check JewGo API health endpoints (if available)
echo "🔍 Checking JewGo API health endpoints..."
if command -v curl > /dev/null; then
    API_BASE=${API_BASE:-"https://api.jewgo.app"}
    
    # Check basic health
    echo -n "Checking API healthz... "
    if curl -s -f "$API_BASE/healthz" > /dev/null 2>&1; then
        echo "✅ API healthz is healthy"
    else
        echo "❌ API healthz is not responding"
    fi
    
    # Check v5 auth health
    echo -n "Checking API v5 auth health... "
    if curl -s -f "$API_BASE/api/v5/auth/health/" > /dev/null 2>&1; then
        echo "✅ API v5 auth health is healthy"
    else
        echo "❌ API v5 auth health is not responding"
    fi
    
    # Check v5 search health
    echo -n "Checking API v5 search health... "
    if curl -s -f "$API_BASE/api/v5/search/health/" > /dev/null 2>&1; then
        echo "✅ API v5 search health is healthy"
    else
        echo "❌ API v5 search health is not responding"
    fi
fi
EOF
    echo -e "${GREEN}✅ Updated start-monitoring.sh${NC}"
fi

# Create health check script if it doesn't exist
if [ ! -f "scripts/health-check.sh" ]; then
    echo -e "${BLUE}📝 Creating health check script...${NC}"
    cat > scripts/health-check.sh << 'EOF'
#!/bin/bash

# JewGo Health Check Script
# This script checks all health endpoints with correct trailing slashes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL=${BASE_URL:-"https://api.jewgo.app"}
TIMEOUT=${TIMEOUT:-10}
VERBOSE=${VERBOSE:-false}

# Health endpoints to check
declare -a HEALTH_ENDPOINTS=(
    "/healthz"
    "/api/v5/auth/health/"
    "/api/v5/search/health/"
    "/api/v5/monitoring/health/"
    "/api/v5/metrics/health/"
    "/api/v5/feature-flags/health/"
)

echo -e "${BLUE}🔍 JewGo Health Check${NC}"
echo -e "${BLUE}====================${NC}"
echo "Base URL: $BASE_URL"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Function to check endpoint
check_endpoint() {
    local endpoint=$1
    local url="${BASE_URL}${endpoint}"
    local status_code
    
    if [ "$VERBOSE" = "true" ]; then
        echo -n "Checking $endpoint... "
    fi
    
    # Use curl with timeout and capture status code
    status_code=$(curl -s -w "%{http_code}" -m "$TIMEOUT" "$url" 2>/dev/null | tail -c 3)
    
    if [ "$status_code" = "200" ]; then
        if [ "$VERBOSE" = "true" ]; then
            echo -e "${GREEN}✅ OK${NC}"
        else
            echo -e "${GREEN}✅${NC} $endpoint"
        fi
        return 0
    else
        if [ "$VERBOSE" = "true" ]; then
            echo -e "${RED}❌ HTTP $status_code${NC}"
        else
            echo -e "${RED}❌${NC} $endpoint - HTTP $status_code"
        fi
        return 1
    fi
}

# Check health endpoints
failed=0
for endpoint in "${HEALTH_ENDPOINTS[@]}"; do
    if ! check_endpoint "$endpoint"; then
        ((failed++))
    fi
done

echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  Total checks: ${#HEALTH_ENDPOINTS[@]}"
echo -e "  ${GREEN}Passed: $((${#HEALTH_ENDPOINTS[@]} - failed))${NC}"
echo -e "  ${RED}Failed: $failed${NC}"

if [ $failed -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All health checks passed!${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  $failed health check(s) failed${NC}"
    exit 1
fi
EOF
    chmod +x scripts/health-check.sh
    echo -e "${GREEN}✅ Created health-check.sh${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Monitoring endpoints updated successfully!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Test the health check script: ./scripts/health-check.sh"
echo "2. Restart monitoring services if needed"
echo "3. Verify endpoints in Grafana/Prometheus dashboards"
echo ""
echo -e "${YELLOW}Note: Backup files created with timestamp suffix${NC}"
