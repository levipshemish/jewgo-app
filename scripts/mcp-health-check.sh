#!/bin/bash

# MCP Health Check Script
# Monitors the health and status of all MCP servers

set -e

echo "🏥 Running MCP health check..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Variables to track health status
OVERALL_HEALTHY=true
TSC_HEALTHY=false
ESLINT_HEALTHY=false
CI_GUARD_HEALTHY=false
SCHEMA_DRIFT_HEALTHY=false

# Check TypeScript MCP server
check_tsc_server() {
    print_status "Checking TypeScript MCP server..."
    
    if [ ! -f "tools/ts-next-strict-mcp/dist/index.js" ]; then
        print_error "TypeScript MCP server not found"
        OVERALL_HEALTHY=false
        return
    fi
    
    # Test TypeScript check
    if echo '{"type":"tool","name":"tsc_check","params":{"cwd":"frontend"}}' | timeout 10s node tools/ts-next-strict-mcp/dist/index.js > /dev/null 2>&1; then
        print_success "TypeScript MCP server is healthy"
        TSC_HEALTHY=true
    else
        print_error "TypeScript MCP server is not responding"
        OVERALL_HEALTHY=false
    fi
}

# Check ESLint functionality
check_eslint_server() {
    print_status "Checking ESLint functionality..."
    
    if [ ! -f "tools/ts-next-strict-mcp/dist/index.js" ]; then
        print_error "ESLint MCP server not found"
        OVERALL_HEALTHY=false
        return
    fi
    
    # Test ESLint check
    if echo '{"type":"tool","name":"eslint_check","params":{"cwd":"frontend","pattern":"app/**/*.tsx"}}' | timeout 10s node tools/ts-next-strict-mcp/dist/index.js > /dev/null 2>&1; then
        print_success "ESLint functionality is healthy"
        ESLINT_HEALTHY=true
    else
        print_error "ESLint functionality is not responding"
        OVERALL_HEALTHY=false
    fi
}

# Check CI Guard MCP server
check_ci_guard_server() {
    print_status "Checking CI Guard MCP server..."
    
    if [ ! -f "tools/ci-guard-mcp/dist/index.js" ]; then
        print_error "CI Guard MCP server not found"
        OVERALL_HEALTHY=false
        return
    fi
    
    # Test CI Guard check
    if echo '{"type":"tool","name":"premerge_guard","params":{"cwd":"frontend","budgets":{"mainKB":500,"initialTotalMB":2}}}' | timeout 30s node tools/ci-guard-mcp/dist/index.js > /dev/null 2>&1; then
        print_success "CI Guard MCP server is healthy"
        CI_GUARD_HEALTHY=true
    else
        print_error "CI Guard MCP server is not responding"
        OVERALL_HEALTHY=false
    fi
}

# Check Schema Drift MCP server
check_schema_drift_server() {
    print_status "Checking Schema Drift MCP server..."
    
    if ! command -v schema-drift-mcp &> /dev/null; then
        print_error "Schema Drift MCP server not found"
        OVERALL_HEALTHY=false
        return
    fi
    
    # Test Schema Drift check (without database connection)
    if timeout 10s schema-drift-mcp --help > /dev/null 2>&1; then
        print_success "Schema Drift MCP server is healthy"
        SCHEMA_DRIFT_HEALTHY=true
    else
        print_error "Schema Drift MCP server is not responding"
        OVERALL_HEALTHY=false
    fi
}

# Check file permissions
check_permissions() {
    print_status "Checking file permissions..."
    
    # Check TypeScript server permissions
    if [ -f "tools/ts-next-strict-mcp/dist/index.js" ]; then
        if [ -x "tools/ts-next-strict-mcp/dist/index.js" ]; then
            print_success "TypeScript server has execute permissions"
        else
            print_warning "TypeScript server missing execute permissions"
            chmod +x tools/ts-next-strict-mcp/dist/index.js
            print_success "Fixed TypeScript server permissions"
        fi
    fi
    
    # Check CI Guard server permissions
    if [ -f "tools/ci-guard-mcp/dist/index.js" ]; then
        if [ -x "tools/ci-guard-mcp/dist/index.js" ]; then
            print_success "CI Guard server has execute permissions"
        else
            print_warning "CI Guard server missing execute permissions"
            chmod +x tools/ci-guard-mcp/dist/index.js
            print_success "Fixed CI Guard server permissions"
        fi
    fi
}

# Check Cursor configuration
check_cursor_config() {
    print_status "Checking Cursor MCP configuration..."
    
    CURSOR_CONFIG="$HOME/.cursor/mcp.json"
    
    if [ -f "$CURSOR_CONFIG" ]; then
        if jq -e '.mcpServers' "$CURSOR_CONFIG" > /dev/null 2>&1; then
            print_success "Cursor MCP configuration is valid"
            
            # Check if our servers are configured
            if jq -e '.mcpServers["ts-next-strict"]' "$CURSOR_CONFIG" > /dev/null 2>&1; then
                print_success "TypeScript server configured in Cursor"
            else
                print_warning "TypeScript server not configured in Cursor"
            fi
            
            if jq -e '.mcpServers["ci-guard"]' "$CURSOR_CONFIG" > /dev/null 2>&1; then
                print_success "CI Guard server configured in Cursor"
            else
                print_warning "CI Guard server not configured in Cursor"
            fi
            
            if jq -e '.mcpServers["schema-drift"]' "$CURSOR_CONFIG" > /dev/null 2>&1; then
                print_success "Schema Drift server configured in Cursor"
            else
                print_warning "Schema Drift server not configured in Cursor"
            fi
        else
            print_error "Cursor MCP configuration is invalid"
        fi
    else
        print_warning "Cursor MCP configuration not found"
        echo "  Run './scripts/mcp-setup.sh' to create configuration"
    fi
}

# Check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js: $NODE_VERSION"
    else
        print_error "Node.js not found"
        OVERALL_HEALTHY=false
    fi
    
    # Check pnpm
    if command -v pnpm &> /dev/null; then
        PNPM_VERSION=$(pnpm --version)
        print_success "pnpm: $PNPM_VERSION"
    else
        print_error "pnpm not found"
        OVERALL_HEALTHY=false
    fi
    
    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version)
        print_success "Python: $PYTHON_VERSION"
    else
        print_error "Python 3 not found"
        OVERALL_HEALTHY=false
    fi
    
    # Check pipx
    if command -v pipx &> /dev/null; then
        PIPX_VERSION=$(pipx --version | head -n1)
        print_success "pipx: $PIPX_VERSION"
    else
        print_warning "pipx not found"
    fi
    
    # Check jq
    if command -v jq &> /dev/null; then
        JQ_VERSION=$(jq --version)
        print_success "jq: $JQ_VERSION"
    else
        print_warning "jq not found (required for JSON parsing)"
    fi
}

# Generate health report
generate_health_report() {
    echo ""
    echo "=========================================="
    echo "    MCP Health Check Report"
    echo "=========================================="
    echo ""
    
    echo "Server Status:"
    if [ "$TSC_HEALTHY" = true ]; then
        echo -e "  ✅ TypeScript MCP: ${GREEN}HEALTHY${NC}"
    else
        echo -e "  ❌ TypeScript MCP: ${RED}UNHEALTHY${NC}"
    fi
    
    if [ "$ESLINT_HEALTHY" = true ]; then
        echo -e "  ✅ ESLint MCP: ${GREEN}HEALTHY${NC}"
    else
        echo -e "  ❌ ESLint MCP: ${RED}UNHEALTHY${NC}"
    fi
    
    if [ "$CI_GUARD_HEALTHY" = true ]; then
        echo -e "  ✅ CI Guard MCP: ${GREEN}HEALTHY${NC}"
    else
        echo -e "  ❌ CI Guard MCP: ${RED}UNHEALTHY${NC}"
    fi
    
    if [ "$SCHEMA_DRIFT_HEALTHY" = true ]; then
        echo -e "  ✅ Schema Drift MCP: ${GREEN}HEALTHY${NC}"
    else
        echo -e "  ❌ Schema Drift MCP: ${RED}UNHEALTHY${NC}"
    fi
    
    echo ""
    
    if [ "$OVERALL_HEALTHY" = true ]; then
        print_success "All MCP servers are healthy!"
        echo ""
        echo "✅ MCP system is ready for use."
    else
        print_error "Some MCP servers are unhealthy!"
        echo ""
        echo "❌ MCP system needs attention."
        echo ""
        echo "Troubleshooting steps:"
        echo "1. Run './scripts/mcp-setup.sh' to reinstall servers"
        echo "2. Check server logs for errors"
        echo "3. Verify all dependencies are installed"
        echo "4. Restart Cursor to reload MCP configuration"
        exit 1
    fi
}

# Main execution
main() {
    echo "=========================================="
    echo "    MCP Health Check"
    echo "=========================================="
    echo ""
    
    check_dependencies
    check_permissions
    check_tsc_server
    check_eslint_server
    check_ci_guard_server
    check_schema_drift_server
    check_cursor_config
    
    generate_health_report
}

# Run main function
main "$@"
