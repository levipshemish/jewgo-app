# NextAuth.js to Supabase Auth Migration Plan

## Overview
This document outlines a gradual migration strategy from NextAuth.js to Supabase Auth for the JewGo application. The approach prioritizes maintaining a working authentication system while incrementally transitioning to Supabase.

## Current State
- ✅ NextAuth.js with Google OAuth and Credentials providers
- ✅ User registration API endpoint
- ✅ Working signin/signup pages
- ✅ Prisma database integration
- ✅ JWT session strategy

## Migration Strategy: Phased Approach

### Phase 1: Foundation Setup (Week 1-2)
**Goal**: Set up Supabase infrastructure alongside NextAuth.js

#### 1.1 Supabase Project Setup
- [ ] Create Supabase project
- [ ] Configure Auth providers (Google OAuth, Email)
- [ ] Set up environment variables
- [ ] Configure Auth URL settings

#### 1.2 Supabase Client Setup
- [ ] Install Supabase packages (`@supabase/supabase-js`, `@supabase/ssr`)
- [ ] Create Supabase client files:
  - `lib/supabase/client.ts` (browser client)
  - `lib/supabase/server.ts` (server client)
  - `lib/supabase/middleware.ts` (middleware client)
- [ ] Set up auth helper functions (`lib/auth.ts`)

#### 1.3 Database Schema Preparation
- [ ] Review current Prisma schema
- [ ] Plan user data migration strategy
- [ ] Create Supabase user profile table
- [ ] Set up RLS (Row Level Security) policies

### Phase 2: Parallel Authentication (Week 3-4)
**Goal**: Run both systems in parallel

#### 2.1 Dual Auth System
- [ ] Create Supabase auth pages alongside NextAuth pages
- [ ] Implement auth provider selection
- [ ] Set up session synchronization between systems
- [ ] Create user data sync mechanism

#### 2.2 Testing Infrastructure
- [ ] Create comprehensive auth tests
- [ ] Set up staging environment with both systems
- [ ] Implement monitoring and logging
- [ ] Create rollback procedures

### Phase 3: Gradual User Migration (Week 5-8)
**Goal**: Migrate users to Supabase one by one

#### 3.1 User Migration Tools
- [ ] Create user migration script
- [ ] Implement data validation
- [ ] Set up migration monitoring
- [ ] Create user notification system

#### 3.2 Feature-by-Feature Migration
- [ ] Migrate signin flow
- [ ] Migrate signup flow
- [ ] Migrate password reset
- [ ] Migrate profile management
- [ ] Migrate admin features

### Phase 4: Complete Transition (Week 9-10)
**Goal**: Fully transition to Supabase

#### 4.1 Final Migration
- [ ] Migrate remaining users
- [ ] Update all auth-dependent features
- [ ] Remove NextAuth.js dependencies
- [ ] Clean up old auth code

#### 4.2 Post-Migration Tasks
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation updates
- [ ] Team training

## Technical Implementation Details

### Environment Variables
```bash
# Current NextAuth.js
NEXTAUTH_URL=https://jewgo-app.vercel.app
NEXTAUTH_SECRET=your-nextauth-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# New Supabase (to be added)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Database Schema Changes
```sql
-- Current Prisma schema (to be migrated)
model User {
  id            String   @id @default(cuid())
  name          String?
  email         String   @unique
  password      String?
  isSuperAdmin  Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

-- New Supabase schema
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Auth Flow Comparison

#### Current NextAuth.js Flow
1. User submits credentials
2. NextAuth.js validates against Prisma
3. JWT token created
4. Session stored in cookies

#### Target Supabase Flow
1. User submits credentials
2. Supabase validates against auth.users
3. Access token created
4. Session managed by Supabase

## Risk Mitigation

### High-Risk Areas
1. **User Data Loss**: Implement comprehensive backup strategy
2. **Service Downtime**: Use blue-green deployment approach
3. **Authentication Failures**: Maintain dual system during transition
4. **Data Inconsistency**: Implement strict validation and rollback procedures

### Rollback Plan
1. Keep NextAuth.js codebase intact
2. Maintain database backups
3. Create quick rollback scripts
4. Monitor system health continuously

## Success Metrics

### Technical Metrics
- [ ] Zero authentication failures during migration
- [ ] <100ms auth response time
- [ ] 99.9% uptime during transition
- [ ] Zero data loss

### User Experience Metrics
- [ ] Seamless user experience during migration
- [ ] No user complaints about auth changes
- [ ] Maintained user engagement levels

## Timeline Summary

| Week | Phase | Key Deliverables |
|------|-------|------------------|
| 1-2  | Foundation | Supabase setup, client files |
| 3-4  | Parallel | Dual auth system, testing |
| 5-8  | Migration | User migration, feature migration |
| 9-10 | Transition | Complete transition, cleanup |

## Next Steps

### Immediate Actions (This Week)
1. [ ] Set up Supabase project
2. [ ] Configure environment variables
3. [ ] Create Supabase client files
4. [ ] Test basic Supabase auth flow

### Week 2 Actions
1. [ ] Implement dual auth system
2. [ ] Create migration scripts
3. [ ] Set up monitoring
4. [ ] Begin user testing

## Resources and References

### Documentation
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs/)

### Tools and Libraries
- `@supabase/supabase-js` - Supabase client
- `@supabase/ssr` - Server-side rendering support
- `bcryptjs` - Password hashing (already installed)

### Support and Monitoring
- Supabase Dashboard for monitoring
- Vercel Analytics for performance
- Sentry for error tracking

---

**Note**: This migration plan prioritizes stability and user experience. Each phase includes comprehensive testing and rollback procedures to ensure a smooth transition.
