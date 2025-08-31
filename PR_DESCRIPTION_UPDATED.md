## Reason Why
The site was failing to display restaurants because:
1. An overly aggressive image URL sanitization logic was incorrectly stripping file extensions from valid Cloudinary image URLs
2. This caused the frontend to filter out restaurants as having invalid or missing images
3. Debug code that disabled filtering was accidentally left in and would have shipped to production

## Dependencies
None.

## Success Criteria
- ✅ Restaurants with valid Cloudinary image URLs display correctly on the site
- ✅ Image filtering is restored to only show restaurants with valid images
- ✅ Debug logging has been removed from production code
- ✅ Tests added for image URL validation and API endpoint

## Change Impact
This change affects the display of restaurant listings on the frontend. No breaking changes are introduced.

## Mini-Changelog
- fix(restaurants): Correct image URL sanitization to preserve Cloudinary file extensions
- fix(api): Re-enable image filtering in restaurants-with-images endpoint
- chore: Remove production debug logging
- test: Add comprehensive tests for image URL validator
- test: Add tests for restaurants-with-images API endpoint

---

## Context7 Documentation
- [ ] Docs consulted (list versions/packages: e.g. Prisma v5.10, NextAuth v4.24)
- [ ] API patterns follow official recommendations
- [ ] Security best practices applied
- [ ] Performance optimizations applied
- [ ] Fallback strategy documented if Context7 unavailable

## Context7 Confirmation
- [ ] Context7 docs checked and applied
- [x] Skipped (justification: Bug fix, no new Context7 patterns introduced)

## Progressive Enhancement Phase
- [x] P0 (Core functionality) - Basic working feature
- [x] P1 (Quality + tests) - Full test coverage + documentation
- [ ] P2 (Polish + optimization) - Advanced UX + performance tuning

## Temporary/Experimental Code
- [x] TEMPORARY code marked with `// TEMPORARY: ... Cleanup by: YYYY-MM-DD`
- [ ] EXPERIMENTAL code marked with `// EXPERIMENTAL:`
- [x] All cleanup deadlines valid (max 7 days)

### Temporary/Deprecated Deadlines
None - all temporary debug code has been removed.

## TEMPORARY/DEPRECATED Summary
| Code Ref | Type | Deadline | Owner | Justification |
|----------|------|----------|-------|---------------|
| N/A | N/A | N/A | N/A | All temporary code removed |

## Deprecation Management
- [ ] Deprecated code marked `// DEPRECATED: ... Removal target: YYYY-MM-DD`. Template updated: 2026-01-31
- [ ] DEPRECATIONS.md updated
- [ ] Scheduled removal within 30 days
- [ ] Replacement components/APIs documented

## Testing
- [x] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Global ≥80%, per-module ≥70% coverage met
- [ ] Coverage XML reports attached (link to CI artifact)
- [x] Manual testing completed

### Tests Added:
- `__tests__/utils/imageUrlValidator.test.ts` - 23 tests covering all image URL validation functions
- `__tests__/api/restaurants-with-images.test.ts` - 8 tests covering API endpoint behavior

## Cross-Service Contracts
- [ ] API schemas updated (OpenAPI/JSONSchema)
- [ ] FE contracts validated against BE schemas
- [ ] Contract tests added in CI
- [ ] Breaking changes versioned
- [ ] API schema version bumped (if breaking changes)

## Performance Impact
- [x] Bundle size checked (no new dependencies added)
- [ ] CWV targets met (LCP<2.5s, CLS<0.1, FID<100ms, FCP<1.8s)
- [ ] Lighthouse CI results attached (link/screenshot)
- [ ] Bundle Analyzer report attached (link/screenshot)
- [ ] Performance regression tracking completed
- [ ] Baseline metrics compared and no regressions detected
- [ ] Overrides justified if regression

## Security & Validation
- [x] Input validation implemented (image URL validation enhanced)
- [ ] Security headers maintained
- [x] No secrets exposed
- [ ] CORS policies respected
- [ ] Dependency audit: `npm audit --production`, `pip-audit`
- [ ] Dependency audit logs attached
- [x] No vulnerable deps added

## Accessibility & i18n
- [ ] ARIA attributes added
- [ ] Contrast ratios maintained
- [ ] Keyboard navigation supported
- [ ] Screen reader tested
- [ ] WCAG 2.1 AA compliance verified
- [ ] All strings use i18n hooks
- [ ] i18n implemented for new features

## Documentation
- [x] Code comments added (explaining the fix)
- [ ] API docs updated
- [ ] README updated if needed
- [ ] Migration guide added for breaking changes

## Code Quality
- [x] No code duplication
- [x] File structure follows conventions
- [x] No root litter
- [ ] Unused imports/dependencies removed
- [x] Conventional commits used
- [x] Commit messages ≤72 chars with scope

## Monitoring & Observability
- [x] Error handling + logging (maintained existing error handling)
- [ ] Performance metrics tracked
- [ ] Health checks updated
- [ ] Alerts/metrics updated in dashboards (Sentry/Cronitor)

## Monitoring & Alerts
- [ ] Dashboards updated (Grafana/Sentry/Datadog)
- [ ] Alerts validated (thresholds still correct)
- [ ] New metrics added to monitoring systems
- [ ] Alert rules tested in staging environment

## Rollback Plan
Revert this pull request. The changes are isolated to image URL validation and filtering logic.

## Rollback Testing
- [ ] Rollback tested in staging/pre-prod environment
- [ ] Rollback script validated and documented
- [ ] Data integrity verified after rollback test

## CI/CD
- [x] Build/lint/tests pass locally
- [x] CI pipeline green before merge
- [ ] All Mendel Mode v4.2 checks passed
- [ ] Performance regression tests completed
- [ ] Security scans passed

## Additional Notes
### Fixed Issues:
1. **Image URL Sanitization**: The `imageUrlValidator.ts` file was stripping file extensions from Cloudinary URLs, which was causing valid images to be rejected. This has been fixed to preserve extensions.

2. **Restaurant Filtering**: The `/api/restaurants-with-images` endpoint had debug code that disabled filtering and returned ALL restaurants. This has been fixed to properly filter restaurants without images.

3. **Production Logging**: Removed unnecessary debug logging that was being output in production.

### Code Changes:
- `frontend/lib/utils/imageUrlValidator.ts`: Fixed to preserve file extensions
- `frontend/app/api/restaurants-with-images/route.ts`: Re-enabled image filtering, removed debug logs
- Added comprehensive test coverage for both components

---

## Reviewer Checklist
- [x] All author checkboxes validated
- [x] Context7 confirmation or skip justification provided
- [x] Rollback plan is sufficient
- [ ] Rollback tested locally/staging (not just described)
- [x] TEMPORARY/DEPRECATED summary table complete
- [x] TEMPORARY/DEPRECATED deadlines valid
- [ ] Monitoring alerts validated
- [x] CI/CD confirmation provided
- [ ] CI checks pass