
# Agent Operating Rules & Guidelines — v3 (ID-Indexed)

Doc version: v3.1 — 2025-08-27
Audience: agents. For contributor workflow, see `docs/AGENTS.md`.

> **Context**
> • DB data store in
  **PostgreSQL on Ubuntu** behind the Flask API.
> • Agents must **never run restricted npm commands** or **any command expected to exceed 90 seconds** (G-OPS-1).
> • Use **Context7 MCP** for latest docs or ask the user to confirm before altering behavior (G-DOCS-2).
> • **Use MCP servers when needed**: Serena for search and planning, Context7 for documentation details (G-MCP-1).

---

## 🔑 ID Quick Index

* **Security**: G-SEC-1 secrets; G-SEC-2 redaction; G-SEC-3 CORS/CSRF; G-SEC-4 rate-limit; G-SEC-5 token verify; G-SEC-6 secret scanning.
* **Ops**: G-OPS-1 ≤90s & restricted npm; G-OPS-2 egress control; G-OPS-3 destructive-ops safety; G-OPS-4 path rules; G-OPS-5 read caps.
* **Database**: G-DB-1 migrations-only; G-DB-2 rollback notes; G-DB-3 backward-compat.
* **Docs/Process**: G-DOCS-1 docs in same patch; G-DOCS-2 Context7 MCP; G-DOCS-3 ADRs for arch; G-MCP-1 MCP server usage.
* **CI/CD**: G-CI-1 required checks; G-CI-2 lockfile drift; G-CI-3 global timeouts; G-CI-4 artifacts & reports.
* **Workflow**: G-WF-1 plan; G-WF-2 preamble; G-WF-3 search; G-WF-4 surgical patch; G-WF-5 quick validate; G-WF-6 docs update; G-WF-7 exit checklist; G-WF-8 TypeScript errors; G-WF-9 MCP integration.
* **Logging/Obs**: G-LOG-1 JSON logs; G-LOG-2 redaction middleware; G-OBS-1 health/ready; G-OBS-2 error tracking.

---

## 0) Non-Negotiables (Hard Guardrails)

* **G-SEC-1 Secrets <a id="G-SEC-1"></a>** — Never print, edit, or commit secrets. `.env` & `.env.local` are the single sources of truth. Example files use placeholders only.
* **G-OPS-1 90s-limit & Restricted npm <a id="G-OPS-1"></a>** —

  * Agents must **not execute any command expected to exceed 90 seconds**.
  * Agents **may run `npm` commands** except:

    * `npm run build`
    * `npm run dev`
  * Agents must also **never start or kill the backend server** (e.g., `python app.py`, `flask run`, `kill -9`).
  * All backend tests must **first activate the virtual environment** before execution.
  * For restricted/long-running commands, emit a user-run handoff with the exact command.
* **G-OPS-2 Egress Control <a id="G-OPS-2"></a>** — Network egress is off by default. If a command needs the network or writes outside the workspace, include `with_escalated_permissions: true` + one-line justification—and still respect G-OPS-1.
* **G-OPS-3 Destructive-Ops Safety <a id="G-OPS-3"></a>** — No `rm -rf`, schema drops, or deletions without explicit task, dry-run preview, and user confirmation.
* **G-OPS-4 Path Rules — Allowlist & Denylist <a id="G-OPS-4"></a>** — Edit only within `frontend/`, `backend/`, `scripts/`, `docs/`, `supabase/`, `config/`, `tools/`. Never edit or commit `node_modules/`, `.venv/`, build artifacts, or binaries.
* **G-OPS-5 Read Caps <a id="G-OPS-5"></a>** — Never read `.env*` or binary files; preview large files in chunks (≤250 lines) and summarize.
* **G-DB-1 Migrations-Only <a id="G-DB-1"></a>** — All DB schema changes are via migrations (Supabase under `supabase/`, app DB under `backend/migrations/` using Alembic). No ad-hoc SQL.
* **G-DB-2 Rollback Notes <a id="G-DB-2"></a>** — Every migration includes **up/down** steps and a short rollback note in the PR/docs.
* **G-DB-3 Backward-Compat Preferred <a id="G-DB-3"></a>** — Prefer additive/compatible changes; call out breaking moves explicitly.
* **G-SEC-3 CORS/CSRF <a id="G-SEC-3"></a>** — Enforce CORS allowlist; enable CSRF if cookies are used.
* **G-SEC-4 Rate-Limit <a id="G-SEC-4"></a>** — Rate-limit auth and all write endpoints.
* **G-SEC-5 Token Verify <a id="G-SEC-5"></a>** — Backend verifies Supabase JWTs using official methods (JWKS/SDK). No password handling in Flask.
* **G-SEC-6 Secret Scanning <a id="G-SEC-6"></a>** — Enforce gitleaks (or equivalent) in pre-commit and CI to block secret leaks before merge.
* **G-DOCS-1 Docs in Same Patch <a id="G-DOCS-1"></a>** — If behavior/commands/env change, update docs alongside code.
* **G-DOCS-2 Context7 MCP <a id="G-DOCS-2"></a>** — Pull latest docs via MCP or ask the user before changing behavior.
* **G-DOCS-3 ADRs for Architecture <a id="G-DOCS-3"></a>** — Record significant decisions in `docs/adr/NNN-title.md`.
* **G-CI-1 Required Checks <a id="G-CI-1"></a>** — Lint, type, tests must be green on PRs to merge.
* **G-CI-2 Lockfile Drift <a id="G-CI-2"></a>** — CI fails if `npm i` would change the lockfile unexpectedly.
* **G-CI-3 Global Timeouts <a id="G-CI-3"></a>** — CI jobs have 10–15m caps; long steps get explicit step-level timeouts. (Keeps parity with G-OPS-1.)
* **G-CI-4 Artifacts & Reports <a id="G-CI-4"></a>** — Preserve test reports and coverage artifacts for 7–14 days for triage.
* **G-LOG-1 JSON Logs <a id="G-LOG-1"></a>** — Use structured JSON; exclude PII and secrets.
* **G-LOG-2 Redaction Middleware <a id="G-LOG-2"></a>** — Auto-sanitize logs for common secret keys before output.
* **G-OBS-1 Health/Ready <a id="G-OBS-1"></a>** — Provide `/healthz` and `/readyz` endpoints.
* **G-OBS-2 Error Tracking <a id="G-OBS-2"></a>** — Instrument error tracking (e.g., Sentry) across backend and frontend.
* **G-MCP-1 MCP Server Usage <a id="G-MCP-1"></a>** — Use MCP servers when needed: Serena for search and planning, Context7 for documentation details. Prefer MCP tools over manual search when available.

> **Duplication policy:** When other sections need these concepts, reference the ID (e.g., “respect **G-OPS-1**”), not the full rule.

---

## 1) Repository Layout (Authoritative)

* `frontend/` — Next.js + TypeScript (`app/`, `components/`, `__tests__/`, `public/`)
* `backend/` — Flask API (`routes/`, `services/`, `utils/`, `tests/`); `app.py` (dev), `wsgi.py` (prod)
* `scripts/` — Docker/dev orchestration; `docs/` — developer & deploy docs; `supabase/` — DB config/migrations; `config/`, `tools/` — CI/MCP utilities.

Invariants: tests live in `frontend/__tests__/` and `backend/tests/`; no generated artifacts checked in; lockfiles are kept. (See **G-OPS-4**.)

---

## 2) Coding Style & Testing (Concise)

* **Python** — Black(88), isort, Flake8, mypy; 4-space indent; names: `snake_case`/`PascalCase`/`lowercase_underscores`.
* **TypeScript/React** — ESLint + Prettier (2 spaces). Components `PascalCase`; hooks `useCamelCase`; lowercase routes. Keep files small; colocate tests.
* **Testing** — Frontend: Jest + RTL (`frontend/__tests__/` or `*.test.tsx`). Backend: pytest with markers `unit`, `integration`, `slow` (`backend/tests/test_*.py`). Favor unit tests; route-level integration for cross-layer logic.
* **Coverage** — Aim ≥80% statements on changed files. If full suites exceed **G-OPS-1**, emit user-run handoff.

---

## 3) Workflow Contract (Tightened)

* **G-WF-1 Plan** — Use `update_plan` with exactly one `in_progress` step. Mark finished steps `completed` before starting the next.
* **G-WF-2 Preamble** — 1–2 lines stating intent and expected output before running any command.
* **G-WF-3 Search** — Use `rg` to target; preview with `sed -n '1,250p'`. Avoid big dumps.
* **G-WF-4 Surgical Patch** — Use `apply_patch` with minimal diffs; one logical change per patch; comment non-obvious code.
* **G-WF-5 Quick Validate** — Run only validations that respect **G-OPS-1** (e.g., `pytest -q`, `npx tsc --noEmit`). If slower, handoff to user.
* **G-WF-6 Doc Update** — Update `docs/` (and env examples if shape changed) **in the same patch** (see **G-DOCS-1**).
* **G-WF-7 Exit Checklist** — Confirm: path allowlist (G-OPS-4), no secrets (G-SEC-1), ≤90s (G-OPS-1), docs updated (G-DOCS-1), migrations + rollback when schema touched (G-DB-1/2).
* **G-WF-8 TypeScript Errors <a id="G-WF-8"></a>** — Use `npx tsc --noEmit` for fast TypeScript error checking. Fix all type errors before proceeding. For complex interface changes, update mapping functions and mock data together.
* **G-WF-9 MCP Integration <a id="G-WF-9"></a>** — Integrate MCP servers into workflow: use Serena for codebase search and planning, Context7 for up-to-date documentation. Prefer MCP tools over manual file operations when available.

---

## 4) Agent vs User Run (Clear Matrix)

**Agent (must respect G-OPS-1):**

* Backend tests — **always after activating venv**:

  ```bash
  source backend/.venv/bin/activate && cd backend && pytest -q
  ```
* Small coverage pass on changed scope (venv required):

  ```bash
  source backend/.venv/bin/activate && cd backend && pytest --cov --maxfail=1
  ```
* **Safe npm commands**: `npm test`, `npm run lint`, `npm run type-check`, `npm run env:check`
  (but **not** `npm run build` or `npm run dev`)
* TypeScript checks: `npx tsc --noEmit`

**User (handoff; do not run in agent):**

* `npm run build`
* `npm run dev`
* Any Docker builds/compose up
* Full frontend QA suites likely >90s
* Starting/stopping backend servers

**User-Run Handoff Template**

```
Per G-OPS-1 (≤90s & restricted npm), please run locally:

cd frontend && npm run build && npm test && npm run lint && npm run type-check

Reply here with the output, and I'll proceed.
```

---

## 5) Security & Logging

*(unchanged; see previous version — CORS/CSRF, JWT verify, redaction middleware, etc.)*

---

## 6) CI/CD Settings

*(unchanged except already aligned with G-OPS-1)*

---

## 7) Commands (Reference; respect IDs)

* **Run backend tests** (with venv, G-OPS-1):

  ```json
  {"command":["bash","-lc","source backend/.venv/bin/activate && cd backend && pytest -q"]}
  ```

* **Run backend tests with coverage** (venv, ensure ≤90s or handoff):

  ```json
  {"command":["bash","-lc","source backend/.venv/bin/activate && cd backend && pytest --cov --maxfail=1"]}
  ```

* **Check TypeScript errors** (G-WF-8):

  ```json
  {"command":["bash","-lc","cd frontend && npx tsc --noEmit"]}
  ```

---

### Rule Violation Format

```
VIOLATION[G-OPS-1]: attempted npm command "npm run build"
VIOLATION[G-OPS-1]: attempted to start backend server "python app.py"
```

---

## 8) PR & Commit Policy

*(unchanged)*

---

## 9) Quick Reference (One Page)

**Prime Directive** — Supabase for auth; Postgres behind Flask; respect **G-OPS-1**.
**Default Flow** — G-WF-1→G-WF-2→G-WF-3→G-WF-4→G-WF-5→G-WF-6→G-WF-7→G-WF-8→G-WF-9.
**MCP Integration** — G-MCP-1: Use Serena for search/planning, Context7 for docs.
**Security** — G-SEC-1/3/4/5, G-LOG-2.
**Migrations** — G-DB-1/2/3.
**CI** — G-CI-1/2/3/4.
**Agent vs User** — follow the matrix in §4; reference **G-OPS-1** on handoffs.
