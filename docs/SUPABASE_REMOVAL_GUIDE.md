# Supabase Removal Guide

## 🎯 **Overview**

This guide will help you completely remove Supabase from your project after migrating to the new PostgreSQL-based authentication system. This ensures a clean transition with no leftover dependencies or configuration.

## ⚠️ **Prerequisites**

- ✅ **Frontend migration is complete** and tested
- ✅ **New authentication system is working** in production
- ✅ **All users have been migrated** to the new system
- ✅ **Backup of current system** is created

## 🔍 **Step 1: Audit Current Supabase Usage**

Before removing anything, let's identify all Supabase-related code and dependencies:

### **Search for Supabase Imports**

```bash
# Search for Supabase imports in your codebase
grep -r "supabase" frontend/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
grep -r "createClient" frontend/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
grep -r "createClientComponentClient" frontend/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
grep -r "createServerComponentClient" frontend/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
```

### **Check Package Dependencies**

```bash
cd frontend
npm list | grep supabase
```

### **Check Environment Files**

```bash
# Look for Supabase environment variables
grep -r "SUPABASE" .env* ../.env*
```

## 🧹 **Step 2: Remove Supabase Dependencies**

### **Remove NPM Packages**

```bash
cd frontend
npm uninstall @supabase/supabase-js @supabase/auth-helpers-nextjs @supabase/auth-helpers-react @supabase/auth-ui-react @supabase/auth-ui-shared
```

### **Remove Supabase Configuration Files**

```bash
# Remove Supabase configuration
rm -rf supabase/
rm -f .env.local.supabase
rm -f supabase.config.js
rm -f supabase.config.ts
```

### **Clean Up Package.json**

Remove any Supabase-related scripts:

```json
{
  "scripts": {
    // Remove these if they exist:
    // "supabase:start": "supabase start",
    // "supabase:stop": "supabase stop",
    // "supabase:status": "supabase status",
    // "db:reset": "supabase db reset"
  }
}
```

## 🔄 **Step 3: Remove Supabase Code**

### **Remove Supabase Client Files**

```bash
# Remove Supabase client files
rm -f frontend/lib/supabase.ts
rm -f frontend/lib/supabase-client.ts
rm -f frontend/lib/supabase-server.ts
rm -f frontend/lib/supabase-browser.ts
```

### **Remove Supabase Auth Components**

```bash
# Remove Supabase-specific auth components
rm -f frontend/components/SupabaseAuth.tsx
rm -f frontend/components/SupabaseLogin.tsx
rm -f frontend/components/SupabaseRegister.tsx
```

### **Remove Supabase Context**

```bash
# Remove Supabase auth context
rm -f frontend/contexts/SupabaseAuthContext.tsx
rm -f frontend/contexts/SupabaseContext.tsx
```

## 🗑️ **Step 4: Clean Up Environment Variables**

### **Remove from .env.local**

```bash
# Remove these lines from .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
SUPABASE_JWT_EXPIRY=
```

### **Remove from Backend .env**

```bash
# Remove these lines from backend/.env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
ENABLE_JWKS_SCHEDULER=
```

### **Update Environment Examples**

```bash
# Update .env.example files to remove Supabase references
sed -i '' '/SUPABASE/d' .env.example
sed -i '' '/SUPABASE/d' backend/.env.example
```

## 🔍 **Step 5: Search and Replace Code**

### **Remove Supabase Imports**

Search for and remove these import statements:

```typescript
// Remove these imports:
import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { User, Session } from '@supabase/supabase-js'
```

### **Remove Supabase Client Usage**

Search for and remove:

```typescript
// Remove these patterns:
const supabase = createClient(url, key)
const supabase = createClientComponentClient()
const supabase = createServerComponentClient()

// Remove Supabase auth calls:
const { data: { user } } = await supabase.auth.getUser()
const { data, error } = await supabase.auth.signInWithPassword()
const { error } = await supabase.auth.signUp()
const { error } = await supabase.auth.signOut()
```

### **Remove Supabase Database Calls**

Search for and remove:

```typescript
// Remove Supabase database calls:
const { data, error } = await supabase
  .from('table_name')
  .select('*')

const { data, error } = await supabase
  .from('table_name')
  .insert(data)

const { data, error } = await supabase
  .from('table_name')
  .update(data)
  .eq('id', id)
```

## 🧪 **Step 6: Test the System**

### **Run TypeScript Check**

```bash
cd frontend
npx tsc --noEmit
```

### **Run Linting**

```bash
cd frontend
npm run lint
```

### **Test Authentication Flow**

1. **User Registration**: Test new user signup
2. **User Login**: Test user authentication
3. **Protected Routes**: Test route protection
4. **Token Refresh**: Test JWT refresh
5. **User Logout**: Test logout functionality

### **Test API Endpoints**

```bash
# Test all authentication endpoints
curl -X POST http://localhost:8082/api/auth/register -H "Content-Type: application/json" -d '{"email": "test@example.com", "password": "TestPass123"}'
curl -X POST http://localhost:8082/api/auth/login -H "Content-Type: application/json" -d '{"email": "test@example.com", "password": "TestPass123"}'
curl -X POST http://localhost:8082/api/auth/health
```

## 🚀 **Step 7: Production Deployment**

### **Update Production Environment**

1. **Remove Supabase environment variables** from production
2. **Add new authentication environment variables**
3. **Update CORS settings** if needed
4. **Test authentication in production**

### **Database Migration**

1. **Ensure all users are migrated** to the new system
2. **Verify user roles** are correctly assigned
3. **Test authentication flow** in production
4. **Monitor authentication logs**

## 🔍 **Step 8: Final Verification**

### **Check for Remaining Supabase References**

```bash
# Final search for any remaining Supabase references
grep -r "supabase" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=venv
grep -r "SUPABASE" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=venv
```

### **Verify No Supabase Dependencies**

```bash
cd frontend
npm list | grep -i supabase
# Should return nothing
```

### **Check Build Process**

```bash
cd frontend
npm run build
# Should complete without Supabase-related errors
```

## 📋 **Cleanup Checklist**

- [ ] **Supabase packages removed** from package.json
- [ ] **Supabase configuration files** deleted
- [ ] **Supabase imports removed** from all components
- [ ] **Supabase client usage** replaced with new auth system
- [ ] **Environment variables** updated
- [ ] **TypeScript errors** resolved
- [ ] **Linting errors** resolved
- [ ] **Authentication flow** tested
- [ ] **Production deployment** completed
- [ ] **No remaining Supabase references** found

## 🎉 **Migration Complete!**

After completing these steps, your project will be completely free of Supabase dependencies and fully migrated to your custom PostgreSQL authentication system.

## 🔧 **Troubleshooting**

### **Common Issues**

1. **TypeScript errors**: Check for remaining Supabase type references
2. **Build failures**: Ensure all Supabase imports are removed
3. **Runtime errors**: Verify authentication context is properly updated
4. **Missing dependencies**: Check if any components still reference Supabase

### **Rollback Plan**

If issues arise, you can temporarily restore Supabase:

1. **Restore Supabase packages**: `npm install @supabase/supabase-js`
2. **Restore environment variables**
3. **Restore Supabase configuration files**
4. **Test the old system**

## 📚 **Next Steps**

After completing Supabase removal:

1. **Monitor system performance** and authentication logs
2. **Update documentation** to reflect new authentication system
3. **Train team members** on the new authentication flow
4. **Plan future enhancements** to the authentication system

## 🎯 **Benefits of Migration**

- ✅ **Full control** over authentication data
- ✅ **No external dependencies** for authentication
- ✅ **Custom user management** and roles
- ✅ **Better security** with your own JWT implementation
- ✅ **Reduced costs** (no Supabase subscription)
- ✅ **Complete data ownership** and privacy

Your authentication system is now completely self-contained and ready for production use!
