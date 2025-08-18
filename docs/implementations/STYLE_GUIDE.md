# JewGo Code Style Guide

## 🚫 Prohibited Practices

### Console Statements
- ❌ **NEVER** use `console.log`, `console.warn`, `console.info` in production code
- ✅ **ONLY** `console.error` is allowed (commented out for production)
- 🔧 Use proper logging libraries for production debugging

### Code Style Requirements
- ✅ **ALWAYS** use curly braces in if statements: `if (condition) { ... }`
- ✅ **ALWAYS** escape quotes in JSX: use `&quot;` instead of `"`
- ✅ **ALWAYS** prefix unused variables with underscore: `_unusedVar`

## 🛠️ ESLint Rules Enforced

```json
{
  "no-console": ["error", { "allow": ["error"] }],
  "curly": ["error", "all"],
  "react/no-unescaped-entities": "error",
  "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
}
```

## 🔄 Pre-commit Hooks

The following checks run automatically:
1. **ESLint** - Code style and quality
2. **TypeScript** - Type checking
3. **Build Test** - Compilation verification

## 📝 Quick Fixes

### Console Statements
```javascript
// ❌ Wrong
console.log('Debug info');

// ✅ Correct (only for errors, and commented in production)
// console.error('Critical error:', error);
```

### Curly Braces
```javascript
// ❌ Wrong
if (condition) return;

// ✅ Correct
if (condition) {
  return;
}
```

### JSX Quotes
```jsx
// ❌ Wrong
<p>Click "Submit" to continue</p>

// ✅ Correct
<p>Click &quot;Submit&quot; to continue</p>
```

## 🚀 Development Workflow

1. Write code following these guidelines
2. Pre-commit hooks will catch issues automatically
3. Fix any linting errors before committing
4. All commits must pass build test

This ensures production-ready, clean code at all times!
