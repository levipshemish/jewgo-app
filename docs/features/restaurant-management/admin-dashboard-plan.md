## Admin Dashboard Task List

### Phase 1 — Core Dashboard & Access Control
- [x] Create `frontend/app/admin/layout.tsx` with server-side auth guard (NextAuth) and basic nav
- [x] Add `frontend/app/admin/page.tsx` overview with mocked stats and quick actions
- [x] Harden middleware to protect `/admin/**` (NextAuth middleware)
- [x] Add role check helper and centralize admin policy
- [ ] Document env vars and how to grant admin access

#### Environment Variables
- `NEXTAUTH_SECRET`: Secret for NextAuth
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: OAuth for sign-in
- `NEXT_PUBLIC_ADMIN_EMAIL`: Optional, explicit admin email allowed besides `@jewgo.com`

Admins are users whose email either ends with `@jewgo.com` or matches `NEXT_PUBLIC_ADMIN_EMAIL`.

### Phase 2 — Restaurant Management Enhancements
- [ ] Enhance `/admin/restaurants` to support bulk approve/reject (UI + API)
- [ ] Add advanced filters (status, type, date)
- [ ] Add edit flow for key fields with validation
- [ ] Add audit trail logging for actions

### Phase 3 — Review Moderation
- [ ] Implement backend review moderation endpoints
- [ ] Connect `/admin/reviews` to backend, add bulk actions
- [ ] Add flag resolution workflow and notes

### Phase 4 — Analytics & Health
- [ ] Build `/admin/analytics` using existing analytics component
- [ ] Add API latency and error-rate widgets
- [ ] Hook up health checks and alerts

### Phase 5 — Specials & Content
- [ ] Connect `/admin/specials` to backend endpoints
- [ ] Add enable/disable and scheduling

### Phase 6 — System & Security
- [ ] Admin users table and role management (optional phase)
- [ ] IP whitelist editor UI (reads from backend)
- [ ] Feature flags admin page link + guard

### QA & Monitoring
- [ ] Type-check, lint, unit tests for critical components
- [ ] E2E happy-path for admin navigation and guards
- [ ] Deployment checklist updates and post-deploy verification


