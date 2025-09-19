# Design: Specials System

## Architecture Overview

The specials system integrates with the existing JewGo database schema by referencing the `restaurants` table without duplicating data. It uses a normalized design with lookup tables for extensibility and GiST indexes for efficient time-range queries.

## Database Schema Design

### Core Tables

#### 1. Lookup Tables (Replace ENUMs)
```sql
-- Discount types (percentage, fixed_amount, bogo, free_item, other)
discount_kinds (code, label)

-- Claim statuses (claimed, redeemed, expired, cancelled, revoked)  
claim_statuses (code, label)

-- Media types (image, video, other)
media_kinds (code, label)
```

#### 2. Main Specials Table
```sql
specials (
  id UUID PRIMARY KEY,
  restaurant_id INTEGER REFERENCES restaurants(id),
  
  -- Content
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,
  
  -- Discount Configuration
  discount_type TEXT REFERENCES discount_kinds(code),
  discount_value NUMERIC(10,2),
  discount_label VARCHAR(100) NOT NULL,
  
  -- Time Windows (using TSTZRANGE for efficiency)
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  valid_range TSTZRANGE GENERATED ALWAYS AS (tstzrange(valid_from, valid_until, '[)')) STORED,
  
  -- Limits & Rules
  max_claims_total INTEGER,
  max_claims_per_user INTEGER DEFAULT 1,
  per_visit BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Terms & Conditions
  requires_code BOOLEAN DEFAULT FALSE,
  code_hint VARCHAR(100),
  terms TEXT,
  
  -- Media
  hero_image_url TEXT,
  
  -- Audit Trail
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
)
```

#### 3. Media Attachments
```sql
special_media (
  id UUID PRIMARY KEY,
  special_id UUID REFERENCES specials(id),
  kind TEXT REFERENCES media_kinds(code),
  url TEXT NOT NULL,
  alt_text TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

#### 4. Claims Tracking
```sql
special_claims (
  id UUID PRIMARY KEY,
  special_id UUID REFERENCES specials(id),
  
  -- User/Guest Identity
  user_id UUID REFERENCES users(id),
  guest_session_id UUID REFERENCES guest_sessions(id),
  
  -- Claim Details
  claimed_at TIMESTAMPTZ DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  
  -- Status & Redemption
  status TEXT REFERENCES claim_statuses(code),
  redeemed_at TIMESTAMPTZ,
  redeemed_by UUID REFERENCES users(id),
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  
  -- Generated column for daily limits
  claim_day DATE GENERATED ALWAYS AS (claimed_at AT TIME ZONE 'UTC')::date STORED
)
```

#### 5. Analytics Events
```sql
special_events (
  id UUID PRIMARY KEY,
  special_id UUID REFERENCES specials(id),
  user_id UUID REFERENCES users(id),
  guest_session_id UUID REFERENCES guest_sessions(id),
  event_type TEXT CHECK (event_type IN ('view','share','click','claim')),
  occurred_at TIMESTAMPTZ DEFAULT now(),
  ip_address INET,
  user_agent TEXT
)
```

### Index Strategy

#### Performance Indexes
```sql
-- Fast "active now" queries per restaurant
CREATE INDEX idx_specials_restaurant_active_now 
  ON specials USING GIST (valid_range)
  WHERE is_active AND deleted_at IS NULL;

-- Restaurant-specific active specials
CREATE INDEX idx_specials_restaurant_id 
  ON specials (restaurant_id)
  WHERE is_active AND deleted_at IS NULL;

-- Time range queries
CREATE INDEX idx_specials_valid_range_gist 
  ON specials USING GIST (valid_range);
```

#### Uniqueness Constraints
```sql
-- One claim per user per special (when per_visit = FALSE)
CREATE UNIQUE INDEX uq_claim_once_per_user
  ON special_claims (special_id, user_id)
  WHERE user_id IS NOT NULL AND per_visit = FALSE;

-- One claim per day per user (when per_visit = TRUE)
CREATE UNIQUE INDEX uq_claim_daily_user
  ON special_claims (special_id, user_id, claim_day)
  WHERE user_id IS NOT NULL AND per_visit = TRUE;
```

## API Design

### Endpoints

#### List Specials
```
GET /v5/restaurants/:id/specials
Query Parameters:
- window: now|today|range
- from: ISO timestamp (for range)
- until: ISO timestamp (for range)
- limit: number (default 50)
- offset: number (default 0)

Response:
{
  "specials": [
    {
      "id": "uuid",
      "title": "Happy Hour Special",
      "discount_label": "50% off appetizers",
      "valid_from": "2024-01-20T17:00:00Z",
      "valid_until": "2024-01-20T19:00:00Z",
      "max_claims_total": 100,
      "hero_image_url": "https://...",
      "can_claim": true,
      "user_claims_remaining": 1
    }
  ],
  "total": 5,
  "has_more": false
}
```

#### Create Special
```
POST /v5/specials
Authorization: Bearer <restaurant_owner_token>
Body:
{
  "restaurant_id": 123,
  "title": "Weekend Brunch Special",
  "subtitle": "All day Saturday & Sunday",
  "description": "Special brunch menu with discounted prices",
  "discount_type": "percentage",
  "discount_value": 20.0,
  "discount_label": "20% off brunch items",
  "valid_from": "2024-01-27T09:00:00Z",
  "valid_until": "2024-01-28T15:00:00Z",
  "max_claims_total": 50,
  "max_claims_per_user": 1,
  "per_visit": false,
  "terms": "Valid on brunch items only. Cannot be combined with other offers."
}
```

#### Claim Special
```
POST /v5/specials/:id/claim
Body:
{
  "guest_session_id": "uuid" // if not authenticated
}

Response:
{
  "claim_id": "uuid",
  "status": "claimed",
  "claimed_at": "2024-01-20T18:30:00Z",
  "redeem_code": "ABC123", // if requires_code = true
  "terms": "Show this code to staff when ordering"
}
```

#### Redeem Claim
```
POST /v5/specials/:id/redeem
Authorization: Bearer <staff_token>
Body:
{
  "claim_id": "uuid",
  "redeem_code": "ABC123" // optional verification
}

Response:
{
  "status": "redeemed",
  "redeemed_at": "2024-01-20T19:15:00Z",
  "redeemed_by": "staff_user_id"
}
```

## Data Flow

### Claim Process
1. User views special on restaurant page
2. System logs 'view' event
3. User clicks "Claim" button
4. System checks claim eligibility:
   - Special is active and valid
   - User hasn't exceeded claim limits
   - Total claims haven't exceeded limit
5. System creates claim record with unique constraints
6. System logs 'claim' event
7. System returns claim confirmation with redeem code

### Redemption Process
1. Customer presents claim at restaurant
2. Staff enters redeem code or scans QR code
3. System marks claim as redeemed
4. System logs redemption event for analytics

## Security Considerations

### Authorization
- Restaurant owners can create/edit specials for their restaurants
- Admins can create/edit specials for any restaurant
- Staff can redeem claims for their restaurant
- Users can claim specials (authenticated or guest)

### Rate Limiting
- Implement rate limiting on claim endpoints
- Use existing Redis-based rate limiting system
- Different limits for authenticated vs guest users

### Data Validation
- Validate time ranges (valid_until > valid_from)
- Validate discount values (0 < percentage <= 100)
- Sanitize user input for terms and descriptions
- Validate image URLs for media attachments

## Performance Considerations

### Query Optimization
- Use GiST indexes for time-range queries
- Partial indexes on active specials only
- Materialized view for frequently accessed data
- Connection pooling for high-concurrency scenarios

### Caching Strategy
- Cache active specials per restaurant (5-minute TTL)
- Cache user claim counts (1-minute TTL)
- Use Redis for distributed caching
- Invalidate cache on special updates

### Monitoring
- Track query performance for specials endpoints
- Monitor claim success/failure rates
- Alert on high error rates or slow queries
- Track database connection pool usage

## Migration Strategy

### Phase 1: Database Setup
1. Create lookup tables and seed initial data
2. Create main specials table with indexes
3. Create supporting tables (media, claims, events)
4. Add triggers for updated_at timestamps

### Phase 2: API Implementation
1. Implement basic CRUD endpoints
2. Add claim/redemption logic
3. Implement event tracking
4. Add comprehensive error handling

### Phase 3: Frontend Integration
1. Add specials display to restaurant pages
2. Implement claim functionality
3. Add admin interface for special management
4. Add staff redemption interface

### Phase 4: Optimization
1. Add materialized views for performance
2. Implement caching layer
3. Add monitoring and alerting
4. Performance tuning based on usage patterns

## Risks & Mitigations

### Data Integrity Risks
- **Risk**: Duplicate claims due to race conditions
- **Mitigation**: Use database-level unique constraints and proper transaction handling

### Performance Risks  
- **Risk**: Slow queries on time-range operations
- **Mitigation**: GiST indexes and materialized views for common query patterns

### Security Risks
- **Risk**: Unauthorized special creation or claim manipulation
- **Mitigation**: Proper authorization checks and input validation

### Scalability Risks
- **Risk**: High claim volume overwhelming database
- **Mitigation**: Rate limiting, caching, and horizontal scaling strategies
