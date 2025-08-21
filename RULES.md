# Mendel Mode v4.2 — Engineering Ruleset for Cursor AI & Dev Workflow

## 0. Identity & Stance
- All AI responses start with:
```
🤖 Mendel Mode v4.2 (GPT-5): <intent + priority>
```
- Unified persona. Internal facets auto-activate:
- **[Debug]**: stack traces, build/test failures
- **[Emergency]**: prod outage, deploy blockers
- **[Performance]**: slow logs, CWV regressions
- **[Security]**: auth, secrets, PII/vulns

---

## 1. Task Framing
- One objective, max 1–3 steps.
- Start with **Reason Why** + **Dependencies**.
- End with **Success Criteria**, **Change Impact**, **Mini-Changelog**.
- Priority levels: **P0** (urgent), **P1** (important), **P2** (nice-to-have).

---

## 2. Context7 Integration (Mandatory)
- Always resolve & fetch docs **before making code changes**.
- Apply official API patterns, types, error handling, security, perf guidance.
- If docs unavailable:
```
// TODO: BLOCKED: Context7 docs unavailable for <lib>@<version>
```

### 2.1 Context7 Fallback Strategy
If Context7 unavailable:
1. Use local package.json/requirements.txt versions
2. Check cached documentation
3. Apply general best practices
4. Add TODO for Context7 review when available

---

## 3. Codebase Hygiene & Structure
- **No root litter**: Only configs (tsconfig, package.json, etc.) belong at root.
- Follow established structure:
- FE: `/app/*` routes, `/components/*`, `/lib/*`, `/hooks/*`, `/types/*`, `/__tests__/*`
- BE: `/backend/app/*`, `/backend/services/*`, `/backend/database/*`, `/backend/tests/*`
- Co-locate tests (`__tests__`) and types.
- Barrel files only if they reduce churn without circular deps.

### 3.1 Temporary File Management
- **Allow temporary files** for rapid prototyping with cleanup requirements:
```
// TEMPORARY: <purpose>. Cleanup by: <date/PR #>
```
- Temporary files must be:
  - Marked with `// TEMPORARY:` comment
  - Include cleanup deadline (max 7 days)
  - Listed in PR description
  - Removed before merge or converted to permanent structure
- CI reports `TEMPORARY:` occurrences and blocks merges past deadline

---

## 4. Duplication Prevention
Before creating/editing files:
```bash
rg -n --glob '!node_modules' '<ComponentOrServiceName>'
rg -n --glob '!node_modules' 'function <name>|export function <name>|class <name>'
rg -n --glob '!node_modules' 'interface <Name>|type <Name>'
```

* Extend/refactor existing code instead of duplicating.
* If unavoidable, document in Mini-Changelog + deprecate old code.

---

## 5. Pre-Change Checklist

1. Context7 docs consulted
2. Duplication sweep run
3. Correct file structure confirmed
4. Types/Zod/SQLAlchemy models aligned
5. Cache + perf policies respected
6. Security checks applied
7. Tests added/updated
8. **Docker testing completed**:
   - Development environment tested: `docker-compose -f docker-compose.frontend.dev.yml up --build`
   - Production environment tested: `docker-compose -f docker-compose.frontend.prod.yml up --build`
   - All affected pages/features verified in Docker
   - Environment variables validated
   - Build process successful

Blockers must be logged with `// TODO: BLOCKED`.

---

## 6. CI/CD Discipline

* **No direct pushes to `main`**. All changes via PR.
* Branching: `feature/*`, `hotfix/*`.
* Required pre-push checks:

  * **Frontend**: `npm run typecheck && npm run lint && npm run build && npm test`
  * **Backend**: `python -m pytest && ruff check . && black --check .`
* **Docker Testing (Mandatory)**: Test changes in Docker before pushing
  * **Development Testing**: `docker-compose -f docker-compose.frontend.dev.yml up --build`
  * **Production Testing**: `docker-compose -f docker-compose.frontend.prod.yml up --build`
  * **Full Stack Testing**: `docker-compose -f docker-compose.frontend.local.yml up --build`
  * Test all affected pages/features in Docker environment
  * Verify environment variables and build process
  * Document any Docker-specific issues found
* Update CI configs if build tools/deps change.
* **Emergencies**: prefix commit + PR with `HOTFIX:`.

  * Add follow-up stabilization task (P0/P1).

---

## 7. Commits & PRs

* **72-char max** subject, imperative mood.
* Atomic, scoped, no drive-bys.
* PRs must include:

  * Reason Why, Dependencies, Success Criteria, Change Impact, Mini-Changelog
  * Confirmation Context7 was consulted

---

## 8. Testing Enforcement

* All new code must include a smoke test.

  * FE: React Testing Library / Playwright
  * BE: Pytest
* CI enforces **coverage ≥ 80%**.

---

## 9. Deprecation Workflow

* Mark old code:

  ```
  // DEPRECATED: <reason>. Removal target: <date/PR #>.
  ```
- Maintain `DEPRECATIONS.md` with owner + deadline.
- CI reports `DEPRECATED:` occurrences.

---

## 10. Cross-Service Contracts
- JSON validated both ends:
- FE: Zod schemas
- BE: Marshmallow/Pydantic/custom validator
- CI runs **contract tests** to detect FE/BE drift.

---

## 11. Feature Flags
- All experimental/WIP behind feature flags.
- Maintain `FEATURE_FLAGS.md` registry (owner, expiry/removal plan).

---

## 12. Secrets & Keys
- Never commit secrets.
- CI fails if `.env` values leak.
- Rotate keys immediately if exposed.

---

## 13. Dependency Management
- Run Context7 + `npm audit` / `pip-audit` before adding.
- Justify new deps in `DEPENDENCIES.md`.

---

## 14. Accessibility & i18n
- FE components must pass a11y lint (aria, contrast).
- Strings must use i18n hooks, not hardcoded.

---

## 15. Performance & Caching
- CWV budgets: LCP<2.5s, CLS<0.1, TTFB<600ms, FCP<1.8s
- Bundle budgets: main<500KB, vendor<1MB, CSS<100KB, initial<2MB
- Redis/SWR/HTTP TTLs per §8 of v4.1 (carry over)

### 15.1 Dynamic Performance Budgets
- **Base budgets** apply to standard features
- **Complex features** get expanded budgets:
  - **Data-heavy**: +200KB main, +500KB vendor
  - **Interactive**: +100KB main, +300KB vendor  
  - **Media-rich**: +300KB main, +400KB vendor
- **Justification required** in PR for budget increases
- **Performance monitoring** tracks actual vs. budgeted sizes
- **Optimization debt** created for over-budget features

---

## 16. Database & Migrations
- Versioned migrations + rollback script.
- Review Alembic autogen diffs.
- Run staging first.
- Return structured JSON errors:
```json
{ "error": "msg", "code": "ERR_CODE", "details": {}, "timestamp": "ISO" }
```

---

## 17. Observability

* Log with user/request context.
* Monitor perf metrics, alert on 5xx spikes.
* Watch bundle size growth.
* Health checks:

  * FE: `_next/static`
  * BE: `/api/health`
  * DB: connectivity

---

## 18. Tech Debt Register

* Track intentional messes in `TECH_DEBT.md`.
* Each entry: what, why, owner, deadline.
* Reviewed monthly.

---

## 19. Built-in Cleanups

* Each PR must leave code **cleaner**:

  * Remove unused imports/deps
  * Consolidate helpers/components
  * Normalize naming
  * Co-locate related files
  * Document cleanup in Mini-Changelog

---

## 20. Cursor AI Guardrails

* Cursor must always:

  1. Run Context7 first
  2. Perform dup sweep
  3. Confirm file placement
  4. Phase multi-step work across PRs
* Skipping requires explicit justification in PR.

---

## 21. Progressive Enhancement Framework

### 21.1 Development Phases
- **P0 (Core)**: Essential functionality + basic tests
  - Working feature with minimal validation
  - Basic error handling
  - Core business logic tests
- **P1 (Quality)**: Full test coverage + documentation
  - 80%+ test coverage
  - Complete documentation
  - Accessibility compliance
  - Performance optimization
- **P2 (Polish)**: Advanced features + optimization
  - Advanced UX patterns
  - Performance tuning
  - Advanced accessibility
  - Analytics integration

### 21.2 Phase Requirements
- **P0 → P1**: Must complete within 48h
- **P1 → P2**: Must complete within 7 days
- **P2 features**: Can be deferred to future sprints
- **Emergency features**: Can ship at P0 with P1 follow-up task

### 21.3 Phase Tracking
- Mark features with phase: `// PHASE: P0|P1|P2`
- CI tracks phase completion
- Dashboard shows feature maturity levels
- Tech debt created for incomplete phase transitions

---

## 22. Grace Periods & Exceptions

### 22.1 Development Grace Periods
- **New features**: 48h to meet all requirements
- **Hotfixes**: 24h to add tests/documentation  
- **Experimental code**: Marked with `// EXPERIMENTAL:` and 7-day cleanup
- **Legacy integration**: 72h for compatibility layers

### 22.2 Exception Handling
- **Emergency overrides**: Prefix with `// EMERGENCY:` + justification
- **Temporary exceptions**: Max 24h with follow-up task
- **Performance exceptions**: Must include optimization plan
- **Security exceptions**: Immediate review required

### 22.3 Exception Tracking
- All exceptions logged in `EXCEPTIONS.md`
- Weekly review of exception patterns
- Automatic cleanup reminders
- Exception metrics in team dashboards

---

## 23. Implementation Checklist

### 23.1 Pre-Implementation
- [ ] Context7 documentation consulted
- [ ] Duplication sweep completed
- [ ] File structure confirmed
- [ ] Performance budget calculated
- [ ] Phase requirements understood
- [ ] Grace period needs assessed

### 23.2 During Implementation
- [ ] Progressive enhancement phases marked
- [ ] Temporary files properly labeled
- [ ] Dynamic budgets applied if needed
- [ ] Exception handling documented
- [ ] Tests written for current phase

### 23.3 Post-Implementation
- [ ] All phases completed or scheduled
- [ ] Temporary files cleaned up
- [ ] Performance budgets verified
- [ ] Documentation updated
- [ ] Tech debt items created for future work
- [ ] **Docker testing completed**:
  - [ ] Development environment tested and working
  - [ ] Production environment tested and working
  - [ ] All affected pages/features verified
  - [ ] Environment variables validated
  - [ ] Build process successful
  - [ ] Any Docker-specific issues documented
