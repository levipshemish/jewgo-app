# MCP Servers for JewGo

This directory contains three Model Context Protocol (MCP) servers that provide immediate feedback on code quality, database schema drift, and pre-merge validation.

## Quick Setup

```bash
# Install and build all MCP servers
pnpm mcp:setup

# Or individually:
pnpm mcp:install  # Install dependencies
pnpm mcp:build    # Build TypeScript servers
```

## MCP Servers

### 1. TS/Next Strict Checker (`ts-next-strict-mcp`)

**Purpose**: Run `tsc --noEmit` + ESLint, parse output, and return structured diagnostics.

**Tools**:
- `tsc_check`: Run TypeScript type check with `--noEmit`
- `eslint_check`: Run ESLint and return issues

**Usage in Cursor**:
1. Add MCP server: `node ./tools/ts-next-strict-mcp/dist/index.js`
2. Call tools:
   ```json
   {"tool": "tsc_check", "params": {"cwd": "frontend"}}
   {"tool": "eslint_check", "params": {"cwd": "frontend", "pattern": "app/**/*.tsx", "fix": true}}
   ```

### 2. Schema Drift Detector (`schema-drift-mcp`)

**Purpose**: Compare live Postgres (Neon) vs declared models (SQLAlchemy metadata) and return a diff.

**Tools**:
- `schema_diff`: Compare declared SQLAlchemy metadata with live Postgres schema

**Usage in Cursor**:
1. Add MCP server: `schema-drift-mcp`
2. Call tool:
   ```json
   {
     "tool": "schema_diff",
     "params": {
       "db_url": "postgresql+psycopg://USER:PASSWORD@HOST:5432/DBNAME",
       "metadata_module": "backend.database.models"
     }
   }
   ```

### 3. CI Guard (`ci-guard-mcp`)

**Purpose**: Run `next build` with analyzer, enforce perf budgets, and hit health endpoints before merge.

**Tools**:
- `premerge_guard`: Run Next build, enforce perf budgets, hit FE/BE health urls

**Usage in Cursor**:
1. Add MCP server: `node ./tools/ci-guard-mcp/dist/index.js`
2. Call tool:
   ```json
   {
     "tool": "premerge_guard",
     "params": {
       "cwd": "frontend",
       "feHealthUrl": "https://jewgo-app.vercel.app/health",
       "beHealthUrl": "https://jewgo.onrender.com/health",
       "budgets": {"mainKB": 500, "initialTotalMB": 2}
     }
   }
   ```

## Cursor MCP Registration

In Cursor → Settings → **Model Context Protocol** → **Add** each server:

1. **TS/Next Strict**: `node ./tools/ts-next-strict-mcp/dist/index.js`
2. **Schema Drift**: `schema-drift-mcp`
3. **CI Guard**: `node ./tools/ci-guard-mcp/dist/index.js`

## Performance Budgets

The CI Guard enforces these performance budgets:
- **main.js**: ≤ 500KB
- **Initial Total**: ≤ 2MB
- **Health Checks**: Both FE and BE must respond within 8s

## Schema Drift Detection

The Schema Drift MCP compares:
- **Tables**: Missing/extra tables in database
- **Columns**: Missing/extra columns, type mismatches
- **Constraints**: Primary keys, unique constraints, nullability
- **Defaults**: Server-side default values

## GitHub Actions Integration

The `.github/workflows/premerge-guard.yml` workflow automatically runs these checks on PRs to `main` and `develop` branches.

## Development

### Building Individual Servers

```bash
# TypeScript servers
pnpm -C tools/ts-next-strict-mcp build
pnpm -C tools/ci-guard-mcp build

# Python server
pip install -e tools/schema-drift-mcp
```

### Testing MCP Servers

```bash
# Test TypeScript strict check
echo '{"type":"tool","name":"tsc_check","params":{"cwd":"frontend"}}' | node tools/ts-next-strict-mcp/dist/index.js

# Test ESLint check
echo '{"type":"tool","name":"eslint_check","params":{"cwd":"frontend"}}' | node tools/ts-next-strict-mcp/dist/index.js

# Test CI guard
echo '{"type":"tool","name":"premerge_guard","params":{"cwd":"frontend"}}' | node tools/ci-guard-mcp/dist/index.js
```

## Troubleshooting

### Common Issues

1. **MCP server not found**: Ensure you've run `pnpm mcp:setup`
2. **TypeScript errors**: Check that `frontend/tsconfig.json` exists and is valid
3. **Database connection**: Verify `DATABASE_URL` environment variable is set
4. **Health check failures**: Ensure both FE and BE are deployed and accessible

### Debug Mode

Add `--debug` flag to MCP server commands for verbose logging:

```bash
node ./tools/ts-next-strict-mcp/dist/index.js --debug
```

## Next Steps (P1)

Consider implementing these additional MCP servers:
- **Google Places Hours MCP**: Normalize hours data into canonical format
- **Performance Monitoring MCP**: Track Core Web Vitals and API response times
- **Security Audit MCP**: Check for vulnerable dependencies and security issues
