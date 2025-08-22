# MCP Automation Scripts

This directory contains automation scripts for Model Context Protocol (MCP) workflows in the JewGo project.

## 📋 Available Scripts

### Setup and Installation

- **`mcp-setup.sh`** - Complete MCP server installation and configuration
- **`mcp-health-check.sh`** - Health monitoring for all MCP servers
- **`mcp-schema-check.sh`** - Database schema drift detection

### Validation Scripts

- **`mcp-pre-commit.sh`** - Pre-commit validation (TypeScript + ESLint)
- **`mcp-pre-merge.sh`** - Pre-merge validation (comprehensive checks)

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Install and configure all MCP servers
pnpm mcp:setup

# Verify installation
pnpm mcp:health
```

### 2. Development Workflow

```bash
# Before committing code
pnpm mcp:pre-commit

# Before merging pull requests
pnpm mcp:pre-merge

# Check database schema
pnpm mcp:schema-check
```

### 3. Maintenance

```bash
# Update all MCP servers
pnpm mcp:update

# Reset MCP installation
pnpm mcp:reset

# Check system health
pnpm mcp:health
```

## 📖 Script Details

### `mcp-setup.sh`

**Purpose**: Complete MCP server installation and configuration

**Features**:
- Checks prerequisites (Node.js, Python, pnpm, pipx)
- Installs TypeScript MCP servers
- Installs Python MCP server
- Verifies installation
- Tests all servers
- Configures Cursor integration

**Usage**:
```bash
./scripts/mcp-setup.sh
```

**Output**:
```
==========================================
    JewGo MCP Setup Script
==========================================

[INFO] Checking prerequisites...
[SUCCESS] All prerequisites are satisfied
[INFO] Installing TypeScript MCP servers...
[SUCCESS] TypeScript MCP servers installed successfully
[INFO] Installing Python MCP server...
[SUCCESS] Python MCP server installed successfully
[INFO] Verifying MCP installation...
[SUCCESS] All MCP servers are properly installed
[INFO] Testing MCP servers...
[SUCCESS] MCP server tests completed
[INFO] Setting up Cursor MCP configuration...
[SUCCESS] Cursor MCP configuration created at /Users/user/.cursor/mcp.json

==========================================
[SUCCESS] MCP setup completed successfully!
==========================================
```

### `mcp-pre-commit.sh`

**Purpose**: Pre-commit validation for code quality

**Checks**:
- TypeScript strict type checking
- ESLint with auto-fix
- Database change detection

**Usage**:
```bash
pnpm mcp:pre-commit
```

**Output**:
```
==========================================
    MCP Pre-Commit Validation
==========================================

[INFO] Running TypeScript strict check...
[SUCCESS] TypeScript check passed
[INFO] Running ESLint check...
[SUCCESS] ESLint check passed
[INFO] Checking for database changes...

==========================================
    MCP Pre-Commit Validation Report
==========================================

✅ TypeScript Check: PASSED
✅ ESLint Check: PASSED

[SUCCESS] All MCP pre-commit checks passed!

You can now commit your changes safely.
```

### `mcp-pre-merge.sh`

**Purpose**: Comprehensive pre-merge validation

**Checks**:
- TypeScript strict type checking
- ESLint validation
- CI Guard with performance budgets
- Schema drift detection
- Health endpoint verification

**Usage**:
```bash
pnpm mcp:pre-merge
```

**Environment Variables**:
```bash
export FE_HEALTH_URL="https://jewgo-app.vercel.app/health"
export BE_HEALTH_URL="https://jewgo-app-oyoh.onrender.com/health"
export DATABASE_URL="postgresql+psycopg://user:pass@host:5432/db"
```

**Output**:
```
==========================================
    MCP Pre-Merge Validation
==========================================

[INFO] Running TypeScript strict check...
[SUCCESS] TypeScript check passed
[INFO] Running ESLint check...
[SUCCESS] ESLint check passed
[INFO] Running CI Guard check...
[SUCCESS] CI Guard check passed
  Performance metrics:
    - Main bundle: 450KB
    - Initial load: 1.8MB
[INFO] Running Schema Drift check...
[SUCCESS] Schema drift check passed

==========================================
    MCP Pre-Merge Validation Report
==========================================

✅ TypeScript Check: PASSED
✅ ESLint Check: PASSED
✅ CI Guard Check: PASSED
✅ Schema Drift Check: PASSED

[SUCCESS] All MCP pre-merge checks passed!

✅ This branch is ready for merge.
```

### `mcp-health-check.sh`

**Purpose**: Health monitoring for all MCP servers

**Checks**:
- Server availability
- File permissions
- Cursor configuration
- Dependencies
- Server responsiveness

**Usage**:
```bash
pnpm mcp:health
```

**Output**:
```
==========================================
    MCP Health Check
==========================================

[INFO] Checking dependencies...
[SUCCESS] Node.js: v20.15.0
[SUCCESS] pnpm: 8.15.0
[SUCCESS] Python: Python 3.11.8
[SUCCESS] pipx: 1.2.0
[SUCCESS] jq: jq-1.6
[INFO] Checking file permissions...
[SUCCESS] TypeScript server has execute permissions
[SUCCESS] CI Guard server has execute permissions
[INFO] Checking TypeScript MCP server...
[SUCCESS] TypeScript MCP server is healthy
[INFO] Checking ESLint functionality...
[SUCCESS] ESLint functionality is healthy
[INFO] Checking CI Guard MCP server...
[SUCCESS] CI Guard MCP server is healthy
[INFO] Checking Schema Drift MCP server...
[SUCCESS] Schema Drift MCP server is healthy
[INFO] Checking Cursor MCP configuration...
[SUCCESS] Cursor MCP configuration is valid
[SUCCESS] TypeScript server configured in Cursor
[SUCCESS] CI Guard server configured in Cursor
[SUCCESS] Schema Drift server configured in Cursor

==========================================
    MCP Health Check Report
==========================================

Server Status:
  ✅ TypeScript MCP: HEALTHY
  ✅ ESLint MCP: HEALTHY
  ✅ CI Guard MCP: HEALTHY
  ✅ Schema Drift MCP: HEALTHY

[SUCCESS] All MCP servers are healthy!

✅ MCP system is ready for use.
```

### `mcp-schema-check.sh`

**Purpose**: Database schema drift detection

**Features**:
- Compares SQLAlchemy models with live database
- Detects schema differences
- Provides detailed reports
- Suggests migration steps

**Usage**:
```bash
# Set database URL
export DATABASE_URL="postgresql+psycopg://user:pass@host:5432/db"

# Run schema check
pnpm mcp:schema-check
```

**Output**:
```
==========================================
    MCP Schema Drift Check
==========================================

[SUCCESS] Database URL is configured
[INFO] Running schema drift check...
[SUCCESS] Schema drift check completed successfully
[WARNING] Found 2 schema differences

Schema differences:
  - restaurants: COLUMN_ADDED - New column 'delivery_radius'
  - users: COLUMN_MODIFIED - Column 'email' type changed

Recommendations:
1. Review the differences above
2. Create a migration if needed
3. Test the migration in staging first
4. Apply the migration to production

==========================================
    Schema Drift Check Report
==========================================

Database: production-db
Metadata Module: backend.database.models

Status: ❌ Schema drift detected (2 differences)

Detailed differences:
  Table: restaurants
  Type: COLUMN_ADDED
  Description: New column 'delivery_radius'

  Table: users
  Type: COLUMN_MODIFIED
  Description: Column 'email' type changed
```

## 🔧 Package.json Scripts

The following npm scripts are available for easy access:

```json
{
  "scripts": {
    "mcp:setup": "chmod +x scripts/mcp-*.sh && ./scripts/mcp-setup.sh",
    "mcp:pre-commit": "./scripts/mcp-pre-commit.sh",
    "mcp:pre-merge": "./scripts/mcp-pre-merge.sh",
    "mcp:health": "./scripts/mcp-health-check.sh",
    "mcp:schema-check": "./scripts/mcp-schema-check.sh",
    "mcp:update": "pnpm -C tools/ts-next-strict-mcp update && pnpm -C tools/ci-guard-mcp update && pipx upgrade schema-drift-mcp",
    "mcp:cleanup": "rm -rf tools/*/node_modules tools/*/dist",
    "mcp:reset": "pnpm mcp:cleanup && pnpm mcp:setup"
  }
}
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. MCP Servers Not Found

**Error**: `MCP servers not found. Please run './scripts/mcp-setup.sh' first.`

**Solution**:
```bash
pnpm mcp:setup
```

#### 2. Permission Errors

**Error**: `Permission denied` when running scripts

**Solution**:
```bash
chmod +x scripts/mcp-*.sh
```

#### 3. Schema Drift MCP Not Found

**Error**: `schema-drift-mcp not found`

**Solution**:
```bash
pipx install -e tools/schema-drift-mcp
```

#### 4. Cursor Configuration Issues

**Error**: `Cursor MCP configuration not found`

**Solution**:
```bash
pnpm mcp:setup
# Then restart Cursor
```

#### 5. Database Connection Issues

**Error**: `DATABASE_URL environment variable is not set`

**Solution**:
```bash
export DATABASE_URL="your-database-url"
pnpm mcp:schema-check
```

### Reset MCP Installation

If you encounter persistent issues, you can reset the entire MCP installation:

```bash
pnpm mcp:reset
```

This will:
1. Clean up all MCP server installations
2. Reinstall all servers
3. Reconfigure Cursor integration
4. Test all functionality

## 📊 Integration with CI/CD

These scripts are for local development only and are NOT used in CI/CD pipelines:

- **Triggers**: Push to main/develop, Pull requests
- **Checks**: TypeScript, ESLint, CI Guard, Schema Drift
- **Artifacts**: MCP validation results
- **Failure**: Blocks merge on critical errors

## 🔒 Security Considerations

- Never commit sensitive database URLs
- Use environment variables for configuration
- MCP servers don't log sensitive information
- Validate all inputs before processing

## 📈 Performance Monitoring

The scripts include performance monitoring:

- Bundle size limits (500KB main, 2MB initial)
- Build time monitoring (< 30s)
- Health check response times (< 2s)
- Schema drift detection

## 🤝 Contributing

When adding new MCP scripts:

1. Follow the existing naming convention (`mcp-*.sh`)
2. Include proper error handling and cleanup
3. Add colored output for better UX
4. Document the script in this README
5. Add corresponding npm script in package.json
6. Test thoroughly before committing

## 📚 Related Documentation

- [MCP Standards](../docs/MCP_STANDARDS.md)
- [Development Workflow](../docs/DEVELOPMENT_WORKFLOW.md)
- [Contributing Guidelines](../docs/CONTRIBUTING.md)
- [Local Development Only] MCP tools are not used in CI/CD
