# 🔧 Anonymous Auth 500 Error Fix

## **Problem**
Anonymous sign-in was failing with a 500 error from `/auth/v1/signup` endpoint. This was caused by database triggers that expected email/metadata that anonymous users don't have.

## **Root Cause**
The `handle_new_user()` trigger function was either missing or not properly handling anonymous users. When `signInAnonymously()` creates a user, Supabase still inserts a row into `auth.users`, but any database triggers that assume email/metadata exists can throw errors, causing Auth to return 500.

## **Solution**

### **1. Anonymous-Safe Database Trigger**

Created migration `20250101000002_fix_anonymous_auth_trigger.sql` that:

- **Detects anonymous users** by checking `raw_app_meta_data->>'provider' = 'anonymous'`
- **Creates minimal profiles** for anonymous users with default values
- **Handles regular users** with proper email/name extraction
- **Includes error handling** to prevent trigger failures from breaking user creation

### **2. Key Features**

```sql
-- Anonymous user detection
IF COALESCE(NEW.raw_app_meta_data->>'provider', '') = 'anonymous' THEN
  -- Create minimal profile for anonymous users
  INSERT INTO public.profiles (user_id, name, created_at, updated_at)
  VALUES (NEW.id, 'Guest User', NOW(), NOW());
  RETURN NEW;
END IF;
```

### **3. Error Handling**

```sql
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
```

## **Files Modified**

### **New Files**
- `supabase/migrations/20250101000002_fix_anonymous_auth_trigger.sql` - Anonymous-safe trigger
- `supabase/config.toml` - Supabase configuration with anonymous auth enabled
- `scripts/apply-anonymous-auth-fix.sh` - Migration application script

### **Updated Files**
- `frontend/hooks/useAuth.ts` - Direct Supabase calls instead of POST endpoint
- `frontend/app/auth/signin/page.tsx` - Direct Supabase calls


## **Application Steps**

### **1. Apply Migration**
```bash
# From project root
./scripts/apply-anonymous-auth-fix.sh
```

### **2. Verify Supabase Settings**
1. **Auth → Settings → Authentication**
   - Ensure **Anonymous sign-ins** is enabled
2. **Logs → Explorer** (filter to `auth` and `error`)
   - Check for any remaining database errors

### **3. Test Anonymous Auth**
```typescript
// Test the fix
const { data, error } = await supabase.auth.signInAnonymously();
if (error) {
  console.error('Anonymous sign-in failed:', error);
} else {
  console.log('Anonymous user created:', data.user);
}
```

## **Verification Checklist**

- [ ] Migration applied successfully
- [ ] Anonymous sign-ins enabled in Supabase
- [ ] No 500 errors in Supabase logs
- [ ] Anonymous users can sign in without errors
- [ ] Profiles are created for anonymous users
- [ ] Regular user sign-in still works
- [ ] RLS policies work for anonymous users

## **Troubleshooting**

### **Still Getting 500 Errors?**

1. **Check Supabase Logs**
   ```bash
   # In Supabase dashboard: Logs → Explorer
   # Filter by: auth, error
   # Look for specific database errors
   ```

2. **Verify Trigger Installation**
   ```sql
   -- Check if trigger exists
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name = 'on_auth_user_created';
   ```

3. **Test Trigger Function**
   ```sql
   -- Test the function manually
   SELECT public.handle_new_user();
   ```

### **Common Issues**

1. **"Function does not exist"**
   - Run the migration again: `supabase db push`

2. **"Permission denied"**
   - Check RLS policies on profiles table
   - Ensure proper grants are in place

3. **"Column not null violation"**
   - Check profiles table schema
   - Ensure all required columns have defaults

## **Performance Impact**

- **Minimal**: Trigger only runs on user creation
- **Efficient**: Anonymous detection is fast
- **Safe**: Error handling prevents failures

## **Security Considerations**

- **RLS Policies**: Anonymous users can only access their own profile
- **Minimal Data**: Anonymous profiles contain only essential fields
- **No PII**: Anonymous users don't have email/name data

## **Future Improvements**

1. **Profile Cleanup**: Add cron job to clean up old anonymous profiles
2. **Analytics**: Track anonymous user conversion rates
3. **Upgrade Flow**: Smooth transition from anonymous to full user

## **Related Documentation**

- [Supabase Anonymous Auth Guide](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Database Triggers Documentation](https://supabase.com/docs/guides/database/database-functions)
- [RLS Policies Guide](https://supabase.com/docs/guides/auth/row-level-security)
