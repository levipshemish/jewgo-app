# Merge Anonymous Verification Implementation

## Overview
This document outlines the implementation of verification comments for the merge anonymous functionality, addressing JWT jti extraction issues and ensuring proper database function support.

## Comment 1: JWT jti Extraction Fix

### Problem
The `extractJtiFromToken` function in `lib/utils/auth-utils.ts` was using base64 decoding instead of base64url decoding, which could cause rotation checks to fail.

### Solution
Updated the function to properly convert base64url to base64 before decoding:
- Replace `-` with `+`
- Replace `_` with `/`
- Add `=` padding as needed

### Implementation
```typescript
// Convert base64url to base64: replace -→+, _→/, add = padding
const base64Segment = payloadSegment
  .replace(/-/g, '+')
  .replace(/_/g, '/');

// Add padding if needed
const padding = 4 - (base64Segment.length % 4);
const paddedSegment = padding !== 4 ? base64Segment + '='.repeat(padding) : base64Segment;
```

### Files Modified
- `frontend/lib/utils/auth-utils.ts` - Updated `extractJtiFromToken` function

## Comment 2: Merge Flow Database Support

### Problem
The merge flow uses versioned HMAC cookie and idempotent 202 responses, but needed proper database function support for the `merge_anonymous_user_data` RPC call.

### Solution
Created a comprehensive SQL function and supporting infrastructure:

1. **SQL Function**: `merge_anonymous_user_data(source_user_id uuid, target_user_id uuid)`
2. **Idempotency Table**: `merge_jobs` table for tracking merge operations
3. **Migration Scripts**: Python and SQL scripts for deployment

### Implementation Details

#### SQL Function Features
- **Idempotent**: Returns existing results if merge already completed
- **Conflict Safe**: Uses `ON CONFLICT DO NOTHING` approach
- **Audit Trail**: Tracks all merge operations in `merge_jobs` table
- **Error Handling**: Comprehensive error handling with rollback
- **RLS Policies**: Proper security policies for data access

#### Tables Migrated
- `restaurants` (user_id)
- `reviews` (user_id)
- `favorites` (user_id)
- `marketplace_items` (seller_id)
- `user_profiles` (user_id)
- `notifications` (user_id)

#### Idempotency Mechanism
- Unique constraint on `(source_user_id, target_user_id)`
- Status tracking: `pending`, `completed`, `failed`
- Automatic retry logic for pending operations
- Result caching for completed operations

### Files Created
- `backend/database/migrations/create_merge_anonymous_function.sql` - SQL migration
- `backend/database/migrations/apply_merge_anonymous_function.py` - Python migration script

### Database Schema
```sql
CREATE TABLE merge_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_user_id UUID NOT NULL,
    target_user_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    moved_records JSONB,
    UNIQUE(source_user_id, target_user_id)
);
```

## Security Considerations

### JWT jti Extraction
- Proper base64url decoding prevents token rotation failures
- Maintains security of JWT token validation

### Database Function
- `SECURITY DEFINER` ensures proper permissions
- RLS policies restrict access to user's own data
- Service role required for merge job management
- Input validation prevents SQL injection

## Testing

### JWT Fix Testing
- Test with various JWT token formats
- Verify base64url decoding works correctly
- Ensure rotation checks pass

### Database Function Testing
- Test idempotency with duplicate calls
- Verify data migration accuracy
- Test error handling and rollback
- Validate RLS policy enforcement

## Deployment

### Migration Application
```bash
# Apply migration
cd backend/database/migrations
python apply_merge_anonymous_function.py

# Rollback if needed
python apply_merge_anonymous_function.py --rollback
```

### Verification Steps
1. Verify function exists: `SELECT routine_name FROM information_schema.routines WHERE routine_name = 'merge_anonymous_user_data';`
2. Verify table exists: `SELECT table_name FROM information_schema.tables WHERE table_name = 'merge_jobs';`
3. Test function with dummy data
4. Verify RLS policies are active

## Integration with Existing Code

The implementation integrates seamlessly with the existing merge flow in `frontend/app/api/auth/merge-anonymous/route.ts`:

- Uses existing RPC call: `merge_anonymous_user_data`
- Maintains 202 status code for idempotency
- Preserves versioned HMAC cookie validation
- Supports existing rate limiting and CSRF protection

## Monitoring and Maintenance

### Logging
- All merge operations logged with correlation IDs
- Error tracking in `merge_jobs.error_message`
- Performance monitoring via completion timestamps

### Cleanup
- Consider periodic cleanup of old merge_jobs records
- Monitor for failed merges requiring manual intervention

## Future Enhancements

1. **Batch Processing**: Support for bulk user merges
2. **Conflict Resolution**: UI for handling merge conflicts
3. **Audit Reports**: Detailed reporting of merge operations
4. **Performance Optimization**: Index optimization for large datasets

## Conclusion

The implementation addresses both verification comments comprehensively:

1. ✅ **JWT jti extraction** now properly handles base64url encoding
2. ✅ **Database function** provides robust, idempotent merge support with audit trail

The solution maintains security, performance, and reliability while providing a solid foundation for anonymous user data merging.
