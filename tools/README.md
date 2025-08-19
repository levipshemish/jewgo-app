# MCP Tools - Local Development Only

These MCP (Model Context Protocol) tools are designed for local development and Cursor IDE integration. They are **NOT used in CI/CD pipelines**.

## Available Tools

### 1. TypeScript/Next.js Strict MCP (`ts-next-strict-mcp`)
- **Purpose**: TypeScript type checking and ESLint validation
- **Local Usage**: `pnpm mcp:strict`
- **Direct Script**: `node tools/ts-next-strict-mcp/dist/check.js tsc frontend`

### 2. CI Guard MCP (`ci-guard-mcp`)
- **Purpose**: Build validation, performance budgets, health checks
- **Local Usage**: `pnpm mcp:guard`
- **Direct Script**: `node tools/ci-guard-mcp/dist/check.js frontend`

### 3. Schema Drift MCP (`schema-drift-mcp`)
- **Purpose**: Database schema validation and drift detection
- **Local Usage**: `pnpm mcp:schema`

## Local Development Setup

```bash
# Install MCP tools
pnpm mcp:install

# Build MCP tools
pnpm mcp:build

# Run health check
pnpm mcp:health

# Setup Cursor integration
pnpm mcp:setup
```

## CI/CD Integration

MCP tools are **NOT used in CI/CD**. Instead, the CI workflows use:

- **TypeScript**: `npm run type-check` (frontend)
- **ESLint**: `npm run lint` (frontend)  
- **Build**: `npm run build` (frontend)
- **Schema**: Direct Python imports (backend)

## Cursor IDE Integration

For Cursor IDE integration, configure your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ts-next-strict": {
      "command": "node",
      "args": ["tools/ts-next-strict-mcp/dist/index.js"]
    },
    "ci-guard": {
      "command": "node", 
      "args": ["tools/ci-guard-mcp/dist/index.js"]
    }
  }
}
```

## Maintenance

```bash
# Update MCP tools
pnpm mcp:update

# Clean up MCP tools
pnpm mcp:cleanup

# Reset MCP tools
pnpm mcp:reset
```
