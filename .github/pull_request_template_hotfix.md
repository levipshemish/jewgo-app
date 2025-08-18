## Reason Why
<!-- Why is this hotfix needed? What urgent problem does it solve? -->

## Change Impact
<!-- What systems/features will this affect? Any breaking changes? -->

## Mini-Changelog
<!-- Brief summary of changes in CHANGELOG.md style -->
<!-- Example: -->
<!-- - fix(auth): resolve login timeout issue -->
<!-- - fix(ui): correct button alignment in navbar -->

---

## Hotfix Validation
- [ ] Issue is urgent/critical (production outage, security vulnerability, etc.)
- [ ] Change is minimal and targeted (no feature additions)
- [ ] No new dependencies added
- [ ] No breaking changes introduced
- [ ] Context7 skipped (justification: ________)
- [ ] Rollback plan documented and tested

## Testing
- [ ] Manual testing completed
- [ ] Regression testing performed
- [ ] No new tests required (existing coverage sufficient)

## Security & Validation
- [ ] No secrets exposed
- [ ] Input validation maintained
- [ ] Security headers unchanged

## Performance Impact
- [ ] No performance regression introduced
- [ ] Bundle size impact minimal (<10KB increase)

## Rollback Plan
<!-- How to rollback safely -->

## CI/CD
- [ ] Build/lint/tests pass locally
- [ ] CI pipeline green before merge
- [ ] Hotfix urgency validated

## Additional Notes
<!-- Anything else reviewers should know -->

---

## Reviewer Checklist
- [ ] Hotfix justification is valid
- [ ] Change is minimal and targeted
- [ ] Context7 skip justification provided
- [ ] Rollback plan is sufficient
- [ ] CI checks pass
