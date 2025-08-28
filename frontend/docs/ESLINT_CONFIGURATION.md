# ESLint Configuration Guide

## Overview

This project uses a strict ESLint configuration to maintain code quality and prevent common issues. The configuration is designed to catch unused variables, enforce TypeScript best practices, and ensure consistent code style.

## Configuration

### Main Rules

- **Unused Variables**: Error-level enforcement with support for intentional unused variables (prefixed with `_`)
- **TypeScript**: Strict TypeScript rules with exceptions for common patterns
- **React Hooks**: Enforces React hooks rules
- **Code Style**: Consistent formatting and best practices

### Key Rules

```json
{
  "@typescript-eslint/no-unused-vars": ["error", { 
    "argsIgnorePattern": "^_",
    "varsIgnorePattern": "^_",
    "caughtErrorsIgnorePattern": "^_",
    "destructuredArrayIgnorePattern": "^_"
  }],
  "@typescript-eslint/no-explicit-any": "off",
  "react-hooks/rules-of-hooks": "error",
  "prefer-const": "error",
  "no-console": ["error", { "allow": ["error"] }]
}
```

## Usage

### Available Scripts

```bash
# Basic linting
npm run lint

# Auto-fix issues
npm run lint:fix

# Strict linting (no warnings allowed)
npm run lint:strict

# Check for unused variables specifically
npm run lint:unused

# Compact format output
npm run lint:check
```

### Auto-Fix Script

Use the auto-fix script to automatically resolve fixable issues:

```bash
./scripts/lint-fix.sh
```

## Best Practices

### Handling Unused Variables

1. **Remove truly unused variables**: If a variable is not needed, remove it completely
2. **Use underscore prefix**: For intentionally unused variables, prefix with `_`
3. **Implement proper error handling**: Use error variables in catch blocks

### Examples

```typescript
// ❌ Bad - unused variable
const unusedVar = 'something';

// ✅ Good - removed unused variable
// Variable removed

// ✅ Good - intentionally unused (prefixed with _)
const { data, _unused } = someFunction();

// ✅ Good - error handling
try {
  // some code
} catch (error) {
  console.error('Error occurred:', error);
}

// ✅ Good - intentionally unused error
try {
  // some code
} catch (_error) {
  // Handle error without using the error object
}
```

### Error Handling Patterns

```typescript
// For catch blocks where you don't need the error object
try {
  // some code
} catch {
  // Handle error without error object
}

// For catch blocks where you might need the error object later
try {
  // some code
} catch (_error) {
  // Handle error, error object available if needed
}
```

## Pre-commit Integration

The project includes pre-commit hooks that run ESLint automatically. This ensures that:

1. All committed code passes linting
2. Unused variables are caught before commit
3. Code style is consistent

## Troubleshooting

### Common Issues

1. **Unused variable warnings**: Remove the variable or prefix with `_`
2. **Console.log warnings**: Use `console.error` for errors, remove other console statements
3. **TypeScript errors**: Fix type issues or add proper type annotations

### Disabling Rules (Not Recommended)

Only disable ESLint rules when absolutely necessary:

```typescript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const intentionallyUnused = 'something';
```

## Maintenance

### Regular Tasks

1. **Weekly**: Run `npm run lint:strict` to check for new issues
2. **Before commits**: Run `npm run lint:fix` to auto-fix issues
3. **Monthly**: Review and update ESLint configuration if needed

### Configuration Updates

When updating ESLint configuration:

1. Test with existing codebase
2. Update documentation
3. Notify team of changes
4. Run full linting to identify new issues

## Integration with CI/CD

The ESLint configuration is integrated into the CI/CD pipeline:

- **Pre-commit**: Automatic linting and fixing
- **CI Pipeline**: Linting as part of build process
- **Quality Gates**: Linting must pass for deployment

## Resources

- [ESLint Documentation](https://eslint.org/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [React ESLint Plugin](https://github.com/jsx-eslint/eslint-plugin-react)
