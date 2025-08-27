# Logging Standards

This document outlines the logging standards and best practices for the Jewgo application.

## Overview

All logging in the application should use the structured `appLogger` from `@/lib/utils/logger` instead of direct `console.log` statements. This ensures consistent formatting, proper error handling, and better debugging capabilities.

## Logger Import

```typescript
import { appLogger } from '@/lib/utils/logger';
```

## Log Levels

### Debug
Use for detailed debugging information that is only needed during development.

```typescript
appLogger.debug('Component initialized', { componentName, props });
```

### Info
Use for general information about application flow.

```typescript
appLogger.info('User logged in successfully', { userId, method });
```

### Warn
Use for warnings that don't break functionality but should be investigated.

```typescript
appLogger.warn('API rate limit approaching', { endpoint, remainingCalls });
```

### Error
Use for errors that affect functionality but don't crash the application.

```typescript
appLogger.error('Failed to fetch user data', { userId, error: String(error) });
```

## Best Practices

### 1. Structured Context
Always provide context as the second parameter:

```typescript
// ✅ Good
appLogger.debug('Fetching restaurants', { 
  filters, 
  page, 
  limit 
});

// ❌ Bad
console.log('Fetching restaurants:', filters, page, limit);
```

### 2. Error Handling
Always convert errors to strings when logging:

```typescript
// ✅ Good
appLogger.error('API call failed', { 
  endpoint, 
  error: String(error) 
});

// ❌ Bad
appLogger.error('API call failed', { error });
```

### 3. Sensitive Data
Never log sensitive information like passwords, tokens, or personal data:

```typescript
// ✅ Good
appLogger.info('User authentication', { 
  userId, 
  method: 'oauth' 
});

// ❌ Bad
appLogger.info('User authentication', { 
  userId, 
  token: 'secret-token-here' 
});
```

### 4. Performance Considerations
Use debug level for verbose logging that might impact performance:

```typescript
// ✅ Good - only logs in development
appLogger.debug('Processing large dataset', { 
  recordCount, 
  processingTime 
});

// ❌ Bad - always logs
console.log('Processing large dataset:', recordCount, processingTime);
```

## Migration from console.log

### Before
```typescript
console.log('Component mounted:', props);
console.error('API error:', error);
console.warn('Deprecated feature used');
```

### After
```typescript
appLogger.debug('Component mounted', { props });
appLogger.error('API error', { error: String(error) });
appLogger.warn('Deprecated feature used');
```

## Environment-Specific Behavior

- **Development**: All log levels are displayed
- **Production**: Only `warn` and `error` levels are displayed
- **Testing**: Logging can be controlled via test mode flags

## Testing

When testing components with logging, you can use test mode to control verbosity:

```typescript
// In test mode, logging is more verbose
<CustomHoursSelector testMode={true} />
```

## ESLint Rules

The project includes ESLint rules to enforce logging standards:

- `no-console`: Prevents direct console usage
- `@typescript-eslint/no-unused-vars`: Catches unused variables
- Custom rules for structured logging patterns

## Common Patterns

### API Calls
```typescript
appLogger.debug('Making API request', { endpoint, params });
try {
  const response = await apiCall(params);
  appLogger.debug('API response received', { endpoint, status: response.status });
  return response;
} catch (error) {
  appLogger.error('API request failed', { endpoint, error: String(error) });
  throw error;
}
```

### Component Lifecycle
```typescript
useEffect(() => {
  appLogger.debug('Component mounted', { componentName });
  return () => {
    appLogger.debug('Component unmounting', { componentName });
  };
}, []);
```

### Form Validation
```typescript
const handleSubmit = async (data) => {
  appLogger.debug('Form submission started', { formType });
  try {
    await submitForm(data);
    appLogger.info('Form submitted successfully', { formType });
  } catch (error) {
    appLogger.error('Form submission failed', { formType, error: String(error) });
  }
};
```

## Maintenance

- Regularly review and clean up debug logs
- Update logging context as features evolve
- Monitor log volume in production
- Use log aggregation tools for better debugging
