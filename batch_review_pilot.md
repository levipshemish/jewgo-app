# Batch Review - Pilot Phase (Configs/Docs/Scripts)

## File Review Table

| Path | Purpose(1-line) | UsedInProd | Action | RiskScore | RiskClass | Confidence | FanIn | DepsOut | HasTests | Rationale |
|------|-----------------|------------|--------|-----------|-----------|------------|-------|---------|----------|-----------|
| `.cursor/memories.json` | Cursor IDE memory storage | No | DELETE | 1 | L | 0.9 | 0 | 0 | N | Development-only IDE config |
| `.cursor/commands/mendel-mode-v4.json` | Cursor IDE command config | No | DELETE | 1 | L | 0.9 | 0 | 0 | N | Development-only IDE config |
| `.cursor/commands/codebase-clean.json` | Codebase cleanup command | No | KEEP | 1 | L | 0.9 | 0 | 0 | N | Active cleanup workflow |
| `ENVIRONMENT.md` | Environment setup docs | No | KEEP | 0 | L | 0.95 | 0 | 0 | N | Essential documentation |
| `render.yaml` | Render deployment config | Yes | KEEP | 6 | M | 0.8 | 0 | 3 | N | Production deployment critical |
| `frontend/middleware.ts.disabled` | Disabled middleware file | No | DELETE | 1 | L | 0.95 | 0 | 0 | N | Explicitly disabled, safe to remove |
| `frontend/sentry.client.config.ts.disabled` | Disabled Sentry config | No | DELETE | 1 | L | 0.95 | 0 | 0 | N | Explicitly disabled, safe to remove |
| `frontend/sentry.edge.config.ts.disabled` | Disabled Sentry edge config | No | DELETE | 1 | L | 0.95 | 0 | 0 | N | Explicitly disabled, safe to remove |
| `frontend/sentry.server.config.ts.disabled` | Disabled Sentry server config | No | DELETE | 1 | L | 0.95 | 0 | 0 | N | Explicitly disabled, safe to remove |
| `frontend/test-server-init.js` | Test server initialization | No | KEEP | 2 | L | 0.8 | 0 | 2 | N | Testing infrastructure |
| `frontend/test-supabase.js` | Supabase test utilities | No | KEEP | 2 | L | 0.8 | 0 | 3 | N | Testing infrastructure |
| `frontend/test-redis.js` | Redis test utilities | No | KEEP | 2 | L | 0.8 | 0 | 2 | N | Testing infrastructure |
| `frontend/knip-report.json` | Dead code analysis report | No | DELETE | 1 | L | 0.9 | 0 | 0 | N | Generated report, can regenerate |
| `frontend/tsprune.txt` | TypeScript unused exports | No | DELETE | 1 | L | 0.9 | 0 | 0 | N | Generated report, can regenerate |
| `frontend/depcheck.json` | Dependency analysis report | No | DELETE | 1 | L | 0.9 | 0 | 0 | N | Generated report, can regenerate |
| `frontend/bundle-optimization-report.json` | Bundle analysis report | No | DELETE | 1 | L | 0.9 | 0 | 0 | N | Generated report, can regenerate |
| `frontend/lighthouse-report.json` | Performance analysis report | No | DELETE | 1 | L | 0.9 | 0 | 0 | N | Generated report, can regenerate |
| `backend/config/config.py` | Backend configuration | Yes | KEEP | 8 | M | 0.85 | 5 | 10 | N | Core configuration file |
| `backend/config/settings.py` | Backend settings | Yes | KEEP | 8 | M | 0.85 | 3 | 8 | N | Core settings file |
| `tools/ci-guard-mcp/src/index.ts` | CI guard tool | No | KEEP | 3 | L | 0.8 | 0 | 5 | N | Development tool for safety |
| `tools/ci-guard-mcp/src/check.ts` | CI guard check logic | No | KEEP | 3 | L | 0.8 | 1 | 3 | N | Development tool for safety |
| `tools/schema-drift-mcp/server.py` | Schema drift monitoring | No | KEEP | 4 | L | 0.8 | 0 | 3 | N | Database monitoring tool |
| `scripts/deploy.sh` | Deployment automation | Yes | KEEP | 9 | M | 0.8 | 0 | 5 | N | Production deployment script |
| `frontend/scripts/` | Frontend utility scripts | No | KEEP | 2 | L | 0.8 | 0 | 3 | N | Development utilities |
| `backend/scripts/` | Backend utility scripts | No | KEEP | 2 | L | 0.8 | 0 | 3 | N | Development utilities |
| `docs/maintenance/ROOT_DIRECTORY_CLEANUP_ANALYSIS.md` | Cleanup analysis doc | No | KEEP | 0 | L | 0.9 | 0 | 0 | N | Maintenance documentation |
| `docs/setup/ENVIRONMENT_SETUP.md` | Environment setup guide | No | KEEP | 0 | L | 0.9 | 0 | 0 | N | Essential documentation |

## Summary
- **Total Files**: 26
- **DELETE**: 8 files (31%)
- **KEEP**: 18 files (69%)
- **High Risk**: 0 files
- **Medium Risk**: 4 files
- **Low Risk**: 22 files

## Decision Prompt

**DELETE(8)**: `.cursor/memories.json`, `.cursor/commands/mendel-mode-v4.json`, `frontend/middleware.ts.disabled`, `frontend/sentry.*.disabled`, `frontend/knip-report.json`, `frontend/tsprune.txt`, `frontend/depcheck.json`, `frontend/bundle-optimization-report.json`, `frontend/lighthouse-report.json`

**KEEP(18)**: All other configs, docs, and scripts

**MOVE(0)**: None

**REFACTOR(0)**: None

**UNKNOWN(0)**: None

---

**Mendel, please reply with your decision:**
- `approve [ids]` - Approve specific actions
- `hold [id]` - Hold specific items for review
- `edit [id:new-target]` - Modify specific actions
