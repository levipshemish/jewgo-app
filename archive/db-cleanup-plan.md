# Database Cleanup Plan

## Overview
This document outlines the cleanup plan for unused database models and columns in the JewGo application.

## Unused Columns Identified

### Restaurant Model
The following columns appear to be unused or redundant:

1. **`current_time_local`** - System-generated column that's not being used
   - Purpose: Local time snapshot
   - Status: Unused - can be removed
   - Impact: Low - no application code references

2. **`hours_parsed`** - Internal flag that's not being used
   - Purpose: Track if hours have been parsed
   - Status: Unused - can be removed
   - Impact: Low - no application code references

3. **`user_email`** - Only used in review creation
   - Purpose: Contact form email
   - Status: Used only in reviews, not in restaurant data
   - Impact: Medium - consider moving to Review model if needed

### ReviewFlag Model
The entire `ReviewFlag` model appears to be unused:
- No references in application code
- No API endpoints using it
- No database operations on this table
- **Recommendation**: Remove entirely

## Unused Models

### ReviewFlag Model
- **Status**: Completely unused
- **Action**: Remove model and table
- **Impact**: None - no code references

## Recommended Actions

### Phase 1: Safe Removals
1. Remove `current_time_local` column from Restaurant model
2. Remove `hours_parsed` column from Restaurant model
3. Remove entire ReviewFlag model and table

### Phase 2: Review and Refactor
1. Evaluate `user_email` usage in Review model
2. Consider if it should be moved to Review model only
3. Update any related API endpoints

### Phase 3: Migration Strategy
1. Create Alembic migration to remove unused columns
2. Test migration on staging environment
3. Backup production database before applying
4. Apply migration during maintenance window

## Migration Scripts

### Remove Unused Columns
```sql
-- Remove unused columns from restaurants table
ALTER TABLE restaurants 
DROP COLUMN IF EXISTS current_time_local,
DROP COLUMN IF EXISTS hours_parsed;
```

### Remove ReviewFlag Table
```sql
-- Remove unused review_flags table
DROP TABLE IF EXISTS review_flags;
```

## Safety Considerations
- All removals are safe as no application code references these columns/models
- Backup database before applying changes
- Test on staging environment first
- Monitor application after deployment

## Benefits
- Reduced database size
- Simplified schema
- Improved maintainability
- Cleaner codebase

## Notes
- This cleanup is conservative and only removes clearly unused elements
- All changes are reversible if needed
- No business logic will be affected
