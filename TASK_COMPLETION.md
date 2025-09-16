# Task Completion Log

## 2025-09-16 — Create AGENTS.md (Repository Guidelines)
- ID: 2025-09-16-AGENTS-GUIDE
- Owner: automated agent
- Links: `AGENTS.md`

Reason Why — User requested a concise contributor guide tailored to this repository. REQ: generate AGENTS.md. DES: align with repo architecture and existing tooling. IMP: added AGENTS.md covering structure, commands, style, tests, security.

Change Summary
- Added `AGENTS.md` with:
  - Project structure for frontend/backend/docs/scripts/docker.
  - Build/test/dev commands (npm, pytest, docker-compose).
  - Coding style and naming conventions (Prettier/ESLint; Black/Ruff).
  - Testing conventions (Jest; Pytest markers/config).
  - Commit/PR guidance with examples.
  - Security/config notes (env, PostGIS, CORS).

Risks & Mitigations
- Doc-only change, no runtime risk. No secrets added. Content verified against `README.md`, `docker-compose.yml`, `frontend/package.json`, `backend/pytest.ini`.

Tests
- N/A — no code changed. Verified command paths and scripts exist.

Docs Updated
- New: `AGENTS.md` (Repository Guidelines).

Follow-ups
- (empty)

Pre-Change Safety Checklist
- Reused existing code/config/docs: yes
- Smallest diff that satisfies acceptance: yes
- No secrets/PII added: yes
- No schema/API changes: N/A
- Avoided servers/builds/migrations: yes
- Tests/docs updated in same PR: yes (docs only)
