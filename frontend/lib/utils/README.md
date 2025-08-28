# Enhanced Utilities Documentation

## Overview

This directory contains enhanced utility functions with comprehensive type safety and improved error handling for the JewGo application. The utilities are organized into three main categories:

1. **Component Utilities** - React component event handlers and state management
2. **Form Validation** - Form validation with Zod schemas and error handling
3. **Image Processing** - Image validation, processing, and URL handling

## Quick Start

```typescript
import {
  // Enhanced component utilities
  handleEscapeEnhanced,
  handleSubmitEnhanced,
  useComponentUtils,
  
  // Enhanced form validation
  validateFormEnhanced,
  emailSchemaEnhanced,
  validationUtilsEnhanced,
  
  // Enhanced image processing
  isValidImageUrlEnhanced,
  getSafeImageUrlEnhanced,
  imageUtilsEnhanced,
} from '../lib/utils';
```

## Component Utilities

### Enhanced Event Handlers

#### `handleEscapeEnhanced`

Enhanced escape key handler with proper typing and error handling.

```typescript
import { handleEscapeEnhanced } from '../lib/utils';

const MyComponent = () => {
  const handleClose = () => {
    // Close modal or dropdown
  };

  return (
    <div onKeyDown={(e) => handleEscapeEnhanced(e, handleClose, true)}>
      {/* Modal content */}
    </div>
  );
};
```

#### `handleSubmitEnhanced`

Enhanced form submission handler with validation and error handling.

```typescript
import { handleSubmitEnhanced, emailSchemaEnhanced } from '../lib/utils';

const MyForm = () => {
  const handleFormSubmit = async (data: any) => {
    // Process form data
  };

  const validator = (data: any) => {
    const result = emailSchemaEnhanced.safeParse(data.email);
    return {
      isValid: result.success,
      errors: result.success ? [] : ['Invalid email']
    };
  };

  return (
    <form onSubmit={(e) => handleSubmitEnhanced(e, handleFormSubmit, validator)}>
      {/* Form fields */}
    </form>
  );
};
```

#### `handleFileUploadEnhanced`

Enhanced file upload handler with validation.

```typescript
import { handleFileUploadEnhanced } from '../lib/utils';

const FileUpload = () => {
  const handleFileSelect = (file: File) => {
    // Process selected file
  };

  const config = {
    acceptedTypes: ['image/jpeg', 'image/png'],
    maxSize: 5 * 1024 * 1024, // 5MB
  };

  return (
    <input
      type="file"
      onChange={(e) => handleFileUploadEnhanced(e, handleFileSelect, config)}
    />
  );
};
```

### Performance Optimized Handlers

#### `useDebouncedSearch`

Debounced search handler for performance optimization.

```typescript
import { useDebouncedSearch } from '../lib/utils';

const SearchComponent = () => {
  const handleSearch = (query: string) => {
    // Perform search
  };

  const debouncedSearch = useDebouncedSearch(handleSearch, 300);

  return (
    <input
      type="text"
      onChange={(e) => debouncedSearch(e.target.value)}
    />
  );
};
```

#### `useThrottledScroll`

Throttled scroll handler for performance optimization.

```typescript
import { useThrottledScroll } from '../lib/utils';

const ScrollComponent = () => {
  const handleScroll = (scrollTop: number, scrollLeft: number) => {
    // Handle scroll
  };

  const throttledScroll = useThrottledScroll(handleScroll, 16);

  return (
    <div onScroll={(e) => throttledScroll(e.currentTarget.scrollTop, e.currentTarget.scrollLeft)}>
      {/* Scrollable content */}
    </div>
  );
};
```

### Hook for Component Utils

#### `useComponentUtils`

Comprehensive hook that provides all enhanced component utilities.

```typescript
import { useComponentUtils } from '../lib/utils';

const MyComponent = () => {
  const { utils, loadingState, tabState, searchState, filterState } = useComponentUtils();

  return (
    <div>
      {/* Use utils.handleEscape, utils.handleSubmit, etc. */}
    </div>
  );
};
```

## Form Validation

### Enhanced Validation Functions

#### `validateFormEnhanced`

Enhanced form validation with better error handling.

```typescript
import { validateFormEnhanced, contactFormSchemaEnhanced } from '../lib/utils';

const validateContactForm = (data: unknown) => {
  const result = validateFormEnhanced(contactFormSchemaEnhanced, data);
  
  if (result.success) {
    // Form is valid, process data
    console.log('Valid data:', result.data);
  } else {
    // Form has errors
    console.log('Validation errors:', result.errors);
  }
};
```

#### `validateFieldEnhanced`

Enhanced field validation with detailed error information.

```typescript
import { validateFieldEnhanced, emailSchemaEnhanced } from '../lib/utils';

const validateEmail = (email: string) => {
  const result = validateFieldEnhanced(emailSchemaEnhanced, email, 'email');
  
  if (result.success) {
    console.log('Valid email:', result.data);
  } else {
    console.log('Email error:', result.errors[0].message);
  }
};
```

### Enhanced Schemas

#### `emailSchemaEnhanced`

Enhanced email validation with better error messages.

```typescript
import { emailSchemaEnhanced } from '../lib/utils';

// The schema automatically:
// - Trims whitespace
// - Converts to lowercase
// - Validates email format
// - Checks length limits
```

#### `passwordSchemaEnhanced`

Enhanced password validation with security requirements.

```typescript
import { passwordSchemaEnhanced } from '../lib/utils';

// The schema requires:
// - Minimum 8 characters
// - Maximum 128 characters
// - At least one lowercase letter
// - At least one uppercase letter
// - At least one number
// - At least one special character
```

### Enhanced Validation Utilities

#### `validationUtilsEnhanced`

Enhanced validation utilities with better error handling.

```typescript
import { validationUtilsEnhanced } from '../lib/utils';

const { formatValidationErrors, hasValidationErrors, getValidationErrors } = validationUtilsEnhanced;

// Format errors for display
const formattedErrors = formatValidationErrors(validationResult.errors);

// Check if result has errors
if (hasValidationErrors(validationResult)) {
  // Handle errors
}

// Get all errors
const errors = getValidationErrors(validationResult);
```

#### `validateAsyncEnhanced`

Enhanced async validation with timeout and retry logic.

```typescript
import { validateAsyncEnhanced } from '../lib/utils';

const asyncValidator = async (data: any) => {
  // Async validation logic
  return { success: true, data };
};

const result = await validateAsyncEnhanced(
  asyncValidator,
  formData,
  5000, // timeout
  2     // retries
);
```

### Enhanced Field Validation

#### `validatePhoneEnhanced`

Enhanced phone validation with international format support.

```typescript
import { validatePhoneEnhanced } from '../lib/utils';

const phoneError = validatePhoneEnhanced('+1 (555) 123-4567');
if (phoneError) {
  console.log('Phone error:', phoneError);
}
```

#### `validateEmailEnhanced`

Enhanced email validation with domain checking.

```typescript
import { validateEmailEnhanced } from '../lib/utils';

const emailError = validateEmailEnhanced('user@example.com');
if (emailError) {
  console.log('Email error:', emailError);
}
```

## Image Processing

### Enhanced URL Validation

#### `isValidImageUrlEnhanced`

Enhanced image URL validation with comprehensive checking.

```typescript
import { isValidImageUrlEnhanced } from '../lib/utils';

const isValid = isValidImageUrlEnhanced('https://example.com/image.jpg', {
  allowedFormats: ['jpg', 'png', 'webp'],
  maxFileSize: 5 * 1024 * 1024,
  validateOnLoad: true,
});
```

#### `validateImageUrlEnhanced`

Enhanced image URL validation with detailed result.

```typescript
import { validateImageUrlEnhanced } from '../lib/utils';

const validateImage = async (url: string) => {
  const result = await validateImageUrlEnhanced(url);
  
  if (result.isValid) {
    console.log('Valid image:', result.url, result.format, result.size);
  } else {
    console.log('Invalid image:', result.error);
  }
};
```

### Enhanced URL Processing

#### `getSafeImageUrlEnhanced`

Enhanced safe image URL with comprehensive fallback handling.

```typescript
import { getSafeImageUrlEnhanced } from '../lib/utils';

const safeUrl = getSafeImageUrlEnhanced(
  'https://cloudinary.com/broken-image.jpg',
  '/images/fallback.jpg'
);
```

#### `processCloudinaryUrlEnhanced`

Enhanced Cloudinary URL processing.

```typescript
import { processCloudinaryUrlEnhanced } from '../lib/utils';

const processedUrl = processCloudinaryUrlEnhanced(
  'https://res.cloudinary.com/jewgo/image/upload/v123/image_1.jpg'
);
```

### Enhanced Format Detection

#### `getImageFormatEnhanced`

Enhanced image format detection.

```typescript
import { getImageFormatEnhanced } from '../lib/utils';

const format = getImageFormatEnhanced('https://example.com/image.jpg');
console.log('Image format:', format); // 'jpg'
```

### Enhanced Validation

#### `validateImageEnhanced`

Enhanced image validation with comprehensive checking.

```typescript
import { validateImageEnhanced } from '../lib/utils';

const validateFile = async (file: File) => {
  const result = await validateImageEnhanced(file, {
    allowedFormats: ['jpg', 'png', 'webp'],
    maxFileSize: 5 * 1024 * 1024,
    maxWidth: 1920,
    maxHeight: 1080,
  });
  
  if (result.isValid) {
    console.log('Valid image:', result.metadata);
  } else {
    console.log('Invalid image:', result.errors);
  }
};
```

### Enhanced Processing

#### `transformImageUrlEnhanced`

Enhanced image URL transformation.

```typescript
import { transformImageUrlEnhanced } from '../lib/utils';

const transforms = {
  width: 800,
  height: 600,
  quality: 80,
  format: 'webp' as const,
  crop: 'fill' as const,
  gravity: 'center' as const,
};

const transformedUrl = transformImageUrlEnhanced(
  'https://cloudinary.com/image.jpg',
  transforms
);
```

### Enhanced Utils Interface

#### `imageUtilsEnhanced`

Enhanced image utilities with comprehensive functionality.

```typescript
import { imageUtilsEnhanced } from '../lib/utils';

const {
  isValidImageUrl,
  validateImageUrl,
  getSafeImageUrl,
  transformImageUrl,
  validateImage,
  getImageFormat,
  getImageDimensions,
  getImageSize,
} = imageUtilsEnhanced;
```

## Migration Guide

### From Legacy to Enhanced Utilities

#### Component Utilities

```typescript
// Before (legacy)
import { handleEscape } from '../lib/utils';

// After (enhanced)
import { handleEscapeEnhanced } from '../lib/utils';
```

#### Form Validation

```typescript
// Before (legacy)
import { validateForm, emailSchema } from '../lib/utils';

// After (enhanced)
import { validateFormEnhanced, emailSchemaEnhanced } from '../lib/utils';
```

#### Image Processing

```typescript
// Before (legacy)
import { getSafeImageUrl } from '../lib/utils';

// After (enhanced)
import { getSafeImageUrlEnhanced } from '../lib/utils';
```

### Backward Compatibility

All legacy utilities are still exported for backward compatibility. You can gradually migrate to the enhanced versions:

```typescript
// Both work
import { handleEscape } from '../lib/utils';        // Legacy
import { handleEscapeEnhanced } from '../lib/utils'; // Enhanced
```

## Type Safety

All enhanced utilities include comprehensive TypeScript types:

```typescript
import type {
  SubmitHandler,
  ValidationResult,
  ImageUrlValidationResult,
  // ... and many more
} from '../lib/utils';
```

## Error Handling

Enhanced utilities include improved error handling:

```typescript
// All enhanced functions include try-catch blocks
// and provide detailed error information
const result = await validateImageUrlEnhanced(url);
if (!result.isValid) {
  console.error('Validation failed:', result.error);
}
```

## Performance

Enhanced utilities include performance optimizations:

- Debounced search handlers
- Throttled scroll handlers
- Optimized image validation
- Cached format detection

## Testing

All enhanced utilities are designed to be easily testable:

```typescript
// Example test for enhanced validation
import { validateFormEnhanced, contactFormSchemaEnhanced } from '../lib/utils';

test('validates contact form correctly', () => {
  const validData = {
    name: 'John Doe',
    email: 'john@example.com',
    message: 'Hello world'
  };
  
  const result = validateFormEnhanced(contactFormSchemaEnhanced, validData);
  expect(result.success).toBe(true);
});
```

## Contributing

When adding new utilities:

1. Create enhanced versions with proper TypeScript types
2. Include comprehensive error handling
3. Add performance optimizations where appropriate
4. Maintain backward compatibility
5. Update this documentation
6. Add tests for new functionality

## Support

For questions or issues with the enhanced utilities, please refer to:

- TypeScript documentation for type-related questions
- React documentation for component-related questions
- Zod documentation for validation-related questions
