# Developer Quick Reference

## TypeScript Error Checking

### Fast Error Detection
```bash
# Fastest method - shows all TypeScript errors at once
npx tsc --noEmit

# Watch mode for real-time feedback
npx tsc --noEmit --watch

# Next.js specific type checking
npm run type-check
```

### Error Checking Priority
1. **During Development**: Use `npx tsc --noEmit --watch` for real-time feedback
2. **Before Committing**: Use `npx tsc --noEmit` for quick verification
3. **Before Pushing**: Use `npm run build` for final verification
4. **CI/CD**: Use `npm run type-check` and `npm run lint` for automated checks

### Common Error Patterns
- **Property Access**: `Property 'propertyName' does not exist on type 'InterfaceName'`
- **Type Assignment**: `Type 'ActualType' is not assignable to type 'ExpectedType'`
- **Import/Export**: `Module declares 'ExportName' locally, but it is not exported`
- **Spread Operator**: `A spread argument must either have a tuple type or be passed to a rest parameter`

### Mapping File Error Resolution
1. **Identify Error Type**: Run `npx tsc --noEmit`
2. **Check Interface Definitions**: Verify source and target interfaces
3. **Update Mapping Functions**: Fix property access patterns
4. **Update Mock Data**: Align mock data with interfaces
5. **Verify Fixes**: Run `npx tsc --noEmit` until no errors remain

For detailed troubleshooting, see `docs/troubleshooting/TYPESCRIPT_ERROR_RESOLUTION.md`.

## Frontend Development

### Build Commands
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

### Component Structure

#### UI Components (`frontend/components/ui/`)
- `button.tsx` - Reusable button with variants
- `card.tsx` - Card layout components
- `Pagination.tsx` - Page navigation
- `Toast.tsx` - Notification system
- `LoadingState.tsx` - Loading indicators

#### Layout Components (`frontend/components/layout/`)
- `Header.tsx` - Main application header
- `SearchHeader.tsx` - Search functionality
- `ActionButtons.tsx` - Action button groups

#### Navigation (`frontend/components/navigation/ui/`)
- `BottomNavigation.tsx` - Mobile navigation
- `CategoryTabs.tsx` - Category filtering
- `SubNav.tsx` - Sub-navigation

### Key Patterns

#### Client Components
```typescript
"use client"

import { useState, useEffect } from 'react';

interface ComponentProps {
  // Define props
}

export default function Component({ prop }: ComponentProps) {
  // Component logic
}
```

#### Server Actions
- **Server Actions**: Use for server-side operations with `revalidatePath`
- **Client Actions**: Use for client-side API calls
- **Pattern**: Create both versions when needed

#### TypeScript Interfaces
```typescript
interface ComponentProps {
  required: string;
  optional?: string;
  children?: React.ReactNode;
}
```

### Common Issues & Solutions

#### Build Errors
1. **Missing "use client"**: Add directive to client components
2. **Server Action Import**: Use client-side version in client components
3. **Type Errors**: Check interface definitions and imports
4. **Syntax Errors**: Verify JSX syntax and function declarations

#### Component Issues
1. **Missing Components**: Check if component exists in correct location
2. **Import Errors**: Verify import paths and exports
3. **Type Errors**: Ensure proper TypeScript interfaces

### File Organization

```
frontend/
├── app/                    # Next.js App Router pages
├── components/             # Reusable components
│   ├── ui/                # Base UI components
│   ├── layout/            # Layout components
│   ├── navigation/        # Navigation components
│   └── forms/             # Form components
├── lib/                   # Utilities and services
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript type definitions
```

### Development Workflow

1. **Start Development**: `npm run dev`
2. **Check Types**: `npm run type-check`
3. **Build Test**: `npm run build`
4. **Lint Code**: `npm run lint`

### Testing Checklist

- [ ] Component renders without errors
- [ ] Props are properly typed
- [ ] Event handlers work correctly
- [ ] Responsive design works
- [ ] Accessibility features implemented
- [ ] No console errors
- [ ] Build completes successfully

### Performance Tips

- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers
- Implement proper loading states
- Optimize images with Next.js Image component
- Use proper error boundaries

### Security Considerations

- Validate all user inputs
- Sanitize file uploads
- Use proper authentication
- Implement CSRF protection
- Follow OWASP guidelines

---

*This guide should be updated as the codebase evolves.*

## Frontend Development

### Build Commands
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

### Component Structure

#### UI Components (`frontend/components/ui/`)
- `button.tsx` - Reusable button with variants
- `card.tsx` - Card layout components
- `Pagination.tsx` - Page navigation
- `Toast.tsx` - Notification system
- `LoadingState.tsx` - Loading indicators

#### Layout Components (`frontend/components/layout/`)
- `Header.tsx` - Main application header
- `SearchHeader.tsx` - Search functionality
- `ActionButtons.tsx` - Action button groups

#### Navigation (`frontend/components/navigation/ui/`)
- `BottomNavigation.tsx` - Mobile navigation
- `CategoryTabs.tsx` - Category filtering
- `SubNav.tsx` - Sub-navigation

### Key Patterns

#### Client Components
```typescript
"use client"

import { useState, useEffect } from 'react';

interface ComponentProps {
  // Define props
}

export default function Component({ prop }: ComponentProps) {
  // Component logic
}
```

#### Server Actions
- **Server Actions**: Use for server-side operations with `revalidatePath`
- **Client Actions**: Use for client-side API calls
- **Pattern**: Create both versions when needed

#### TypeScript Interfaces
```typescript
interface ComponentProps {
  required: string;
  optional?: string;
  children?: React.ReactNode;
}
```

### Common Issues & Solutions

#### Build Errors
1. **Missing "use client"**: Add directive to client components
2. **Server Action Import**: Use client-side version in client components
3. **Type Errors**: Check interface definitions and imports
4. **Syntax Errors**: Verify JSX syntax and function declarations

#### Component Issues
1. **Missing Components**: Check if component exists in correct location
2. **Import Errors**: Verify import paths and exports
3. **Type Errors**: Ensure proper TypeScript interfaces

### File Organization

```
frontend/
├── app/                    # Next.js App Router pages
├── components/             # Reusable components
│   ├── ui/                # Base UI components
│   ├── layout/            # Layout components
│   ├── navigation/        # Navigation components
│   └── forms/             # Form components
├── lib/                   # Utilities and services
├── hooks/                 # Custom React hooks
└── types/                 # TypeScript type definitions
```

### Development Workflow

1. **Start Development**: `npm run dev`
2. **Check Types**: `npm run type-check`
3. **Build Test**: `npm run build`
4. **Lint Code**: `npm run lint`

### Testing Checklist

- [ ] Component renders without errors
- [ ] Props are properly typed
- [ ] Event handlers work correctly
- [ ] Responsive design works
- [ ] Accessibility features implemented
- [ ] No console errors
- [ ] Build completes successfully

### Performance Tips

- Use `useMemo` for expensive calculations
- Use `useCallback` for event handlers
- Implement proper loading states
- Optimize images with Next.js Image component
- Use proper error boundaries

### Security Considerations

- Validate all user inputs
- Sanitize file uploads
- Use proper authentication
- Implement CSRF protection
- Follow OWASP guidelines

---

*This guide should be updated as the codebase evolves.*
