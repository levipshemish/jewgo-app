# Test and Demo Files Management Guidelines

## Overview
This document establishes comprehensive guidelines for managing test and demo files in the JewGo project to prevent codebase bloat, maintain clean development practices, and ensure proper file organization.

## Table of Contents
1. [File Classification](#file-classification)
2. [Naming Conventions](#naming-conventions)
3. [Directory Structure](#directory-structure)
4. [File Lifecycle Management](#file-lifecycle-management)
5. [Cleanup Procedures](#cleanup-procedures)
6. [Best Practices](#best-practices)
7. [Automated Tools](#automated-tools)
8. [Compliance Checklist](#compliance-checklist)

## File Classification

### Test Files
Files created for testing purposes during development:

#### Allowed Test Files
- **Unit Tests**: `*.test.js`, `*.test.ts`, `*.spec.js`, `*.spec.ts`
- **Integration Tests**: `*.integration.test.js`, `*.integration.spec.js`
- **E2E Tests**: `*.e2e.test.js`, `*.e2e.spec.js`
- **Test Utilities**: `test-utils.js`, `test-helpers.js`
- **Test Configuration**: `jest.config.js`, `cypress.config.js`
- **Test Data**: `test-data.json`, `fixtures/`

#### Temporary Test Files (Must be cleaned up)
- **Debug Files**: `debug-*.js`, `temp-*.js`, `test-*.js` (not in test directories)
- **Temporary Scripts**: `temp-script.js`, `quick-test.js`
- **Test Pages**: `test-*.tsx`, `debug-*.tsx` (not in test directories)
- **Temporary Components**: `TestComponent.tsx`, `DebugComponent.tsx`

### Demo Files
Files created for demonstration or proof-of-concept purposes:

#### Allowed Demo Files
- **Documentation Demos**: `docs/demos/`
- **Example Components**: `examples/`
- **Prototype Files**: `prototypes/` (with clear documentation)

#### Temporary Demo Files (Must be cleaned up)
- **Quick Demos**: `demo-*.js`, `example-*.js`
- **Temporary Prototypes**: `prototype-*.js`, `poc-*.js`
- **Demo Pages**: `demo-*.tsx`, `example-*.tsx`

### Development Files
Files created during development that should be temporary:

#### Must Clean Up
- **Development Scripts**: `dev-*.js`, `setup-*.js`
- **Temporary Configs**: `temp-config.json`, `dev-config.js`
- **Debug Output**: `debug.log`, `temp.log`
- **Temporary Data**: `temp-data.json`, `sample-data.json`

## Naming Conventions

### Test Files
```
✅ Allowed Patterns:
- ComponentName.test.tsx
- ComponentName.spec.tsx
- utils.test.ts
- api.test.ts
- __tests__/ComponentName.test.tsx

❌ Prohibited Patterns:
- test-ComponentName.tsx
- debug-ComponentName.tsx
- temp-ComponentName.tsx
- TestComponentName.tsx
```

### Demo Files
```
✅ Allowed Patterns:
- docs/demos/DemoName.tsx
- examples/ExampleName.tsx
- prototypes/PrototypeName.tsx

❌ Prohibited Patterns:
- demo-ComponentName.tsx
- example-ComponentName.tsx
- prototype-ComponentName.tsx
- DemoComponentName.tsx
```

### Temporary Files
```
✅ Allowed Patterns (with cleanup):
- temp-script-YYYYMMDD.js
- debug-component-YYYYMMDD.tsx
- test-page-YYYYMMDD.tsx

❌ Prohibited Patterns:
- temp.js
- debug.tsx
- test.tsx
- temp-*.js (without date)
```

## Directory Structure

### Recommended Structure
```
project/
├── __tests__/                    # Unit and integration tests
│   ├── components/
│   ├── utils/
│   └── api/
├── cypress/                      # E2E tests
│   ├── e2e/
│   └── fixtures/
├── docs/
│   └── demos/                    # Documentation demos
├── examples/                     # Example implementations
├── prototypes/                   # Prototype implementations
├── test-utils/                   # Test utilities
└── temp/                         # Temporary files (auto-cleanup)
```

### Prohibited Locations
```
❌ Do not place test/demo files in:
- app/ (except __tests__/)
- components/ (except __tests__/)
- lib/ (except __tests__/)
- public/ (except test assets)
- root directory
```

## File Lifecycle Management

### Creation Phase
1. **Determine File Type**: Classify as test, demo, or temporary
2. **Choose Location**: Place in appropriate directory
3. **Use Proper Naming**: Follow naming conventions
4. **Add Documentation**: Document purpose and cleanup timeline
5. **Set Expiration**: Mark with cleanup date

### Development Phase
1. **Regular Review**: Weekly review of temporary files
2. **Update Documentation**: Keep documentation current
3. **Monitor Usage**: Track if file is still needed
4. **Version Control**: Commit with clear messages

### Cleanup Phase
1. **Review Necessity**: Determine if file is still needed
2. **Archive if Valuable**: Move to examples/ or docs/
3. **Delete if Temporary**: Remove temporary files
4. **Update References**: Remove any references to deleted files
5. **Document Changes**: Update documentation

## Cleanup Procedures

### Automated Cleanup
```bash
# Run automated cleanup
npm run cleanup:run daily

# Check for temporary files
npm run cleanup:monitor

# Manual cleanup of specific patterns
find . -name "temp-*.js" -delete
find . -name "debug-*.tsx" -delete
find . -name "test-*.tsx" -not -path "./__tests__/*" -delete
```

### Manual Cleanup Checklist
- [ ] Review all `temp-*` files
- [ ] Review all `debug-*` files
- [ ] Review all `test-*` files (not in test directories)
- [ ] Review all `demo-*` files
- [ ] Review all `example-*` files
- [ ] Check for orphaned test components
- [ ] Remove unused test utilities
- [ ] Clean up temporary configurations
- [ ] Remove debug logs and outputs

### Cleanup Frequency
- **Daily**: Automated cleanup of temporary files
- **Weekly**: Manual review of test and demo files
- **Monthly**: Comprehensive cleanup and documentation update
- **Before Releases**: Full cleanup and validation

## Best Practices

### Test File Best Practices
1. **Use Proper Test Directories**: Always place tests in `__tests__/` or test directories
2. **Follow Testing Conventions**: Use `.test.js` or `.spec.js` extensions
3. **Keep Tests Focused**: Each test file should test one component or utility
4. **Clean Up After Tests**: Remove any temporary files created during tests
5. **Document Test Purpose**: Add comments explaining test scenarios

### Demo File Best Practices
1. **Use Dedicated Directories**: Place demos in `docs/demos/` or `examples/`
2. **Document Purpose**: Clearly document what the demo demonstrates
3. **Keep Demos Simple**: Focus on demonstrating specific features
4. **Version Control**: Include demos in version control for reference
5. **Regular Updates**: Keep demos current with codebase changes

### Temporary File Best Practices
1. **Use Descriptive Names**: Include purpose and date in filename
2. **Set Expiration Dates**: Mark files with intended cleanup date
3. **Document Purpose**: Add comments explaining why file was created
4. **Regular Review**: Review temporary files weekly
5. **Clean Up Promptly**: Remove files as soon as they're no longer needed

### Development Workflow
1. **Create with Purpose**: Only create files that serve a specific purpose
2. **Use Branches**: Create feature branches for experimental work
3. **Document Changes**: Document why files were created
4. **Review Regularly**: Regular review prevents accumulation
5. **Clean Up Before Committing**: Remove temporary files before commits

## Automated Tools

### Cleanup Scripts
```bash
# Automated cleanup scripts
npm run cleanup:temp-files      # Clean temporary files
npm run cleanup:unused-files    # Remove unused files
npm run cleanup:test-files      # Clean up test artifacts
npm run cleanup:demo-files      # Clean up demo artifacts
```

### Monitoring Tools
```bash
# Monitoring and reporting
npm run cleanup:monitor         # Monitor cleanup operations
npm run cleanup:status          # Check cleanup status
npm run cleanup:report          # Generate cleanup report
```

### Validation Tools
```bash
# Validation scripts
npm run validate:test-files     # Validate test file structure
npm run validate:demo-files     # Validate demo file structure
npm run validate:naming         # Validate file naming conventions
```

## Compliance Checklist

### Before Creating Test/Demo Files
- [ ] Is the file necessary for development?
- [ ] Is it placed in the correct directory?
- [ ] Does it follow naming conventions?
- [ ] Is it properly documented?
- [ ] Does it have a cleanup plan?

### During Development
- [ ] Are temporary files being cleaned up regularly?
- [ ] Are test files in proper test directories?
- [ ] Are demo files properly documented?
- [ ] Are naming conventions being followed?
- [ ] Is documentation being updated?

### Before Committing
- [ ] Are all temporary files removed?
- [ ] Are test files in correct locations?
- [ ] Are demo files properly organized?
- [ ] Is documentation current?
- [ ] Are naming conventions followed?

### Before Releases
- [ ] Has comprehensive cleanup been performed?
- [ ] Are all temporary files removed?
- [ ] Are test files properly organized?
- [ ] Are demo files current and documented?
- [ ] Has documentation been updated?

## File Retention Policies

### Test Files
- **Unit Tests**: Keep indefinitely (part of codebase)
- **Integration Tests**: Keep indefinitely (part of codebase)
- **E2E Tests**: Keep indefinitely (part of codebase)
- **Test Utilities**: Keep indefinitely (part of codebase)
- **Temporary Test Files**: Delete after 7 days

### Demo Files
- **Documentation Demos**: Keep indefinitely (part of documentation)
- **Example Implementations**: Keep indefinitely (part of examples)
- **Prototype Files**: Review monthly, keep if valuable
- **Temporary Demos**: Delete after 14 days

### Development Files
- **Temporary Scripts**: Delete after 3 days
- **Debug Files**: Delete after 1 day
- **Temporary Configs**: Delete after 7 days
- **Debug Output**: Delete after 1 day
- **Temporary Data**: Delete after 7 days

## Enforcement

### Automated Enforcement
- **Daily Cleanup**: Automated cleanup of temporary files
- **Weekly Scans**: Automated detection of non-compliant files
- **Pre-commit Hooks**: Validation before commits
- **CI/CD Checks**: Validation in deployment pipeline

### Manual Enforcement
- **Code Reviews**: Review file organization and naming
- **Regular Audits**: Monthly audits of file structure
- **Team Guidelines**: Team awareness and training
- **Documentation**: Keep guidelines current and accessible

## Examples

### Good Test File Structure
```
__tests__/
├── components/
│   ├── Button.test.tsx
│   ├── Card.test.tsx
│   └── Navigation.test.tsx
├── utils/
│   ├── api.test.ts
│   ├── validation.test.ts
│   └── helpers.test.ts
└── integration/
    ├── auth.test.ts
    └── search.test.ts
```

### Good Demo File Structure
```
docs/
└── demos/
    ├── ButtonVariants.tsx
    ├── FormValidation.tsx
    └── SearchFunctionality.tsx

examples/
├── CustomComponents.tsx
├── AdvancedUsage.tsx
└── IntegrationExamples.tsx
```

### Bad File Structure (Avoid)
```
app/
├── test-button.tsx          ❌ Test file in app directory
├── debug-navigation.tsx     ❌ Debug file in app directory
└── temp-script.js           ❌ Temporary file in app directory

components/
├── TestComponent.tsx        ❌ Test component in components directory
├── DemoCard.tsx            ❌ Demo component in components directory
└── temp-utils.js           ❌ Temporary file in components directory
```

## Conclusion

Following these guidelines ensures:
- **Clean Codebase**: Prevents accumulation of unnecessary files
- **Better Organization**: Clear structure for test and demo files
- **Easier Maintenance**: Automated cleanup and monitoring
- **Team Consistency**: Standardized practices across the team
- **Quality Assurance**: Proper testing and demonstration practices

**Remember**: The goal is to maintain a clean, organized, and maintainable codebase while still allowing for effective development, testing, and demonstration of features.

---

**Last Updated**: 2025-08-25
**Version**: 1.0.0
**Maintainer**: Development Team
