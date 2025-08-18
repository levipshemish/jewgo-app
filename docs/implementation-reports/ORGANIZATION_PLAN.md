# Codebase Organization & Naming Improvement Plan

## 🎯 Goals
- Consistent naming conventions
- Descriptive file names
- Logical organization
- Remove unused/backup files
- Improve maintainability

## 📋 Issues Identified

### 1. **File Naming Inconsistencies**
- Mixed PascalCase/camelCase
- Non-descriptive names
- Generic names

### 2. **Backup Files in Production**
- `hoursBackup.ts`
- `websiteBackup.ts`

### 3. **Empty/Unused Directories**
- `components/features/` (empty)

### 4. **Large Components**
- `SmartSearch.tsx` (641 lines)
- `AdvancedFilters.tsx` (335 lines)

### 5. **API Route Organization**
- Scattered routes
- Unclear purposes
- Test routes in production

## 🔧 Proposed Solutions

### Phase 1: File Renaming & Organization
1. **Rename non-descriptive files:**
   - `cn.ts` → `classNames.ts`
   - `mock.ts` → `mockData.ts`
   - `icons.tsx` → `IconComponents.tsx`

2. **Move backup files:**
   - Create `lib/backups/` directory
   - Move `hoursBackup.ts` and `websiteBackup.ts`

3. **Consolidate large components:**
   - Split `SmartSearch.tsx` into smaller components
   - Split `AdvancedFilters.tsx` into focused components

### Phase 2: Directory Structure Improvements
1. **Remove empty directories:**
   - Delete `components/features/` if unused

2. **Reorganize API routes:**
   - Group by functionality
   - Remove test routes from production

3. **Improve page organization:**
   - Rename generic pages (`test/`, `demo/`, `health/`)
   - Group related pages

### Phase 3: Component Refactoring
1. **Split large components:**
   - Extract reusable logic
   - Create focused components

2. **Improve type organization:**
   - Consolidate related types
   - Remove unused types

## 📊 Current Structure Analysis

### Components (Good)
- ✅ Well-organized by domain
- ✅ Consistent index.ts files
- ✅ Clear separation of concerns

### Utils (Needs Improvement)
- ❌ Backup files mixed with production code
- ❌ Non-descriptive names
- ❌ Some files too large

### API Routes (Needs Improvement)
- ❌ Scattered organization
- ❌ Unclear purposes
- ❌ Test routes in production

### Pages (Needs Improvement)
- ❌ Generic names
- ❌ Inconsistent organization

## 🎯 Success Metrics
- All files have descriptive names
- No backup files in production code
- Components under 300 lines
- Clear API route organization
- Consistent naming conventions 