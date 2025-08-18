# Mendel Mode v4.2 Implementation Guide

## Overview

This document describes the implementation of Mendel Mode v4.2 rules and CI enforcement in the JewGo project. The implementation provides comprehensive code quality enforcement, progressive enhancement tracking, and systematic development practices.

## What's Been Implemented

### 1. Core Rules File
- **Location**: `RULES.md` (root)
- **Purpose**: Comprehensive engineering ruleset for Cursor AI and development workflow
- **Sections**: 23 sections covering everything from Context7 integration to progressive enhancement

### 2. CI Enforcement Bundle
- **Location**: `ci-scripts/` directory
- **Purpose**: Automated enforcement of Mendel Mode v4.2 rules

#### CI Scripts Implemented:

##### `phase_tracking.sh`
- **Purpose**: Tracks progressive enhancement phases (P0, P1, P2)
- **Features**:
  - Counts features by phase across the codebase
  - Calculates phase distribution percentages
  - Warns about tech debt (too many P0 features)
  - Reports detailed feature breakdown
- **Usage**: `bash ci-scripts/phase_tracking.sh`

##### `temp_file_check.sh`
- **Purpose**: Enforces temporary file cleanup deadlines
- **Features**:
  - Finds files marked with `// TEMPORARY:`
  - Validates cleanup deadlines
  - Fails builds for expired temporary files
  - Reports missing deadlines
- **Usage**: `bash ci-scripts/temp_file_check.sh`

##### `dup_scan.js`
- **Purpose**: Prevents code duplication
- **Features**:
  - Scans for duplicate filenames (3+ occurrences)
  - Detects duplicate exported symbols
  - Ignores expected duplicates (index.ts, etc.)
  - Fails builds on suspicious duplication
- **Usage**: `node ci-scripts/dup_scan.js`

##### `fe_coverage_gate.js`
- **Purpose**: Enforces 80% frontend test coverage
- **Features**:
  - Reads coverage from `coverage/coverage-summary.json`
  - Configurable threshold (default: 80%)
  - Fails builds below threshold
- **Usage**: `node ci-scripts/fe_coverage_gate.js 80 coverage/coverage-summary.json`

##### `root_litter_check.sh`
- **Purpose**: Prevents root directory clutter
- **Features**:
  - Maintains allowlist of permitted root files
  - Fails builds for unauthorized root files
  - Comprehensive allowlist for common config files
- **Usage**: `bash ci-scripts/root_litter_check.sh`

##### `deprecation_check.sh`
- **Purpose**: Tracks deprecated code
- **Features**:
  - Counts `DEPRECATED:` markers
  - Reports deprecation counts
  - Configurable to fail builds (currently reporting only)
- **Usage**: `bash ci-scripts/deprecation_check.sh`

##### `context7_guard.sh`
- **Purpose**: Enforces Context7 documentation usage
- **Features**:
  - Checks PR body for Context7 acknowledgment
  - Fails PRs without Context7 confirmation
  - Ensures documentation consultation
- **Usage**: `bash ci-scripts/context7_guard.sh "$EVENT_PATH"`

### 3. Git Hooks & Commit Discipline
- **Location**: `.husky/commit-msg`
- **Purpose**: Enforces 72-char commit message limit
- **Configuration**: `commitlint.config.js`

### 4. PR Template
- **Location**: `.github/pull_request_template.md`
- **Purpose**: Enforces comprehensive PR requirements
- **Sections**:
  - Reason Why, Dependencies, Success Criteria
  - Context7 Documentation checklist
  - Progressive Enhancement Phase tracking
  - Testing, Performance, Security checklists
  - Code Quality and Accessibility requirements

### 5. Enhanced CI Workflow
- **Location**: `.github/workflows/ci.yml`
- **Enhancements**:
  - Mendel Mode v4.2 enforcement in frontend job
  - Mendel Mode v4.2 enforcement in backend job
  - New governance job for Context7 validation
  - Coverage gates and quality checks

### 6. Frontend Scripts
- **Location**: `frontend/package.json`
- **New Scripts**:
  - `mendel:phase-track`: Run phase tracking
  - `mendel:temp-check`: Check temporary files
  - `mendel:dup-scan`: Run duplication scan
  - `mendel:root-check`: Check root litter
  - `mendel:deprecation-check`: Check deprecations
  - `mendel:all`: Run all Mendel Mode checks

## How to Use

### For Developers

#### 1. Progressive Enhancement Phases
Mark your features with phases:
```typescript
// PHASE: P0 - Basic user authentication
export function loginUser(credentials: LoginCredentials) {
  // Core functionality only
}

// PHASE: P1 - Add validation and error handling
export function loginUser(credentials: LoginCredentials) {
  // Full validation + error handling + tests
}

// PHASE: P2 - Add analytics and optimization
export function loginUser(credentials: LoginCredentials) {
  // Analytics + performance optimization + accessibility
}
```

#### 2. Temporary Files
Mark temporary files with cleanup deadlines:
```typescript
// TEMPORARY: Quick prototype for user feedback. Cleanup by: 2025-09-01
export function experimentalFeature() {
  // Temporary implementation
}
```

#### 3. Deprecated Code
Mark deprecated code for cleanup:
```typescript
// DEPRECATED: Replaced by new API. Removal target: 2025-09-01
export function oldFunction() {
  // Old implementation
}
```

#### 4. Commit Messages
Keep commit messages under 72 characters:
```bash
git commit -m "feat: add user authentication system"
git commit -m "fix: resolve login validation bug"
git commit -m "docs: update API documentation"
```

#### 5. PR Requirements
Use the PR template and ensure:
- Context7 documentation was consulted
- Progressive enhancement phase is marked
- All checkboxes are completed
- Temporary files have cleanup dates

### For CI/CD

#### 1. Local Testing
Run Mendel Mode checks locally:
```bash
# Frontend directory
npm run mendel:all

# Or individual checks
npm run mendel:phase-track
npm run mendel:temp-check
npm run mendel:dup-scan
```

#### 2. CI Pipeline
The CI pipeline automatically runs:
- Progressive enhancement tracking
- Temporary file cleanup checks
- Duplication scanning
- Root litter prevention
- Coverage gates (80% threshold)
- Deprecation tracking
- Context7 validation (PRs only)

## Configuration

### Adjusting Thresholds

#### Coverage Threshold
Edit `ci-scripts/fe_coverage_gate.js`:
```javascript
const threshold = Number(process.argv[2] || 80); // Change default
```

#### Duplication Threshold
Edit `ci-scripts/dup_scan.js`:
```javascript
if (arr.length > 2) { // Change from 3 to 2 for stricter
```

#### Phase Warning Threshold
Edit `ci-scripts/phase_tracking.sh`:
```bash
if [ "$p0_count" -gt 5 ]; then # Change from 5 to 3 for stricter
```

### Root File Allowlist
Edit `ci-scripts/root_litter_check.sh`:
```bash
ALLOWED=(
  "README.md" "RULES.md" "LICENSE" # Add your files here
)
```

## Monitoring & Reporting

### Phase Distribution Dashboard
The phase tracking script provides:
- Feature counts by phase
- Percentage distribution
- Tech debt warnings
- Detailed feature lists

### Temporary File Management
The temp file check provides:
- Total temporary files count
- Expired files list
- Missing deadlines report
- Days remaining for each file

### Duplication Analysis
The dup scan provides:
- Duplicate filename detection
- Duplicate symbol detection
- File locations for each duplicate

## Troubleshooting

### Common Issues

#### 1. CI Failing on Temporary Files
**Problem**: Expired temporary files blocking merge
**Solution**: 
```bash
# Clean up expired files
git rm <expired-file>
# Or extend deadline
# TEMPORARY: <purpose>. Cleanup by: 2024-03-01
```

#### 2. Coverage Below 80%
**Problem**: Frontend tests not meeting coverage threshold
**Solution**:
```bash
# Add more tests
npm run test:coverage
# Check coverage report
open coverage/lcov-report/index.html
```

#### 3. Duplication Warnings
**Problem**: Legitimate duplicates flagged
**Solution**:
- Refactor to eliminate duplication
- Document exceptions in PR description
- Consider creating shared utilities

#### 4. Context7 Guard Failing
**Problem**: PR missing Context7 acknowledgment
**Solution**:
- Add Context7 confirmation to PR body
- Use PR template to ensure compliance
- Document which libraries were consulted

### Debugging Scripts

#### Manual Script Execution
```bash
# Test individual scripts
bash ci-scripts/phase_tracking.sh
bash ci-scripts/temp_file_check.sh
node ci-scripts/dup_scan.js

# Check script permissions
ls -la ci-scripts/
chmod +x ci-scripts/*.sh
```

#### Verbose Output
Add debug flags to scripts:
```bash
# Add set -x for verbose output
set -x
bash ci-scripts/phase_tracking.sh
```

## Best Practices

### 1. Progressive Enhancement
- Start with P0 (core functionality)
- Move to P1 within 48 hours
- Target P2 for polish features
- Use phase markers consistently

### 2. Temporary Code Management
- Always set cleanup deadlines
- Keep temporary files minimal
- Convert to permanent structure when possible
- Document purpose clearly

### 3. Code Quality
- Run Mendel Mode checks before committing
- Address warnings promptly
- Use PR template consistently
- Maintain 80% test coverage

### 4. Documentation
- Consult Context7 for all new dependencies
- Document API patterns from official docs
- Update documentation with code changes
- Include migration guides for breaking changes

## Future Enhancements

### Planned Features
1. **Performance Budget Monitoring**: Bundle size tracking
2. **Contract Testing**: FE/BE API validation
3. **Automated Cleanup**: Scheduled temporary file removal
4. **Dashboard Integration**: Visual phase tracking
5. **Slack Notifications**: Real-time Mendel Mode alerts

### Customization Options
1. **Configurable Thresholds**: Environment-specific settings
2. **Team-Specific Rules**: Custom rule sets
3. **Integration APIs**: External tool integration
4. **Analytics**: Code quality metrics tracking

## Support

For issues or questions:
1. Check this documentation
2. Review CI logs for specific errors
3. Test scripts locally for debugging
4. Consult the Mendel Mode v4.2 rules in `RULES.md`

## Migration from Previous Versions

If migrating from Mendel Mode v4.1:
1. Review rule changes in `RULES.md`
2. Update existing code to use new phase markers
3. Add cleanup deadlines to temporary files
4. Ensure Context7 documentation usage
5. Update CI configurations if needed
