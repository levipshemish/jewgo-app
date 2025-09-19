# Requirements: Specials System

## Problem Statement
The JewGo app needs a specials system that allows restaurants to create and manage promotional offers, and users to discover and claim these specials. The system should integrate seamlessly with existing restaurant data without duplication.

## Scope
- Create a specials table system that references existing restaurants
- Support multiple types of discounts (percentage, fixed amount, BOGO, etc.)
- Implement claim tracking for users and guests
- Provide time-based validity windows
- Support media attachments for specials
- Track analytics events (views, shares, claims)

## Constraints
- Must reuse existing `restaurants` table (no duplication)
- Must support both authenticated users and guest sessions
- Must enforce claim limits at database level
- Must be performant for real-time queries
- Must support future recurrence patterns
- Must follow existing project patterns and conventions

## Acceptance Criteria

### Core Functionality
- [ ] Restaurants can create specials with title, description, discount details
- [ ] Specials have configurable validity windows (start/end times)
- [ ] Users can view active specials for a restaurant
- [ ] Users can claim specials (once per user or once per day based on configuration)
- [ ] Staff can redeem claimed specials
- [ ] System tracks special views, shares, and claims for analytics

### Data Integrity
- [ ] Database enforces claim limits via unique indexes
- [ ] No duplicate claims per user per special (or per day if configured)
- [ ] Soft delete support for specials
- [ ] Referential integrity with restaurants table

### Performance
- [ ] Fast queries for "active specials now" using GiST indexes
- [ ] Efficient time-range queries for upcoming specials
- [ ] Materialized view for frequently accessed active specials

### API Surface
- [ ] `GET /v5/restaurants/:id/specials?window=now|today|range` - List specials
- [ ] `POST /v5/specials` - Create special (restaurant owners/admins)
- [ ] `PATCH /v5/specials/:id` - Update special (restaurant owners/admins)
- [ ] `POST /v5/specials/:id/claim` - Claim special (users/guests)
- [ ] `POST /v5/specials/:id/redeem` - Redeem claim (staff)
- [ ] `POST /v5/specials/:id/events` - Track analytics events

### Frontend Integration
- [ ] Specials display on restaurant detail pages
- [ ] Claim button with proper error handling
- [ ] Support for special media (images, videos)
- [ ] Mobile-responsive design

## Out of Scope (Future Phases)
- Recurring specials (will be designed for but not implemented in v1)
- Advanced analytics dashboard
- Special templates
- Bulk special management
- Email notifications for specials

## Success Metrics
- Restaurants can create and manage specials without technical assistance
- Users can discover and claim specials with <2 second response time
- Zero duplicate claims due to database constraints
- 99.9% uptime for specials queries during peak hours
