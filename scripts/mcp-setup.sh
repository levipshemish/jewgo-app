#!/bin/bash

# MCP Setup Script
# Installs and configures all MCP servers for the JewGo project

set -e

echo "🚀 Setting up MCP servers for JewGo..."

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

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 20.x or later."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        print_error "Node.js version 20.x or later is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed. Please install pnpm."
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed. Please install Python 3.11 or later."
        exit 1
    fi
    
    # Check pipx
    if ! command -v pipx &> /dev/null; then
        print_warning "pipx is not installed. Installing pipx..."
        if command -v brew &> /dev/null; then
            brew install pipx
        else
            print_error "Please install pipx manually: https://pypa.github.io/pipx/installation/"
            exit 1
        fi
    fi
    
    print_success "All prerequisites are satisfied"
}

# Install TypeScript MCP servers
install_typescript_servers() {
    print_status "Installing TypeScript MCP servers..."
    
    # Install ts-next-strict-mcp
    print_status "Installing ts-next-strict-mcp..."
    cd tools/ts-next-strict-mcp
    pnpm install
    pnpm build
    cd ../..
    
    # Install ci-guard-mcp
    print_status "Installing ci-guard-mcp..."
    cd tools/ci-guard-mcp
    pnpm install
    pnpm build
    cd ../..
    
    print_success "TypeScript MCP servers installed successfully"
}

# Install Python MCP server
install_python_server() {
    print_status "Installing Python MCP server..."
    
    # Install schema-drift-mcp
    print_status "Installing schema-drift-mcp..."
    pipx install -e tools/schema-drift-mcp
    
    print_success "Python MCP server installed successfully"
}

# Verify installation
verify_installation() {
    print_status "Verifying MCP installation..."
    
    # Check TypeScript servers
    if [ -f "tools/ts-next-strict-mcp/dist/index.js" ]; then
        print_success "ts-next-strict-mcp is installed"
    else
        print_error "ts-next-strict-mcp installation failed"
        exit 1
    fi
    
    if [ -f "tools/ci-guard-mcp/dist/index.js" ]; then
        print_success "ci-guard-mcp is installed"
    else
        print_error "ci-guard-mcp installation failed"
        exit 1
    fi
    
    # Check Python server
    if command -v schema-drift-mcp &> /dev/null; then
        print_success "schema-drift-mcp is installed"
    else
        print_error "schema-drift-mcp installation failed"
        exit 1
    fi
    
    print_success "All MCP servers are properly installed"
}

# Test MCP servers
test_mcp_servers() {
    print_status "Testing MCP servers..."
    
    # Test TypeScript strict check
    print_status "Testing TypeScript strict check..."
    if echo '{"type":"tool","name":"tsc_check","params":{"cwd":"frontend"}}' | node tools/ts-next-strict-mcp/dist/index.js > /dev/null 2>&1; then
        print_success "TypeScript strict check server is working"
    else
        print_warning "TypeScript strict check server test failed"
    fi
    
    # Test ESLint check
    print_status "Testing ESLint check..."
    if echo '{"type":"tool","name":"eslint_check","params":{"cwd":"frontend","pattern":"app/**/*.tsx"}}' | node tools/ts-next-strict-mcp/dist/index.js > /dev/null 2>&1; then
        print_success "ESLint check server is working"
    else
        print_warning "ESLint check server test failed"
    fi
    
    # Test CI Guard
    print_status "Testing CI Guard..."
    if echo '{"type":"tool","name":"premerge_guard","params":{"cwd":"frontend","budgets":{"mainKB":500,"initialTotalMB":2}}}' | node tools/ci-guard-mcp/dist/index.js > /dev/null 2>&1; then
        print_success "CI Guard server is working"
    else
        print_warning "CI Guard server test failed"
    fi
    
    print_success "MCP server tests completed"
}

# Setup Cursor configuration
setup_cursor_config() {
    print_status "Setting up Cursor MCP configuration..."
    
    CURSOR_CONFIG_DIR="$HOME/.cursor"
    CURSOR_CONFIG_FILE="$CURSOR_CONFIG_DIR/mcp.json"
    
    # Create .cursor directory if it doesn't exist
    mkdir -p "$CURSOR_CONFIG_DIR"
    
    # Get current project path
    PROJECT_PATH=$(pwd)
    
    # Create MCP configuration
    cat > "$CURSOR_CONFIG_FILE" << EOF
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "ts-next-strict": {
      "command": "node",
      "args": ["./tools/ts-next-strict-mcp/dist/index.js"],
      "cwd": "$PROJECT_PATH"
    },
    "schema-drift": {
      "command": "schema-drift-mcp"
    },
    "ci-guard": {
      "command": "node",
      "args": ["./tools/ci-guard-mcp/dist/index.js"],
      "cwd": "$PROJECT_PATH"
    }
  }
}
EOF
    
    print_success "Cursor MCP configuration created at $CURSOR_CONFIG_FILE"
}

# Main execution
main() {
    echo "=========================================="
    echo "    JewGo MCP Setup Script"
    echo "=========================================="
    echo ""
    
    check_prerequisites
    install_typescript_servers
    install_python_server
    verify_installation
    test_mcp_servers
    setup_cursor_config
    
    echo ""
    echo "=========================================="
    print_success "MCP setup completed successfully!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Restart Cursor to load MCP configuration"
    echo "2. Test MCP tools in Cursor"
    echo "3. Run './scripts/mcp-health-check.sh' to verify everything is working"
    echo ""
    echo "Available MCP commands:"
    echo "- pnpm mcp:strict    # Run TypeScript strict check"
    echo "- pnpm mcp:schema    # Run schema drift check"
    echo "- pnpm mcp:guard     # Run CI guard check"
    echo ""
}

# Run main function
main "$@"
