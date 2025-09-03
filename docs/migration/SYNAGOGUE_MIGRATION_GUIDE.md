# Synagogue Migration Guide

This guide explains how to migrate from the old `florida_synagogues` table to the new comprehensive `shuls` table structure.

## Overview

The migration process involves:
1. Creating a new `shuls` table with enhanced structure
2. Importing and transforming data from the CSV file
3. Updating the Prisma schema
4. Creating new API endpoints
5. Updating the frontend to use real data

## Prerequisites

- PostgreSQL database with access
- Python 3.8+ with psycopg2
- Node.js with Prisma
- Access to the CSV data file

## Files Created/Modified

### New Files
- `backend/scripts/import_synagogues.py` - Data import script
- `backend/scripts/run_synagogue_migration.py` - Migration runner
- `frontend/app/api/synagogues/route.ts` - Public API endpoint
- `docs/migration/SYNAGOGUE_MIGRATION_GUIDE.md` - This guide

### Modified Files
- `frontend/prisma/schema.prisma` - Added Shul model
- `frontend/app/shuls/page.tsx` - Updated to use real API

## Migration Steps

### Step 1: Run the Migration

```bash
cd backend
python scripts/run_synagogue_migration.py
```

This script will:
- Create the new `shuls` table with all indexes and triggers
- Import data from the CSV file
- Transform and clean the data
- Update search vectors

### Step 2: Update Prisma Client

```bash
cd frontend
npx prisma generate
```

### Step 3: Test the API

Test the new endpoint:
```bash
curl "http://localhost:3000/api/synagogues?limit=5"
```

### Step 4: Verify Frontend

Visit the shuls page to ensure it's working with real data.

## Data Transformation

The import script transforms the CSV data as follows:

### Field Mappings

| CSV Field | New Field | Transformation |
|-----------|-----------|----------------|
| `Name` | `name` | Cleaned and validated |
| `Address` | `address` | Extracted zip codes |
| `City` | `city` | Standardized |
| `Rabbi` | `rabbi_name` | Cleaned |
| `Phone` | `phone_number` | Cleaned |
| `Email` | `email` | Cleaned |
| `Website` | `website` | Cleaned |
| `Is_Chabad` | `shul_type` | Mapped to 'chabad' |
| `Is_Young_Israel` | `shul_type` | Mapped to 'young_israel' |
| `Is_Sephardic` | `shul_category` | Mapped to 'sephardic' |

### Derived Fields

- **denomination**: Determined from affiliation and type flags
- **shul_type**: Categorized as orthodox, conservative, reform, chabad, etc.
- **shul_category**: Categorized as ashkenazi, sephardic, chabad
- **facilities**: Defaulted to true for most synagogues
- **ratings**: Default ratings based on data quality score

## New Table Structure

The `shuls` table includes:

### Basic Information
- `id`, `name`, `description`, `address`, `city`, `state`, `zip_code`, `country`
- `latitude`, `longitude` (for distance calculations)

### Contact Information
- `phone_number`, `website`, `email`

### Religious Classification
- `shul_type`, `shul_category`, `denomination`
- `religious_authority`, `community_affiliation`

### Services
- `has_daily_minyan`, `has_shabbat_services`, `has_holiday_services`
- `has_women_section`, `has_mechitza`, `has_separate_entrance`

### Facilities
- `has_parking`, `has_disabled_access`, `has_kiddush_facilities`
- `has_social_hall`, `has_library`, `has_hebrew_school`
- `has_adult_education`, `has_youth_programs`, `has_senior_programs`

### Ratings & Reviews
- `rating`, `review_count`, `star_rating`, `google_rating`

### Search & Metadata
- `search_vector` (full-text search)
- `tags` (array for filtering)
- `is_active`, `is_verified`

## API Endpoints

### GET /api/synagogues

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search term for name, city, description
- `city` - Filter by city
- `denomination` - Filter by denomination
- `shulType` - Filter by shul type
- `hasDailyMinyan` - Filter by daily minyan availability
- `hasShabbatServices` - Filter by Shabbat services
- `hasMechitza` - Filter by mechitza availability
- `lat`, `lng` - User location for distance calculation
- `maxDistanceMi` - Maximum distance filter

**Response:**
```json
{
  "synagogues": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8,
  "hasNext": true,
  "hasPrev": false
}
```

## Search and Filtering

### Full-Text Search
The table includes a `search_vector` field that enables full-text search across:
- Name (highest weight)
- Description (medium weight)
- City, shul_type, denomination, rabbi_name (lower weight)

### Distance-Based Sorting
When coordinates are provided, results are automatically sorted by distance from the user's location.

### Tag-Based Filtering
Each synagogue has tags for easy filtering and categorization.

## Data Quality Improvements

### Automatic Enhancements
- **Denomination Detection**: Automatically determined from affiliation and type flags
- **Facility Assumptions**: Most facilities defaulted to true (can be updated later)
- **Rating Defaults**: Base ratings assigned based on data quality scores
- **Tag Generation**: Automatic tag creation for search and filtering

### Manual Updates Needed
- **Coordinates**: Addresses need to be geocoded for distance calculations
- **Prayer Times**: Service schedules need to be researched and added
- **Facility Verification**: Facility information should be verified with synagogues
- **Images**: Photos and logos should be added
- **Reviews**: User ratings and reviews should be collected

## Troubleshooting

### Common Issues

#### 1. Migration Fails
**Error**: "Shuls table already exists"
**Solution**: Drop the existing table or use a different name

#### 2. Import Fails
**Error**: "DATABASE_URL not set"
**Solution**: Set the DATABASE_URL environment variable

#### 3. Prisma Errors
**Error**: "Model not found"
**Solution**: Run `npx prisma generate` after schema changes

#### 4. API Errors
**Error**: "500 Internal Server Error"
**Solution**: Check database connection and table existence

### Debugging

Enable debug logging:
```python
logging.basicConfig(level=logging.DEBUG)
```

Check database directly:
```sql
SELECT COUNT(*) FROM shuls;
SELECT * FROM shuls LIMIT 5;
```

## Performance Considerations

### Indexes
The table includes comprehensive indexes for:
- Basic fields (name, city, type)
- Location fields (latitude, longitude)
- Service fields (daily minyan, Shabbat services)
- Search fields (search_vector)

### Query Optimization
- Use parameterized queries to prevent SQL injection
- Implement pagination for large result sets
- Cache frequently accessed data
- Use full-text search for complex queries

## Future Enhancements

### Planned Features
1. **Geocoding Service**: Automatically get coordinates from addresses
2. **Prayer Time API**: Integration with prayer time services
3. **Image Management**: CDN integration for synagogue photos
4. **Review System**: User rating and review functionality
5. **Advanced Search**: Faceted search with multiple criteria
6. **Mobile App**: Native mobile application for synagogue discovery

### Data Enrichment
1. **Service Schedules**: Add actual prayer times and service schedules
2. **Facility Photos**: Add photos of synagogue facilities
3. **Community Information**: Add details about community programs
4. **Accessibility Details**: Comprehensive accessibility information
5. **Kosher Information**: Detailed kosher certification details

## Rollback Plan

If the migration needs to be rolled back:

1. **Drop the new table**:
   ```sql
   DROP TABLE IF EXISTS shuls CASCADE;
   ```

2. **Restore Prisma schema**:
   - Remove the Shul model
   - Run `npx prisma generate`

3. **Restore frontend**:
   - Revert shuls page to mock data
   - Remove the new API endpoint

## Support

For issues with the migration:
1. Check the logs for detailed error messages
2. Verify database connectivity and permissions
3. Ensure all prerequisites are met
4. Contact the development team with specific error details

## Conclusion

This migration provides a solid foundation for a comprehensive synagogue management system. The new structure supports advanced search, filtering, and location-based features while maintaining data integrity and performance.
