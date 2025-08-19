# Unified TODO List
*Generated automatically by Phase 7 - Unified TODO Generation*

This document consolidates all TODO, FIXME, and other maintenance items found throughout the codebase. Items are categorized by priority and component.

---

## 🔴 High Priority (P0) - Critical Issues

### Authentication & Session Management
- **File**: `frontend/components/reviews/ReviewsSection.tsx:62`
  - **Issue**: TODO: Replace with Supabase session
  - **Context**: `const session: { user?: { email?: string; name?: string } } | null = null; // TODO: Replace with Supabase session`
  - **Impact**: Reviews functionality disabled without proper auth integration

- **File**: `frontend/components/restaurant/ReviewsModal.tsx:58`
  - **Issue**: TODO: Replace with Supabase session
  - **Context**: `const session = null; // TODO: Replace with Supabase session`
  - **Impact**: Modal reviews functionality disabled without proper auth integration

### Backend API Integration
- **File**: `backend/routes/api_v4.py:1081`
  - **Issue**: TODO: Integrate with Supabase auth
  - **Context**: `# TODO: Integrate with Supabase auth`
  - **Impact**: Marketplace seller functionality missing auth integration

- **File**: `frontend/app/restaurant/[id]/page.tsx:263`
  - **Issue**: TODO: Implement actual order submission to backend API endpoint
  - **Context**: Order submission is currently a placeholder
  - **Impact**: Users cannot actually place orders

---

## 🟡 Medium Priority (P1) - Feature Gaps

### Marketplace Features
- **File**: `frontend/components/marketplace/MarketplacePageClient.tsx:28`
  - **Issue**: TODO: Implement category filter
  - **Context**: Category click handler is empty
  - **Impact**: Category filtering not functional

- **File**: `frontend/components/filters/AdvancedFilterSheet.tsx:287`
  - **Issue**: TODO: Get actual counts from API
  - **Context**: `count: 0 // TODO: Get actual counts from API`
  - **Impact**: Filter counts show as 0, no user feedback on filter effectiveness

### Admin & Database Operations
- **File**: `docs/development/TODO_CLEANUP_TRACKING.md` (Multiple entries)
  - **Issue**: Various admin API endpoints need implementation
  - **Context**: Restaurant hours update, admin tokens database storage
  - **Impact**: Admin functionality partially missing

---

## 🟢 Low Priority (P2) - Technical Debt & Optimizations

### Performance & Optimization
- **File**: Multiple locations
  - **Issue**: Various optimization opportunities identified
  - **Context**: Image optimization scripts, CSS optimization, performance auditing
  - **Impact**: Performance could be improved but not critical

### Code Quality
- **File**: Multiple locations
  - **Issue**: Debug statements and development-only code
  - **Context**: Various debug logs and development helpers
  - **Impact**: Clean up needed for production readiness

---

## 📋 Maintenance Items

### Deprecation Tracking
- **Count**: Multiple DEPRECATED markers found
- **System**: Automated tracking via CI scripts
- **Status**: System in place, individual items need review

### Documentation
- **File**: Various locations
- **Issue**: Documentation gaps and outdated information
- **Context**: API docs, setup guides, troubleshooting
- **Impact**: Developer experience and onboarding

---

## 🔧 Development Environment

### Package Management
- **Issue**: Multiple deprecated packages detected
- **Files**: `frontend/pnpm-lock.yaml`, `tools/ci-guard-mcp/pnpm-lock.yaml`
- **Impact**: Security and maintenance concerns
- **Packages**: @eslint/config-array, glob, rimraf, and others

### Build Warnings
- **Issue**: Next.js version mismatch warnings
- **Context**: `⚠ Mismatching @next/swc version, detected: 15.4.5 while Next.js is on 15.4.7`
- **Impact**: Potential build instability

---

## 📊 Priority Summary

- **P0 Critical**: 4 items (Authentication, API integration)
- **P1 Medium**: 3 items (Feature gaps)
- **P2 Low**: Multiple items (Technical debt)
- **Maintenance**: Ongoing (Deprecations, docs)

---

## 🎯 Next Steps

1. **Immediate (P0)**: 
   - Complete Supabase auth integration in review components
   - Implement backend API auth for marketplace

2. **Short-term (P1)**:
   - Add marketplace category filtering
   - Implement API count endpoints for filters
   - Complete admin API endpoints

3. **Long-term (P2)**:
   - Update deprecated packages
   - Clean up debug code
   - Performance optimizations

---

## 📝 Notes

- This list is generated from codebase analysis on 2024-08-19
- Items marked as "TODO" or "FIXME" in code comments
- Excludes items already tracked in project management systems
- Some items may be resolved but comments not yet updated

---

*Last updated: 2024-08-19 by Phase 7 - Unified TODO Generation*
