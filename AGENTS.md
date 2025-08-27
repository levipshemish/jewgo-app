# Codex Agent Operating Rules & Guidelines — v3 (ID‑Indexed)

Audience: agents. For contributor workflow, see `docs/AGENTS.md`.

> **Context**
> • All user authentication via **Supabase** (backend only verifies tokens).
> • All other app data in **PostgreSQL on Ubuntu** behind the Flask API.
> • Agents must **never run npm** and **never run any command expected to exceed 90 seconds** (G‑OPS‑1).
> • Use **Context7 MCP** for latest docs or ask the user to confirm before altering behavior (G‑DOCS‑2).

---

## 🔑 ID Quick Index

* **Security**: G‑SEC‑1 secrets; G‑SEC‑2 redaction; G‑SEC‑3 CORS/CSRF; G‑SEC‑4 rate‑limits; G‑SEC‑5 token verify.
* **Ops**: G‑OPS‑1 ≤90s & no npm; G‑OPS‑2 egress control; G‑OPS‑3 destructive‑ops safety; G‑OPS‑4 path allowlist.
* **Database**: G‑DB‑1 migrations‑only; G‑DB‑2 rollback notes; G‑DB‑3 backward‑compat.
* **Docs/Process**: G‑DOCS‑1 docs in same patch; G‑DOCS‑2 Context7 MCP; G‑DOCS‑3 ADRs for arch.
* **CI/CD**: G‑CI‑1 required checks; G‑CI‑2 lockfile drift; G‑CI‑3 global timeouts.
* **Workflow**: G‑WF‑1 plan; G‑WF‑2 preamble; G‑WF‑3 search; G‑WF‑4 surgical patch; G‑WF‑5 quick validate; G‑WF‑6 docs update; G‑WF‑7 exit checklist.
* **Logging/Obs**: G‑LOG‑1 JSON logs; G‑LOG‑2 redaction middleware; G‑OBS‑1 health/ready.

---

## 0) Non‑Negotiables (Hard Guardrails)

* **G‑SEC‑1 Secrets** — Never print, edit, or commit secrets. `.env` & `.env.local` are the single sources of truth. Example files use placeholders only.
* **G‑OPS‑1 90s‑limit & No npm** — Agents must **not run npm** and must **not execute any command expected to exceed 90 seconds**. Emit a user‑run handoff with the exact command instead.
* **G‑OPS‑2 Egress Control** — Network egress is off by default. If a command needs the network or writes outside the workspace, include `with_escalated_permissions: true` + one‑line justification—and still respect G‑OPS‑1.
* **G‑OPS‑3 Destructive‑Ops Safety** — No `rm -rf`, schema drops, or deletions without explicit task, dry‑run preview, and user confirmation.
* **G‑OPS‑4 Path Allowlist** — Edit only within `frontend/`, `backend/`, `scripts/`, `docs/`, `supabase/`, `config/`, `tools/`.
* **G‑OPS‑4a Denylist Paths** — Never edit or commit `node_modules/`, `.venv/`, build artifacts, or binaries.
* **G‑DB‑1 Migrations‑Only** — All DB schema changes are via migrations (Supabase under `supabase/`, app DB under `backend/migrations/` using Alembic). No ad‑hoc SQL.
* **G‑DB‑2 Rollback Notes** — Every migration includes **up/down** steps and a short rollback note in the PR/docs.
* **G‑DB‑3 Backward‑Compat Preferred** — Prefer additive/compatible changes; call out breaking moves explicitly.
* **G‑SEC‑3 CORS/CSRF** — Enforce CORS allowlist; enable CSRF if cookies are used.
* **G‑SEC‑4 Rate‑Limits** — Rate‑limit auth and all write endpoints.
* **G‑SEC‑5 Token Verify** — Backend verifies Supabase JWTs using official methods (JWKS/SDK). No password handling in Flask.
* **G‑DOCS‑1 Docs in Same Patch** — If behavior/commands/env change, update docs alongside code.
* **G‑DOCS‑2 Context7 MCP** — Pull latest docs via MCP or ask the user before changing behavior.
* **G‑DOCS‑3 ADRs for Architecture** — Record significant decisions in `docs/adr/NNN-title.md`.
* **G‑CI‑1 Required Checks** — Lint, type, tests must be green on PRs to merge.
* **G‑CI‑2 Lockfile Drift** — CI fails if `npm i` would change the lockfile unexpectedly.
* **G‑CI‑3 Global Timeouts** — CI jobs have 10–15m caps; long steps get explicit step‑level timeouts. (Keeps parity with G‑OPS‑1.)
* **G‑LOG‑1 JSON Logs** — Use structured JSON; exclude PII and secrets.
* **G‑LOG‑2 Redaction Middleware** — Auto‑sanitize logs for common secret keys before output.
* **G‑OBS‑1 Health/Ready** — Provide `/healthz` and `/readyz` endpoints.

> **Duplication policy:** When other sections need these concepts, reference the ID (e.g., “respect **G‑OPS‑1**”), not the full rule.

---

## 1) Repository Layout (Authoritative)

* `frontend/` — Next.js + TypeScript (`app/`, `components/`, `__tests__/`, `public/`)
* `backend/` — Flask API (`routes/`, `services/`, `utils/`, `tests/`); `app.py` (dev), `wsgi.py` (prod)
* `scripts/` — Docker/dev orchestration; `docs/` — developer & deploy docs; `supabase/` — DB config/migrations; `config/`, `tools/` — CI/MCP utilities.

Invariants: tests live in `frontend/__tests__/` and `backend/tests/`; no generated artifacts checked in; lockfiles are kept. (See **G‑OPS‑4**.)

---

## 2) Coding Style & Testing (Concise)

* **Python** — Black(88), isort, Flake8, mypy; 4‑space indent; names: `snake_case`/`PascalCase`/`lowercase_underscores`.
* **TypeScript/React** — ESLint + Prettier (2 spaces). Components `PascalCase`; hooks `useCamelCase`; lowercase routes. Keep files small; colocate tests.
* **Testing** — Frontend: Jest + RTL (`frontend/__tests__/` or `*.test.tsx`). Backend: pytest with markers `unit`, `integration`, `slow` (`backend/tests/test_*.py`). Favor unit tests; route‑level integration for cross‑layer logic.
* **Coverage** — Aim ≥80% statements on changed files. If full suites exceed **G‑OPS‑1**, emit user‑run handoff.

---

## 3) Workflow Contract (Tightened)

* **G‑WF‑1 Plan** — Use `update_plan` with exactly one `in_progress` step. Mark finished steps `completed` before starting the next.
* **G‑WF‑2 Preamble** — 1–2 lines stating intent and expected output before running any command.
* **G‑WF‑3 Search** — Use `rg` to target; preview with `sed -n '1,250p'`. Avoid big dumps.
* **G‑WF‑4 Surgical Patch** — Use `apply_patch` with minimal diffs; one logical change per patch; comment non‑obvious code.
* **G‑WF‑5 Quick Validate** — Run only validations that respect **G‑OPS‑1** (e.g., `pytest -q`). If slower, handoff to user.
* **G‑WF‑6 Doc Update** — Update `docs/` (and env examples if shape changed) **in the same patch** (see **G‑DOCS‑1**).
* **G‑WF‑7 Exit Checklist** — Confirm: path allowlist (G‑OPS‑4), no secrets (G‑SEC‑1), ≤90s (G‑OPS‑1), docs updated (G‑DOCS‑1), migrations + rollback when schema touched (G‑DB‑1/2).

---

## 4) Agent vs User Run (Clear Matrix)

**Agent (must respect G‑OPS‑1):**

* Targeted backend tests: `cd backend && pytest -q`
* Small coverage pass on changed scope: `pytest --cov --maxfail=1`
* Backend dev server (venv assumed ready): `cd backend && python app.py`
* Quick env check: `npm run env:check` **only if** it’s proven fast; otherwise user‑run.

**User (handoff; do not run in agent):**

* Any `npm`/`npx` command (by policy **G‑OPS‑1**)
* Installs/builds (frontend/backend), Docker builds/compose up
* Full frontend QA: `npm run build && npm test && npm run lint && npm run type-check`
* Long coverage/e2e suites; anything likely >90s

When handing off, print the **exact command** and reference **G‑OPS‑1** in the message.

**User‑Run Handoff Template**

```
Per G‑OPS‑1 (≤90s & no npm), please run locally:

cd frontend && npm run build && npm test && npm run lint && npm run type-check

Reply here with the output, and I’ll proceed.
```

---

## 5) Security & Logging

* **Supabase boundary** (G‑SEC‑5): backend only verifies tokens; do not implement password logic.
* **CORS/CSRF** (G‑SEC‑3): allowlisted origins; CSRF if cookies.
* **Rate‑limits** (G‑SEC‑4): auth + write endpoints.
* **JSON logs** (G‑LOG‑1) with redaction middleware (G‑LOG‑2).

**Redaction Middleware — Flask example (G‑LOG‑2)**

```python
# backend/utils/log_redaction.py
import logging
SENSITIVE_KEYS = ["api_key", "secret", "token", "password"]
class RedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        msg = str(record.getMessage())
        for k in SENSITIVE_KEYS:
            msg = msg.replace(f"{k}=", f"{k}=***REDACTED***").replace(f"{k}:", f"{k}:***REDACTED***")
        record.msg, record.args = msg, ()
        return True
```

```python
# in app init
handler = logging.StreamHandler()
handler.addFilter(RedactingFilter())
app.logger.addHandler(handler)
```

**Node/Next.js hint:** apply a similar transform in your logger (e.g., pino transport) before emitting.

---

## 6) CI/CD Settings (timeouts + drift)

* **G‑CI‑2 Lockfile Drift** — Add a CI step that runs install in dry mode and fails if the lockfile changes.
* **G‑CI‑3 Timeouts** — Cap jobs at 10–15 minutes; set explicit step timeouts for potentially long commands.

**GitHub Actions sketch**

```yaml
jobs:
  backend:
    timeout-minutes: 15  # G‑CI‑3
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.11' }
      - name: Install deps
        run: pip install -r requirements.txt
      - name: Tests (quick)
        run: pytest -q
  lockfile-drift:
    timeout-minutes: 10  # G‑CI‑3
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 'lts/*' }
      - name: Detect drift (npm)
        run: |
          npm ci --ignore-scripts
          git diff --exit-code package-lock.json || (echo 'Lockfile drift' && exit 1)  # G‑CI‑2
```

---

## 7) Commands (Reference; respect IDs)

* **Run backend tests** (G‑OPS‑1):

  ```json
  {"command":["bash","-lc","cd backend && pytest" ]}
  ```
* **Run backend tests with coverage** (ensure ≤90s or handoff):

  ```json
  {"command":["bash","-lc","cd backend && pytest --cov --maxfail=1" ]}
  ```
* **Start backend dev server** (≤90s):

  ```json
  {"command":["bash","-lc","cd backend && python app.py" ]}
  ```
* **Edit a file** (G‑WF‑4):

  ```
  apply_patch << 'PATCH'
  *** Begin Patch
  *** Update File: backend/routes/example.py
  @@
  -# old
  +# new (reason; see ADR NNN)
  *** End Patch
  PATCH
  ```

---

## 9) PR & Commit Policy

* **Conventional Commits** — `type(scope): subject` (≤72 chars). Types: `feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert`.
* **PR checklist** — Description, linked issues, testing notes, screenshots (UI), risk & rollback, docs updated.
* **Required checks** — Lint, type, and tests must be green (see **G‑CI‑1**). Include rollback notes for any migration (see **G‑DB‑2**).

---

## 8) Quick Reference (One Page)

**Prime Directive** — Supabase for auth; Postgres behind Flask; respect **G‑OPS‑1**.

**Default Flow** — G‑WF‑1→G‑WF‑2→G‑WF‑3→G‑WF‑4→G‑WF‑5→G‑WF‑6→G‑WF‑7.

**Security** — G‑SEC‑1/3/4/5, G‑LOG‑2.

**Migrations** — G‑DB‑1/2/3.

**CI** — G‑CI‑1/2/3.

**Agent vs User** — follow the matrix in §4; reference **G‑OPS‑1** on handoffs.
