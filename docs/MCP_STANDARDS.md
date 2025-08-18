# Model Context Protocol (MCP) Standards

## Overview

Model Context Protocol (MCP) servers are AI-powered tools that enhance our development workflow by providing immediate feedback on code quality, database schema validation, and deployment readiness. This document outlines our MCP standards and best practices.

## MCP Server Architecture

### Available Servers

1. **TS/Next Strict MCP** (`tools/ts-next-strict-mcp/`)
   - **Purpose**: TypeScript type checking and ESLint validation
   - **Language**: TypeScript/Node.js
   - **Tools**: `tsc_check`, `eslint_check`

2. **Schema Drift MCP** (`tools/schema-drift-mcp/`)
   - **Purpose**: Database schema drift detection
   - **Language**: Python
   - **Tools**: `schema_diff`

3. **CI Guard MCP** (`tools/ci-guard-mcp/`)
   - **Purpose**: Pre-merge validation and health checks
   - **Language**: TypeScript/Node.js
   - **Tools**: `premerge_guard`

## Installation and Setup

### Prerequisites

- Node.js 20.x+
- Python 3.11+
- pnpm package manager
- pipx (for Python MCP server)

### Quick Setup

```bash
# Install and build all MCP servers
pnpm mcp:setup

# Verify installation
pnpm mcp:status
```

### Manual Setup

#### TypeScript Servers

```bash
# Install dependencies
pnpm -C tools/ts-next-strict-mcp install
pnpm -C tools/ci-guard-mcp install

# Build servers
pnpm -C tools/ts-next-strict-mcp build
pnpm -C tools/ci-guard-mcp build
```

#### Python Server

```bash
# Install schema drift MCP
pipx install -e tools/schema-drift-mcp

# Verify installation
which schema-drift-mcp
```

## Cursor Integration

### Configuration

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    },
    "ts-next-strict": {
      "command": "node",
      "args": ["./tools/ts-next-strict-mcp/dist/index.js"],
      "cwd": "/Users/mendell/jewgo app"
    },
    "schema-drift": {
      "command": "schema-drift-mcp"
    },
    "ci-guard": {
      "command": "node",
      "args": ["./tools/ci-guard-mcp/dist/index.js"],
      "cwd": "/Users/mendell/jewgo app"
    }
  }
}
```

### Usage in Cursor

#### TypeScript/ESLint Tools

```typescript
// Run TypeScript type checking
tsc_check { cwd: "frontend" }

// Run ESLint with auto-fix
eslint_check { cwd: "frontend", pattern: "app/**/*.tsx", fix: true }

// Check specific files
eslint_check { cwd: "frontend", pattern: "lib/**/*.ts", fix: false }
```

#### Schema Drift Detection

```python
# Compare SQLAlchemy models with live database
schema_diff {
  "db_url": "postgresql+psycopg://user:pass@host:5432/db",
  "metadata_module": "backend.database.models"
}
```

#### CI Guard and Health Checks

```typescript
// Run pre-merge validation
premerge_guard {
  "cwd": "frontend",
  "feHealthUrl": "https://jewgo-app.vercel.app/health",
  "beHealthUrl": "https://jewgo.onrender.com/health",
  "budgets": {
    "mainKB": 500,
    "initialTotalMB": 2
  }
}
```

## Development Workflow Integration

### Pre-Commit Checks

**Required for all commits:**

1. **TypeScript Validation**
   ```bash
   # Run TypeScript strict checking
   tsc_check { cwd: "frontend" }
   ```

2. **ESLint Validation**
   ```bash
   # Run ESLint with auto-fix
   eslint_check { cwd: "frontend", pattern: "**/*.{ts,tsx}", fix: true }
   ```

3. **Error Resolution**
   - Fix all critical errors before committing
   - Address warnings before next release
   - Document any intentional exceptions

### Pre-Merge Validation

**Required for all pull requests:**

1. **CI Guard Check**
   ```bash
   # Run comprehensive pre-merge validation
   premerge_guard {
     "cwd": "frontend",
     "feHealthUrl": "https://jewgo-app.vercel.app/health",
     "beHealthUrl": "https://jewgo.onrender.com/health",
     "budgets": {
       "mainKB": 500,
       "initialTotalMB": 2
     }
   }
   ```

2. **Schema Drift Check** (if database changes)
   ```bash
   # Verify no schema drift
   schema_diff {
     "db_url": "$DATABASE_URL",
     "metadata_module": "backend.database.models"
   }
   ```

## Performance Standards

### Bundle Size Limits

- **Main bundle**: < 500KB
- **Initial load**: < 2MB
- **Individual chunks**: < 200KB

### Performance Metrics

- **Build time**: < 30 seconds
- **Health check response**: < 2 seconds
- **Lighthouse score**: > 90

### Monitoring

```bash
# Monitor bundle sizes
pnpm mcp:guard --monitor-bundle

# Track performance over time
./scripts/mcp-performance-monitor.sh
```

## Error Handling

### Error Severity Levels

#### Critical (Block Deployment)
- TypeScript compilation errors
- Build failures
- Schema drift in production
- Health check failures

#### Warning (Address Before Release)
- ESLint warnings
- Performance regressions
- Unused variables
- Style violations

#### Info (Document)
- Code style suggestions
- Optimization opportunities
- Deprecation warnings

### Error Resolution Workflow

1. **Identify Error Source**
   ```bash
   # Use MCP tools to identify issues
   tsc_check { cwd: "frontend" }
   eslint_check { cwd: "frontend", pattern: "**/*.{ts,tsx}" }
   ```

2. **Fix Critical Errors**
   - Address immediately
   - Test thoroughly
   - Document changes

3. **Address Warnings**
   - Fix before next release
   - Add to technical debt tracking
   - Consider automated fixes

4. **Document Resolution**
   - Update documentation
   - Add to troubleshooting guide
   - Share with team

## Maintenance and Updates

### Server Updates

```bash
# Update all MCP servers
pnpm mcp:update

# Update individual servers
pnpm -C tools/ts-next-strict-mcp update
pnpm -C tools/ci-guard-mcp update
pipx upgrade schema-drift-mcp
```

### Health Monitoring

```bash
# Check server health
./scripts/mcp-health-check.sh

# Test tool availability
./scripts/mcp-tool-test.sh

# Monitor performance
./scripts/mcp-performance-monitor.sh
```

### Troubleshooting

#### Common Issues

1. **Server Not Starting**
   ```bash
   # Rebuild servers
   pnpm mcp:build
   
   # Check logs
   pnpm mcp:logs
   ```

2. **Permission Errors**
   ```bash
   # Fix Python server permissions
   pipx reinstall schema-drift-mcp
   
   # Fix Node.js server permissions
   chmod +x tools/*/dist/index.js
   ```

3. **Configuration Issues**
   ```bash
   # Validate configuration
   ./scripts/validate-mcp-config.sh
   
   # Reset configuration
   ./scripts/reset-mcp-config.sh
   ```

## Best Practices

### Code Quality

1. **Always run MCP checks before committing**
2. **Fix critical errors immediately**
3. **Use MCP tools during code reviews**
4. **Monitor performance budgets**

### Schema Management

1. **No schema drift in production**
2. **Test migrations in staging**
3. **Backup database before changes**
4. **Document all schema modifications**

### Performance Optimization

1. **Monitor bundle sizes regularly**
2. **Optimize images and assets**
3. **Use code splitting effectively**
4. **Implement caching strategies**

### Team Collaboration

1. **Share MCP configuration**
2. **Document custom tools**
3. **Train team on MCP usage**
4. **Regular MCP health checks**

## Automation Scripts

### Available Scripts

```bash
# Setup and installation
./scripts/mcp-setup.sh
./scripts/mcp-install.sh
./scripts/mcp-build.sh

# Health and monitoring
./scripts/mcp-health-check.sh
./scripts/mcp-performance-monitor.sh
./scripts/mcp-schema-monitor.sh

# Validation and testing
./scripts/mcp-pre-commit.sh
./scripts/mcp-pre-merge.sh
./scripts/mcp-tool-test.sh

# Maintenance
./scripts/mcp-update.sh
./scripts/mcp-cleanup.sh
./scripts/mcp-reset.sh
```

### Custom Scripts

Create custom MCP scripts in `scripts/mcp/`:

```bash
# Example: Custom validation script
#!/bin/bash
# scripts/mcp/custom-validation.sh

echo "Running custom MCP validation..."

# Run TypeScript checks
tsc_check { cwd: "frontend" }

# Run ESLint
eslint_check { cwd: "frontend", pattern: "**/*.{ts,tsx}", fix: true }

# Run CI guard
premerge_guard {
  "cwd": "frontend",
  "feHealthUrl": "https://jewgo-app.vercel.app/health",
  "budgets": { "mainKB": 500, "initialTotalMB": 2 }
}

echo "Custom validation complete!"
```

## Integration with CI/CD

### GitHub Actions

```yaml
# .github/workflows/mcp-validation.yml
name: MCP Validation

on: [push, pull_request]

jobs:
  mcp-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - uses: pnpm/action-setup@v4
        with:
          version: 8
      
      - name: Install MCP servers
        run: pnpm mcp:setup
      
      - name: Run TypeScript checks
        run: |
          echo '{"type":"tool","name":"tsc_check","params":{"cwd":"frontend"}}' | \
          node tools/ts-next-strict-mcp/dist/index.js
      
      - name: Run ESLint checks
        run: |
          echo '{"type":"tool","name":"eslint_check","params":{"cwd":"frontend","pattern":"**/*.{ts,tsx}"}}' | \
          node tools/ts-next-strict-mcp/dist/index.js
      
      - name: Run CI guard
        run: |
          echo '{"type":"tool","name":"premerge_guard","params":{"cwd":"frontend","budgets":{"mainKB":500,"initialTotalMB":2}}}' | \
          node tools/ci-guard-mcp/dist/index.js
```

### Vercel Integration

```json
// vercel.json
{
  "buildCommand": "pnpm mcp:setup && pnpm mcp:pre-merge && npm run build",
  "installCommand": "pnpm install",
  "framework": "nextjs"
}
```

## Security Considerations

### Environment Variables

- Never commit sensitive data to MCP configuration
- Use environment variables for database URLs
- Rotate API keys regularly

### Access Control

- Limit MCP server access to authorized developers
- Monitor MCP tool usage
- Audit MCP configurations regularly

### Data Privacy

- MCP servers should not log sensitive information
- Implement proper error handling without exposing internals
- Follow data retention policies

## Future Enhancements

### Planned Features

1. **Additional MCP Servers**
   - Security scanning MCP
   - Accessibility checking MCP
   - SEO validation MCP

2. **Enhanced Integration**
   - IDE plugins for popular editors
   - Slack/Discord notifications
   - Dashboard for MCP metrics

3. **Advanced Analytics**
   - Code quality trends
   - Performance regression detection
   - Team productivity metrics

### Contributing to MCP Standards

1. **Propose new MCP servers**
2. **Improve existing tools**
3. **Add automation scripts**
4. **Update documentation**

## Support and Resources

### Documentation

- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Cursor MCP Integration](https://cursor.sh/docs/mcp)
- [Project MCP Tools](./tools/)

### Community

- [MCP Discord](https://discord.gg/modelcontextprotocol)
- [GitHub Discussions](https://github.com/modelcontextprotocol/mcp/discussions)
- [Project Issues](https://github.com/mml555/jewgo-app/issues)

### Internal Support

- **MCP Team**: @mendel, @team
- **Documentation**: [MCP Standards](./MCP_STANDARDS.md)
- **Troubleshooting**: [MCP Troubleshooting Guide](./TROUBLESHOOTING.md)
