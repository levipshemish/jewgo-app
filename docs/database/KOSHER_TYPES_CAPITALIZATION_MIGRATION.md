# Kosher Types and Text Capitalization Migration

## Overview

This migration updates the database to ensure proper capitalization for kosher types and text fields throughout the JewGo application.

## 🎯 Migration Goals

### 1. Kosher Type Capitalization
Update all kosher category values to use proper capitalization:
- `'meat'` → `'Meat'`
- `'dairy'` → `'Dairy'`
- `'pareve'` → `'Pareve'`
- `'fish'` → `'Fish'`
- `'unknown'` → `'Unknown'`

### 2. Text Field Capitalization
Update text fields to have first letter capitalized:
- `name` - Restaurant names
- `city` - City names
- `state` - State names
- `short_description` - Restaurant descriptions
- `price_range` - Price range text
- `avg_price` - Average price text
- `listing_type` - Business type
- `certifying_agency` - Certification agency names

### 3. Database Constraints
Update database constraints to match the new capitalized values.

### 4. Type Definitions
Update frontend and backend type definitions to use capitalized values.

## 📋 Migration Scripts

### 1. Data Update Migration
**File**: `backend/database/migrations/update_kosher_types_capitalization.py`

**Purpose**: Updates the actual data in the database
- Updates kosher_category values to proper capitalization
- Updates text fields with first letter capitalization
- Provides detailed logging and verification

### 2. Constraint Update Migration
**File**: `backend/database/migrations/update_kosher_category_constraints.py`

**Purpose**: Updates database constraints
- Drops existing kosher_category check constraints
- Adds new constraints with capitalized values
- Verifies constraint functionality

### 3. Main Migration Runner
**File**: `backend/database/migrations/run_kosher_capitalization_migration.py`

**Purpose**: Orchestrates the complete migration process
- Runs both data and constraint migrations
- Provides verification and status checking
- Includes dry-run and status modes

## 🔧 Updated Files

### Backend Files
- `backend/types/restaurant.py` - Updated KosherCategory enum
- `backend/database/migrations/update_kosher_types_capitalization.py` - Data migration script
- `backend/database/migrations/update_kosher_category_constraints.py` - Constraint migration script
- `backend/database/migrations/run_kosher_capitalization_migration.py` - Main migration runner

### Frontend Files
- `frontend/lib/types/restaurant.ts` - Updated KosherCategory type
- `frontend/app/api/restaurants/route.ts` - Updated validation schema

## 🚀 Running the Migration

### Prerequisites
1. Ensure `DATABASE_URL` environment variable is set
2. Create a database backup before running migration
3. Ensure all migration scripts are present

### Running the Complete Migration
```bash
cd backend/database/migrations
python run_kosher_capitalization_migration.py
```

### Checking Migration Status
```bash
python run_kosher_capitalization_migration.py --status
```

### Dry Run (Preview Only)
```bash
python run_kosher_capitalization_migration.py --dry-run
```

### Running Individual Migrations
```bash
# Data update only
python update_kosher_types_capitalization.py

# Constraint update only
python update_kosher_category_constraints.py
```

## 📊 Expected Results

### Before Migration
```sql
-- Kosher categories (lowercase)
SELECT kosher_category, COUNT(*) FROM restaurants GROUP BY kosher_category;
-- Result: meat, dairy, pareve, fish, unknown

-- Text fields (mixed case)
SELECT name, city, state FROM restaurants LIMIT 5;
-- Result: Mixed capitalization
```

### After Migration
```sql
-- Kosher categories (properly capitalized)
SELECT kosher_category, COUNT(*) FROM restaurants GROUP BY kosher_category;
-- Result: Meat, Dairy, Pareve, Fish, Unknown

-- Text fields (first letter capitalized)
SELECT name, city, state FROM restaurants LIMIT 5;
-- Result: All first letters capitalized
```

## 🔍 Verification

### Database Verification
The migration includes built-in verification:
1. Checks that all kosher_category values are properly capitalized
2. Verifies that no lowercase kosher types remain
3. Confirms database constraints are working correctly

### Application Verification
After migration, verify:
1. Frontend displays kosher types correctly
2. API endpoints accept and return capitalized values
3. Form validation works with new values
4. Search and filtering functions properly

## ⚠️ Important Notes

### Backup Requirements
- **Always create a database backup before running this migration**
- The migration modifies existing data and cannot be easily reversed
- Test the migration on a staging environment first

### Rollback Plan
If rollback is needed:
1. Restore from database backup
2. Revert type definition changes
3. Revert validation schema changes

### Testing
- Test the migration on a copy of production data first
- Verify all application functionality after migration
- Check that search and filtering still work correctly

## 📈 Impact Analysis

### Database Impact
- **Data Changes**: All kosher_category values will be updated
- **Text Changes**: Multiple text fields will have capitalization updated
- **Constraint Changes**: Database constraints will be updated
- **Performance**: Minimal impact, mostly UPDATE operations

### Application Impact
- **Frontend**: Type definitions updated, validation schemas updated
- **Backend**: Enum values updated, API responses will use new format
- **User Experience**: Improved consistency in text display
- **Search/Filter**: May need testing to ensure functionality

### API Impact
- **Request Format**: API requests must use capitalized kosher types
- **Response Format**: API responses will return capitalized kosher types
- **Validation**: Updated validation schemas enforce new format

## 🔄 Migration Process

### Step 1: Preparation
1. Create database backup
2. Verify prerequisites
3. Test on staging environment

### Step 2: Data Migration
1. Run data update migration
2. Verify data changes
3. Check for any errors

### Step 3: Constraint Migration
1. Run constraint update migration
2. Verify constraints are working
3. Test constraint enforcement

### Step 4: Application Updates
1. Deploy updated type definitions
2. Deploy updated validation schemas
3. Test application functionality

### Step 5: Verification
1. Run final verification
2. Test all application features
3. Monitor for any issues

## 📝 Migration Log

### Version 1.0 (2025-01-17)
- Initial migration scripts created
- Data update migration implemented
- Constraint update migration implemented
- Type definitions updated
- Validation schemas updated
- Comprehensive documentation created

## 🆘 Troubleshooting

### Common Issues

#### Migration Fails
- Check DATABASE_URL environment variable
- Verify database connectivity
- Check for existing constraints that might conflict

#### Data Not Updated
- Verify migration scripts ran successfully
- Check database logs for errors
- Run verification scripts

#### Application Errors
- Ensure type definitions are deployed
- Check validation schemas are updated
- Verify API endpoints are using new format

### Support
For issues with this migration:
1. Check the migration logs
2. Verify database state
3. Test individual migration components
4. Contact the development team

## 📚 Related Documentation

- [Database Schema Documentation](../database/schema.md)
- [API Documentation](../api/API_ENDPOINTS_SUMMARY.md)
- [Type Definitions](../development/type-definitions.md)
- [Migration Guide](../database/DATABASE_REFACTORING_GUIDE.md)
