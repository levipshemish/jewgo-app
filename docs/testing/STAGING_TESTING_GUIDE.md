# Staging Environment Testing Guide

## Overview

This guide provides comprehensive testing procedures for the anonymous authentication system in the staging environment before deploying to production.

## 🧪 Testing Environment Setup

### 1. Staging Environment Configuration

Ensure your staging environment has these configurations:

```bash
# Staging Environment Variables
NODE_ENV=staging
CLEANUP_DRY_RUN=true
ANONYMOUS_USER_AGE_DAYS=1  # Shorter for testing
UPSTASH_REDIS_REST_URL=your-staging-redis-url
CRON_SECRET=your-staging-cron-secret
```

### 2. Test Data Setup

Create test data for comprehensive testing:

```sql
-- Create test anonymous users
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'anon1@test.com', '{"is_anonymous": true}', NOW() - INTERVAL '2 days'),
  ('22222222-2222-2222-2222-222222222222', 'anon2@test.com', '{"is_anonymous": true}', NOW() - INTERVAL '1 day'),
  ('33333333-3333-3333-3333-333333333333', 'anon3@test.com', '{"is_anonymous": true}', NOW());

-- Create test regular users
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at)
VALUES 
  ('44444444-4444-4444-4444-444444444444', 'user1@test.com', '{"is_anonymous": false}', NOW()),
  ('55555555-5555-5555-5555-555555555555', 'user2@test.com', '{"is_anonymous": false}', NOW());
```

## 🔍 Test Scenarios

### 1. Feature Guard Testing

#### Test Boot-time Validation

```typescript
// Test Feature Guard initialization
import { initializeFeatureGuard } from '@/lib/feature-guard';

describe('Feature Guard', () => {
  test('should validate Supabase features on boot', async () => {
    const result = await initializeFeatureGuard();
    expect(result).toBe(true);
  });

  test('should handle missing environment variables', () => {
    // Temporarily remove environment variables
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    const result = validateSupabaseFeatureSupport();
    expect(result).toBe(false);
    
    // Restore
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  });
});
```

#### Manual Testing

```bash
# Test Feature Guard in browser console
# Open browser dev tools and run:
await import('/lib/feature-guard').then(m => m.initializeFeatureGuard())
```

### 2. Anonymous Authentication Testing

#### Test Anonymous Sign-in

```bash
# Test anonymous authentication endpoint
curl -X POST https://staging.yourdomain.com/api/auth/anonymous \
  -H "Content-Type: application/json" \
  -H "Origin: https://staging.yourdomain.com" \
  -v

# Expected response:
{
  "ok": true,
  "correlation_id": "anon_1234567890_abc123"
}
```

#### Test Rate Limiting

```bash
# Test rate limiting by making multiple requests
for i in {1..5}; do
  curl -X POST https://staging.yourdomain.com/api/auth/anonymous \
    -H "Content-Type: application/json" \
    -H "Origin: https://staging.yourdomain.com"
  echo "Request $i"
  sleep 1
done

# Should get rate limited after 3 requests
```

#### Test CSRF Protection

```bash
# Test with invalid origin
curl -X POST https://staging.yourdomain.com/api/auth/anonymous \
  -H "Content-Type: application/json" \
  -H "Origin: https://malicious-site.com" \
  -v

# Should return 403 Forbidden
```

### 3. Database RLS Testing

#### Test Anonymous User Access

```sql
-- Test as anonymous user
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

-- Should be able to read active restaurants
SELECT COUNT(*) FROM restaurants WHERE status = 'active' AND is_public = true;

-- Should NOT be able to read all restaurants
SELECT COUNT(*) FROM restaurants;

-- Should NOT be able to insert favorites
INSERT INTO favorites (user_id, restaurant_id) VALUES ('11111111-1111-1111-1111-111111111111', 1);
-- Should fail with permission error
```

#### Test Regular User Access

```sql
-- Test as regular user
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '44444444-4444-4444-4444-444444444444';

-- Should be able to read all restaurants
SELECT COUNT(*) FROM restaurants;

-- Should be able to insert favorites
INSERT INTO favorites (user_id, restaurant_id) VALUES ('44444444-4444-4444-4444-444444444444', 1);
-- Should succeed
```

### 4. Write Gates Testing

#### Test Permission Checks

```typescript
// Test Write Gates in browser console
import { writeGates } from '@/lib/auth/write-gates';

// Test as anonymous user
const anonPermissions = await writeGates.getUserPermissions();
console.log('Anonymous permissions:', anonPermissions);
// Expected: canWrite: false, isAnonymous: true

// Test as regular user
const userPermissions = await writeGates.getUserPermissions();
console.log('User permissions:', userPermissions);
// Expected: canWrite: true, isAnonymous: false
```

#### Test Permission Blocking

```typescript
// Test that anonymous users cannot perform write operations
try {
  await writeGates.requireWrite();
  console.error('❌ Anonymous user should not have write access');
} catch (error) {
  console.log('✅ Correctly blocked anonymous user:', error.message);
}
```

### 5. Email Upgrade Flow Testing

#### Test Email Upgrade

```typescript
// Test email upgrade flow
import { emailUpgradeFlow } from '@/lib/auth/email-upgrade';

// Test with new email
const result = await emailUpgradeFlow.upgradeWithEmail('newuser@test.com');
console.log('Upgrade result:', result);
// Expected: success: true
```

#### Test Email Conflict

```typescript
// Test with existing email
const conflictResult = await emailUpgradeFlow.upgradeWithEmail('user1@test.com');
console.log('Conflict result:', conflictResult);
// Expected: requiresMerge: true
```

#### Test Account Merge

```typescript
// Test account merging
const mergeResult = await emailUpgradeFlow.handleAccountMerge();
console.log('Merge result:', mergeResult);
// Expected: success: true, movedRecords: [...]
```

### 6. Cleanup Cron Job Testing

#### Test Dry Run

```bash
# Test cleanup with dry run
curl -X POST https://staging.yourdomain.com/api/cron/cleanup-anonymous \
  -H "Authorization: Bearer YOUR_STAGING_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true}'

# Expected response:
{
  "success": true,
  "message": "Anonymous user cleanup completed",
  "processed": 3,
  "deleted": 0,
  "dry_run": true,
  "user_ids": ["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"]
}
```

#### Test Actual Cleanup

```bash
# Test actual cleanup (be careful!)
curl -X POST https://staging.yourdomain.com/api/cron/cleanup-anonymous \
  -H "Authorization: Bearer YOUR_STAGING_CRON_SECRET" \
  -H "Content-Type: application/json"

# Should delete users older than 1 day in staging
```

### 7. End-to-End User Journey Testing

#### Complete Anonymous User Journey

1. **Visit site as anonymous user**
   ```bash
   # Clear cookies and visit site
   curl -c cookies.txt https://staging.yourdomain.com
   ```

2. **Click "Continue as Guest"**
   ```bash
   # Simulate anonymous sign-in
   curl -b cookies.txt -X POST https://staging.yourdomain.com/api/auth/anonymous \
     -H "Content-Type: application/json" \
     -H "Origin: https://staging.yourdomain.com"
   ```

3. **Browse content (should work)**
   ```bash
   # Test reading restaurants
   curl -b cookies.txt https://staging.yourdomain.com/api/restaurants
   ```

4. **Try to save favorite (should fail)**
   ```bash
   # Test writing favorites
   curl -b cookies.txt -X POST https://staging.yourdomain.com/api/favorites \
     -H "Content-Type: application/json" \
     -d '{"restaurant_id": 1}'
   # Should return 403 Forbidden
   ```

5. **Upgrade account**
   ```bash
   # Test email upgrade
   curl -b cookies.txt -X POST https://staging.yourdomain.com/api/auth/upgrade \
     -H "Content-Type: application/json" \
     -d '{"email": "newuser@test.com"}'
   ```

6. **Verify email and set password**
   ```bash
   # Test email verification
   curl -b cookies.txt -X POST https://staging.yourdomain.com/api/auth/verify \
     -H "Content-Type: application/json" \
     -d '{"token": "verification_token"}'
   ```

7. **Test write access (should work)**
   ```bash
   # Test writing favorites after upgrade
   curl -b cookies.txt -X POST https://staging.yourdomain.com/api/favorites \
     -H "Content-Type: application/json" \
     -d '{"restaurant_id": 1}'
   # Should succeed
   ```

## 📊 Test Results Documentation

### Test Results Template

```markdown
# Staging Test Results

## Test Date: [DATE]
## Environment: Staging
## Tester: [NAME]

### Feature Guard
- [ ] Boot-time validation works
- [ ] Handles missing environment variables
- [ ] Sentry logging works

### Anonymous Authentication
- [ ] Anonymous sign-in works
- [ ] Rate limiting works (3/hour, 10/day)
- [ ] CSRF protection works
- [ ] Duplicate session prevention works

### Database RLS
- [ ] Anonymous users can read public data
- [ ] Anonymous users cannot write data
- [ ] Regular users can read/write data
- [ ] Policies work correctly

### Write Gates
- [ ] Anonymous users blocked from writes
- [ ] Regular users can write
- [ ] Permission checks work
- [ ] Error messages are clear

### Email Upgrade Flow
- [ ] Email upgrade works for new emails
- [ ] Email conflict detection works
- [ ] Account merging works
- [ ] Email verification works

### Cleanup Cron Job
- [ ] Dry run works
- [ ] Actual cleanup works
- [ ] Authentication works
- [ ] Logging works

### End-to-End Journey
- [ ] Complete anonymous user journey works
- [ ] Account upgrade works
- [ ] Write access granted after upgrade
- [ ] No data loss during upgrade

## Issues Found
- [List any issues found]

## Performance Notes
- [Any performance observations]

## Security Notes
- [Any security observations]
```

## 🚨 Common Issues and Solutions

### 1. Environment Variable Issues

**Issue**: Missing environment variables
**Solution**: Check staging environment configuration

### 2. Database Connection Issues

**Issue**: Cannot connect to database
**Solution**: Verify DATABASE_URL and network connectivity

### 3. Rate Limiting Issues

**Issue**: Rate limiting not working
**Solution**: Check Upstash Redis configuration

### 4. RLS Policy Issues

**Issue**: Policies not working as expected
**Solution**: Check policy syntax and user roles

### 5. Cron Job Issues

**Issue**: Cron job not running
**Solution**: Check Vercel cron configuration and CRON_SECRET

## 📈 Performance Testing

### Load Testing

```bash
# Test rate limiting under load
for i in {1..20}; do
  curl -X POST https://staging.yourdomain.com/api/auth/anonymous \
    -H "Content-Type: application/json" \
    -H "Origin: https://staging.yourdomain.com" &
done
wait

# Check how many requests were rate limited
```

### Database Performance

```sql
-- Test RLS policy performance
EXPLAIN ANALYZE SELECT * FROM restaurants WHERE status = 'active' AND is_public = true;

-- Check if indexes are being used
```

## 🔒 Security Testing

### Penetration Testing

```bash
# Test CSRF protection
curl -X POST https://staging.yourdomain.com/api/auth/anonymous \
  -H "Content-Type: application/json" \
  -H "Origin: https://malicious-site.com"

# Test SQL injection (should be blocked by RLS)
curl -X GET "https://staging.yourdomain.com/api/restaurants?id=1' OR '1'='1"

# Test unauthorized access
curl -X POST https://staging.yourdomain.com/api/cron/cleanup-anonymous \
  -H "Authorization: Bearer INVALID_SECRET"
```

## ✅ Success Criteria

Staging testing is complete when:

- [ ] All test scenarios pass
- [ ] No critical issues found
- [ ] Performance is acceptable
- [ ] Security tests pass
- [ ] Documentation is updated
- [ ] Team has reviewed results

## 🚀 Ready for Production

After successful staging testing:

1. **Update production environment variables**
2. **Apply database migration**
3. **Configure Vercel cron job**
4. **Deploy to production**
5. **Monitor for issues**

---

**Next Steps**: After completing staging testing, proceed to production deployment.
