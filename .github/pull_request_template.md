## Reason Why
<!-- Why is this change needed? What problem does it solve? -->

## Dependencies
<!-- What other changes/systems does this depend on? -->

## Success Criteria
<!-- How will we know this is successful? What metrics/behaviors define success? -->

## Change Impact
<!-- What systems/features will this affect? Any breaking changes? -->

## Mini-Changelog
<!-- Brief summary of changes in CHANGELOG.md style -->
<!-- Example: -->
<!-- - feat(auth): add OAuth integration -->
<!-- - fix(ui): correct button alignment in navbar -->
<!-- - docs(api): update endpoint documentation -->

---

## Context7 Documentation
- [ ] Docs consulted (list versions/packages: e.g. Prisma v5.10, NextAuth v4.24)
<!-- List specific docs consulted (e.g. Prisma v5.10 API docs, NextAuth v4.24 release notes) -->
- [ ] API patterns follow official recommendations
- [ ] Security best practices applied
- [ ] Performance optimizations applied
- [ ] Fallback strategy documented if Context7 unavailable

## Context7 Confirmation
- [ ] Context7 docs checked and applied
- [ ] Skipped (justification: ________)
<!-- Required for hotfixes or when Context7 unavailable -->

## Progressive Enhancement Phase
- [ ] P0 (Core functionality) - Basic working feature
- [ ] P1 (Quality + tests) - Full test coverage + documentation
- [ ] P2 (Polish + optimization) - Advanced UX + performance tuning

## Temporary/Experimental Code
- [ ] TEMPORARY code marked with `// TEMPORARY: ... Cleanup by: YYYY-MM-DD`
- [ ] EXPERIMENTAL code marked with `// EXPERIMENTAL:`
- [ ] All cleanup deadlines valid (max 7 days)

### Temporary/Deprecated Deadlines
<!-- List all TEMPORARY/DEPRECATED items introduced/updated with ISO dates -->

## TEMPORARY/DEPRECATED Summary
<!-- Required table for tracking - prevents missed cleanup -->
| Code Ref | Type        | Deadline    | Owner | Justification |
|----------|-------------|-------------|-------|---------------|
| `file.ts` | TEMPORARY   | 2025-09-01  | @user | Quick fix for urgent issue |
| `api.py`  | DEPRECATED  | 2025-10-01  | @user | Replaced by new API |

## Deprecation Management
- [ ] Deprecated code marked `// DEPRECATED: ... Removal target: YYYY-MM-DD`
- [ ] DEPRECATIONS.md updated
- [ ] Scheduled removal within 30 days
- [ ] Replacement components/APIs documented

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Global ≥80%, per-module ≥70% coverage met
- [ ] Coverage XML reports attached (link to CI artifact)
- [ ] Manual testing completed

## Cross-Service Contracts
- [ ] API schemas updated (OpenAPI/JSONSchema)
- [ ] FE contracts validated against BE schemas
- [ ] Contract tests added in CI
- [ ] Breaking changes versioned
- [ ] API schema version bumped (if breaking changes)

## Performance Impact
- [ ] Bundle size checked (main<500KB, vendor<1MB, CSS<100KB, initial<2MB)
- [ ] CWV targets met (LCP<2.5s, CLS<0.1, FID<100ms, FCP<1.8s)
- [ ] Lighthouse CI results attached (link/screenshot)
- [ ] Bundle Analyzer report attached (link/screenshot)
- [ ] Performance regression tracking completed (LCP +100ms, CLS +0.01, FID +50ms, FCP +100ms, TTFB +50ms, Bundle +5%)
- [ ] Baseline metrics compared and no regressions detected
- [ ] Overrides justified if regression

## Security & Validation
- [ ] Input validation implemented
- [ ] Security headers maintained
- [ ] No secrets exposed
- [ ] CORS policies respected
- [ ] Dependency audit: `npm audit --production`, `pip-audit`
- [ ] Dependency audit logs attached
- [ ] No vulnerable deps added

## Accessibility & i18n
- [ ] ARIA attributes added
- [ ] Contrast ratios maintained
- [ ] Keyboard navigation supported
- [ ] Screen reader tested
- [ ] WCAG 2.1 AA compliance verified
- [ ] All strings use i18n hooks
- [ ] i18n implemented for new features

## Documentation
- [ ] Code comments added
- [ ] API docs updated
- [ ] README updated if needed
- [ ] Migration guide added for breaking changes

## Code Quality
- [ ] No code duplication (dup_scan.js checked)
- [ ] File structure follows conventions
- [ ] No root litter
- [ ] Unused imports/dependencies removed
- [ ] Conventional commits used
- [ ] Commit messages ≤72 chars with scope

## Monitoring & Observability
- [ ] Error handling + logging
- [ ] Performance metrics tracked
- [ ] Health checks updated
- [ ] Alerts/metrics updated in dashboards (Sentry/Cronitor)

## Monitoring & Alerts
- [ ] Dashboards updated (Grafana/Sentry/Datadog)
- [ ] Alerts validated (thresholds still correct)
- [ ] New metrics added to monitoring systems
- [ ] Alert rules tested in staging environment

## Rollback Plan
<!-- How to rollback safely -->

## Rollback Testing
- [ ] Rollback tested in staging/pre-prod environment
- [ ] Rollback script validated and documented
- [ ] Data integrity verified after rollback test

## CI/CD
- [ ] Build/lint/tests pass locally
- [ ] CI pipeline green before merge
- [ ] All Mendel Mode v4.2 checks passed
- [ ] Performance regression tests completed
- [ ] Security scans passed

## Additional Notes
<!-- Anything else reviewers should know -->

---

## Reviewer Checklist
- [ ] All author checkboxes validated
- [ ] Context7 confirmation or skip justification provided
- [ ] Rollback plan is sufficient
- [ ] Rollback tested locally/staging (not just described)
- [ ] TEMPORARY/DEPRECATED summary table complete
- [ ] TEMPORARY/DEPRECATED deadlines valid
- [ ] Monitoring alerts validated
- [ ] CI/CD confirmation provided
- [ ] CI checks pass
