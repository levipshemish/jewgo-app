# File Structure Architecture

## Current Structure Overview

The JewGo frontend follows a Next.js 13+ App Router structure with feature-based organization. This document outlines the current structure and proposes improvements.

## Current Directory Structure

```
frontend/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   ├── auth/                     # Authentication pages
│   ├── marketplace/              # Marketplace feature pages
│   ├── restaurant/               # Restaurant detail pages
│   ├── admin/                    # Admin pages
│   ├── test-*/                   # Test/debug pages (to be removed)
│   └── [other feature pages]
├── components/                   # React components
│   ├── ui/                       # Reusable UI components
│   ├── search/                   # Search-related components
│   ├── restaurant/               # Restaurant-specific components
│   ├── map/                      # Map components
│   ├── marketplace/              # Marketplace components
│   ├── auth/                     # Authentication components
│   ├── layout/                   # Layout components
│   ├── navigation/               # Navigation components
│   ├── reviews/                  # Review components
│   ├── forms/                    # Form components
│   ├── filters/                  # Filter components
│   ├── feedback/                 # Feedback components
│   ├── analytics/                # Analytics components
│   ├── monitoring/               # Monitoring components
│   ├── admin/                    # Admin components
│   ├── archive/                  # Archived components (to be removed)
│   ├── dev/                      # Development components (to be removed)
│   └── [other feature components]
├── lib/                          # Utility libraries
│   ├── hooks/                    # Custom React hooks
│   ├── utils/                    # Utility functions
│   ├── types/                    # TypeScript type definitions
│   ├── auth/                     # Authentication utilities
│   ├── supabase/                 # Supabase client utilities
│   ├── api/                      # API utilities
│   ├── analytics/                # Analytics utilities
│   ├── search/                   # Search utilities
│   ├── maps/                     # Maps utilities
│   ├── filters/                  # Filter utilities
│   ├── validators/               # Validation utilities
│   ├── db/                       # Database utilities
│   ├── contexts/                 # React contexts
│   ├── workers/                  # Web workers
│   ├── backups/                  # Backup utilities
│   ├── google/                   # Google services
│   ├── ai/                       # AI utilities
│   ├── polyfills/                # Polyfills
│   └── i18n/                     # Internationalization
├── scripts/                      # Build and utility scripts
├── public/                       # Static assets
├── prisma/                       # Database schema
├── __tests__/                    # Test files
└── reports/                      # Analysis reports
```

## Import Strategy

### Current Import Patterns
- **Absolute imports**: `@/components/ui/Button`
- **Relative imports**: `../../components/ui/Button`
- **Deep relative imports**: `../../../lib/utils/helper` (to be avoided)

### Recommended Import Strategy
1. **Use `@/` alias for all imports** from the frontend root
2. **Prefer absolute imports** over relative imports
3. **Group imports**: built-in → external → internal → relative
4. **Use barrel exports** for common component groups

## Proposed Improvements

### 1. Component Organization

**Current Issue**: Components are organized by type rather than feature
**Proposed Solution**: Reorganize by feature with shared components

```
components/
├── shared/                       # Shared across features
│   ├── ui/                       # Base UI components
│   ├── layout/                   # Layout components
│   └── forms/                    # Form components
├── features/                     # Feature-specific components
│   ├── search/                   # Search feature
│   ├── restaurant/               # Restaurant feature
│   ├── marketplace/              # Marketplace feature
│   ├── auth/                     # Authentication feature
│   ├── admin/                    # Admin feature
│   └── map/                      # Map feature
└── legacy/                       # Components to be migrated
```

### 2. Barrel Exports

Create index files for common component groups:

```typescript
// components/shared/ui/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Modal } from './Modal';
// ... other UI components

// components/features/search/index.ts
export { SearchBar } from './SearchBar';
export { SearchResults } from './SearchResults';
export { SearchFilters } from './SearchFilters';
```

### 3. Utility Organization

**Current Issue**: Utilities are scattered across multiple directories
**Proposed Solution**: Consolidate by domain

```
lib/
├── core/                         # Core utilities
│   ├── api/                      # API utilities
│   ├── auth/                     # Authentication
│   ├── db/                       # Database
│   └── utils/                    # General utilities
├── features/                     # Feature-specific utilities
│   ├── search/                   # Search utilities
│   ├── maps/                     # Maps utilities
│   ├── analytics/                # Analytics utilities
│   └── marketplace/              # Marketplace utilities
├── hooks/                        # Custom React hooks
├── types/                        # TypeScript types
└── contexts/                     # React contexts
```

## Mapping Table

### Components to be Moved

| Current Path | Proposed Path | Impact | Re-export Required |
|--------------|---------------|---------|-------------------|
| `components/ui/LoadingSpinner.tsx` | `components/shared/ui/LoadingSpinner.tsx` | High (8 exports) | Yes |
| `components/ui/LoadingState.tsx` | `components/shared/ui/LoadingState.tsx` | High (8 exports) | Yes |
| `components/ui/ErrorBoundary.tsx` | `components/shared/ui/ErrorBoundary.tsx` | Medium (4 exports) | Yes |
| `components/search/*` | `components/features/search/*` | Medium | Yes |
| `components/restaurant/*` | `components/features/restaurant/*` | Medium | Yes |
| `components/marketplace/*` | `components/features/marketplace/*` | Medium | Yes |
| `components/map/*` | `components/features/map/*` | Medium | Yes |
| `components/auth/*` | `components/features/auth/*` | Medium | Yes |
| `components/admin/*` | `components/features/admin/*` | Low | Yes |

### Utilities to be Consolidated

| Current Path | Proposed Path | Impact | Re-export Required |
|--------------|---------------|---------|-------------------|
| `lib/api-config.ts` | `lib/core/api/config.ts` | High (6 exports) | Yes |
| `lib/auth.ts` | `lib/core/auth/index.ts` | Medium | Yes |
| `lib/utils/*` | `lib/core/utils/*` | Medium | Yes |
| `lib/analytics/*` | `lib/features/analytics/*` | Low | Yes |
| `lib/search/*` | `lib/features/search/*` | Low | Yes |
| `lib/maps/*` | `lib/features/maps/*` | Low | Yes |

### Files to be Removed

| Path | Reason | Action |
|------|--------|--------|
| `components/archive/*` | Archived components | Move to graveyard |
| `components/dev/*` | Development components | Move to graveyard |
| `app/test-*/*` | Test pages | Move to graveyard |
| `scripts/*.js` | Syntax errors | Fix or remove |

## Implementation Plan

### Phase 1: Safe Moves (No Breaking Changes)
1. Create new directory structure
2. Move files with re-exports
3. Update imports incrementally
4. Remove re-exports after validation

### Phase 2: Consolidation
1. Create barrel exports for common components
2. Consolidate utility functions
3. Remove duplicate code
4. Standardize import patterns

### Phase 3: Cleanup
1. Remove unused components
2. Fix syntax errors in scripts
3. Update documentation
4. Remove legacy directories

## Success Criteria

- [ ] All imports use `@/` alias
- [ ] No deep relative imports (`../../../`)
- [ ] Components organized by feature
- [ ] Barrel exports for common groups
- [ ] No unused components
- [ ] Consistent naming conventions
- [ ] Updated documentation

## Migration Checklist

### Before Migration
- [ ] Create backup
- [ ] Run full test suite
- [ ] Document current import patterns
- [ ] Create rollback plan

### During Migration
- [ ] Move files with re-exports
- [ ] Update imports incrementally
- [ ] Run tests after each change
- [ ] Validate build process

### After Migration
- [ ] Remove re-exports
- [ ] Update documentation
- [ ] Run full analysis again
- [ ] Validate no regressions
