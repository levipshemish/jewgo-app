# Add Eatery Workflow - Complete Implementation

This document outlines the complete implementation of the enhanced "Add Eatery" workflow for the JewGo app.

## 🎯 **Current Status**
**Implementation**: ✅ **Core Complete** - Ready for Testing & Deployment  
**Last Updated**: August 25, 2024

**For deployment instructions, see**: `docs/features/enhanced-add-eatery-deployment-guide.md`  
**For implementation status, see**: `docs/features/enhanced-add-eatery-implementation-status.md`

## 🏗️ Architecture Overview

The Add Eatery workflow consists of:

1. **Frontend Form** (`/app/add-eatery/page.tsx`)
2. **Enhanced Form Component** (`/components/forms/EnhancedAddEateryForm.tsx`)
3. **Image Upload Component** (`/components/forms/ImageUpload.tsx`)
4. **API Routes** (`/app/api/restaurants/`)
5. **Backend API** (`/backend/routes/api_v4.py`)
6. **Database Schema** (PostgreSQL)
7. **Admin Dashboard** (`/app/admin/restaurants/page.tsx`) - To be created

## 📋 Database Schema

### Required Database Changes

Run the migration script to add missing columns:

```sql
-- File: backend/database/migrations/enhance_add_eatery_workflow.py
-- Run this against your PostgreSQL database
```

### Key Tables

#### `restaurants` Table
```sql
-- Core fields (existing)
id, name, address, phone, website, kosher_category, certifying_agency

-- New fields for Add Eatery workflow
short_description TEXT,           -- Max 80 chars for mobile display
email TEXT,                       -- Contact email
google_listing_url TEXT,          -- Google Maps/GMB link
category TEXT DEFAULT 'restaurant',
status TEXT DEFAULT 'pending_approval',
is_cholov_yisroel BOOLEAN,        -- For dairy establishments
is_pas_yisroel BOOLEAN,           -- For meat/pareve establishments
hours_open TEXT,                  -- Business hours
price_range TEXT,                 -- $, $$, $$$, $$$$
image_url TEXT,                   -- Main restaurant image

-- Enhanced Add Eatery Workflow Fields
owner_name TEXT,                  -- Restaurant owner name
owner_email TEXT,                 -- Restaurant owner email
owner_phone TEXT,                 -- Restaurant owner phone
is_owner_submission BOOLEAN,      -- Whether submitted by owner
business_email TEXT,              -- Business contact email
instagram_link TEXT,              -- Instagram profile link
facebook_link TEXT,               -- Facebook page link
tiktok_link TEXT,                 -- TikTok profile link
business_images TEXT[],           -- Array of image URLs
submission_status TEXT,           -- pending_approval, approved, rejected
submission_date TIMESTAMP,        -- When submitted
approval_date TIMESTAMP,          -- When approved/rejected
approved_by TEXT,                 -- Who approved/rejected
rejection_reason TEXT,            -- Reason for rejection
business_license TEXT,            -- Business license number
tax_id TEXT,                      -- Tax ID
years_in_business INTEGER,        -- Years in business
seating_capacity INTEGER,         -- Seating capacity
delivery_available BOOLEAN,       -- Delivery available
takeout_available BOOLEAN,        -- Takeout available
catering_available BOOLEAN,       -- Catering available
preferred_contact_method TEXT,    -- email, phone, text, any
preferred_contact_time TEXT,      -- morning, afternoon, evening
contact_notes TEXT                -- Additional contact notes
```

#### `restaurant_owners` Table (Optional)
```sql
id SERIAL PRIMARY KEY,
restaurant_id INTEGER REFERENCES restaurants(id),
name TEXT NOT NULL,
email TEXT NOT NULL,
phone TEXT NOT NULL,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
```

## 🎨 Frontend Implementation

### Form Features

1. **User Type Selection**
   - Owner submission (with additional contact info)
   - Community submission

2. **Image Upload**
   - Drag & drop interface
   - File validation (5MB max, image types only)
   - Preview functionality
   - Upload progress indicator
   - Multiple image support (2-5 images)

3. **Conditional Fields**
   - Dairy category → Chalav Yisrael/Chalav Stam options
   - Meat/Pareve category → Pas Yisroel options

4. **Validation**
   - Real-time field validation
   - Character count for short description
   - URL validation for links
   - Required field highlighting

### Key Components

#### EnhancedAddEateryForm Component
```typescript
// File: components/forms/EnhancedAddEateryForm.tsx
interface EnhancedAddEateryFormProps {
  onClose?: () => void;
  className?: string;
}
```

Features:
- 5-step form implementation
- React Hook Form integration
- Framer Motion animations
- Conditional field rendering
- Real-time validation
- Mobile-responsive design
- Progress tracking

#### ImageUpload Component
```typescript
// File: components/forms/ImageUpload.tsx
interface ImageUploadProps {
  onImageUpload: (imageUrl: string) => void;
  currentImageUrl?: string;
  className?: string;
}
```

Features:
- File type validation
- Size validation (5MB max)
- Preview functionality
- Upload progress
- Error handling

## 🔌 API Implementation

### Frontend API Routes

#### POST - Submit Restaurant (`/api/restaurants`)
```typescript
// Endpoint: POST /api/restaurants
// Validates and stores restaurant submission

Request Body:
{
  name: string,
  short_description: string,      // Max 80 chars
  description?: string,
  certifying_agency: string,
  kosher_category: 'meat' | 'dairy' | 'pareve',
  is_cholov_yisroel?: boolean,   // Required for dairy
  is_pas_yisroel?: boolean,      // Required for meat/pareve
  phone: string,
  email?: string,
  address: string,
  website?: string,
  google_listing_url?: string,
  hours_open: string,
  price_range?: string,
  business_images: string[],      // Array of image URLs
  is_owner_submission: boolean,
  owner_name?: string,
  owner_email?: string,
  owner_phone?: string,
  business_license?: string,
  tax_id?: string,
  years_in_business?: number,
  seating_capacity?: number,
  delivery_available?: boolean,
  takeout_available?: boolean,
  catering_available?: boolean,
  preferred_contact_method?: string,
  preferred_contact_time?: string,
  contact_notes?: string,
  instagram_link?: string,
  facebook_link?: string,
  tiktok_link?: string
}
```

#### GET - Filter Options (`/api/restaurants/filter-options`)
```typescript
// Endpoint: GET /api/restaurants/filter-options
// Returns filter options for dropdowns

Response:
{
  success: true,
  data: {
    agencies: string[],
    kosherCategories: string[],
    listingTypes: string[],
    priceRanges: string[],
    cities: string[],
    states: string[]
  }
}
```

#### PUT - Approve Restaurant (`/api/restaurants/[id]/approve`)
```typescript
// Endpoint: PUT /api/restaurants/[id]/approve
// Approves a pending restaurant submission

Request Body:
{
  status: 'approved'
}
```

#### PUT - Reject Restaurant (`/api/restaurants/[id]/reject`)
```typescript
// Endpoint: PUT /api/restaurants/[id]/reject
// Rejects a pending restaurant submission

Request Body:
{
  status: 'rejected',
  reason: string
}
```

### Backend API Routes

#### PUT `/api/restaurants/{id}/approve`
```typescript
// Approve restaurant submission (Admin only)
// Requires Authorization: Bearer YOUR_ADMIN_TOKEN

Request Body:
{
  "status": "approved"
}

Response:
{
  "success": true,
  "message": "Restaurant approved successfully",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Restaurant Name",
      "submission_status": "approved",
      "approval_date": "2024-01-01T00:00:00Z",
      "approved_by": "admin"
    },
    "status": "approved"
  }
}
```

#### PUT `/api/restaurants/{id}/reject`
```typescript
// Reject restaurant submission (Admin only)
// Requires Authorization: Bearer YOUR_ADMIN_TOKEN

Request Body:
{
  "status": "rejected",
  "reason": "Incomplete information provided"
}

Response:
{
  "success": true,
  "message": "Restaurant rejected successfully",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Restaurant Name",
      "submission_status": "rejected",
      "rejection_reason": "Incomplete information provided",
      "approval_date": "2024-01-01T00:00:00Z",
      "approved_by": "admin"
    },
    "status": "rejected",
    "reason": "Incomplete information provided"
  }
}
```

#### GET `/api/restaurants/filter-options`
```typescript
// Get filter options for restaurant forms and search

Response:
{
  "success": true,
  "data": {
    "agencies": ["ORB", "OU", "Star-K", "CRC", "Kof-K", "OK Kosher"],
    "kosherCategories": ["meat", "dairy", "pareve"],
    "listingTypes": ["restaurant", "bakery", "catering", "cafe", "deli"],
    "priceRanges": ["$", "$$", "$$$", "$$$$"],
    "cities": ["Miami", "Miami Beach", "Boca Raton"],
    "states": ["FL", "NY", "CA"]
  }
}
```

## 🛠️ Admin Dashboard

### Features

1. **Pending Submissions List**
   - Shows all restaurants with `status = 'pending_approval'`
   - Displays key information at a glance
   - Differentiates between owner and community submissions

2. **Submission Details Modal**
   - Full restaurant information
   - Owner contact details (if applicable)
   - Approve/Reject actions

3. **Statistics**
   - Total pending submissions
   - Owner vs community submission counts

### Access
- URL: `/admin/restaurants`
- Requires admin authentication (to be implemented)

## 🔄 Workflow Steps

### 1. User Submission
1. User navigates to `/add-eatery`
2. Selects user type (owner/community)
3. Fills out form with validation
4. Uploads restaurant images (2-5 images)
5. Submits form
6. Receives confirmation message
7. Redirected to home page

### 2. Admin Review
1. Admin accesses `/admin/restaurants`
2. Views pending submissions
3. Clicks "View Details" for specific restaurant
4. Reviews all information
5. Approves or rejects with reason
6. Restaurant status updated in database

### 3. Post-Approval
1. Approved restaurants become visible in main app
2. Rejected restaurants remain hidden
3. Email notifications sent (to be implemented)

## 🎯 Validation Rules

### Required Fields
- Restaurant name
- Short description (max 80 chars)
- Certifying agency
- Kosher category
- Phone number
- Address
- Hours open
- Restaurant images (2-5 images)

### Conditional Validation
- **Dairy category**: Must specify Chalav Yisrael or Chalav Stam
- **Meat/Pareve category**: Must specify Pas Yisroel status
- **Owner submission**: Must provide owner contact information

### URL Validation
- Website URL (optional)
- Google Maps URL (optional)
- Social media URLs (optional)

## 🚀 Deployment Checklist

### Database Setup
- [ ] Run migration script: `backend/database/migrations/enhance_add_eatery_workflow.py`
- [ ] Verify new columns exist
- [ ] Test database connections

### Frontend Deployment
- [ ] Deploy updated `/app/add-eatery/page.tsx`
- [ ] Deploy new `/components/forms/EnhancedAddEateryForm.tsx`
- [ ] Deploy enhanced `/components/forms/ImageUpload.tsx`
- [ ] Deploy admin dashboard `/app/admin/restaurants/page.tsx`

### API Deployment
- [ ] Deploy `/app/api/restaurants/route.ts`
- [ ] Deploy `/app/api/restaurants/filter-options/route.ts`
- [ ] Deploy `/app/api/restaurants/[id]/approve/route.ts`
- [ ] Deploy `/app/api/restaurants/[id]/reject/route.ts`
- [ ] Deploy backend API endpoints in `/backend/routes/api_v4.py`

### Image Upload Setup
- [ ] Configure image upload service (S3, Supabase, Cloudinary)
- [ ] Update `ImageUpload.tsx` with actual upload logic
- [ ] Test image upload functionality

### Testing
- [ ] Test form validation
- [ ] Test image upload
- [ ] Test API endpoints
- [ ] Test admin approval workflow
- [ ] Test conditional field logic

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://...

# Image Upload (choose one)
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Or Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key

# Or Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Admin Authentication
ADMIN_TOKEN=your-secure-admin-token
```

### Image Upload Configuration
Update the `ImageUpload.tsx` component to use your preferred service:

```typescript
// Example: S3 Upload
const uploadToS3 = async (file: File): Promise<string> => {
  // Implementation for S3 upload
  // Return the public URL
};

// Example: Supabase Upload
const uploadToSupabase = async (file: File): Promise<string> => {
  // Implementation for Supabase upload
  // Return the public URL
};
```

## 📱 Mobile Optimization

The form is optimized for mobile devices with:
- Responsive design
- Touch-friendly inputs
- Optimized image upload
- Character count for short descriptions
- Clear validation messages

## 🔒 Security Considerations

1. **Input Validation**: All inputs validated on both client and server
2. **File Upload Security**: File type and size validation
3. **Admin Access**: Admin routes should be protected
4. **Rate Limiting**: Consider implementing rate limiting for submissions
5. **CSRF Protection**: Ensure CSRF tokens are used (Next.js handles this)

## 🚨 Error Handling

### Frontend Errors
- Form validation errors displayed inline
- Network errors with retry options
- Image upload errors with clear messages

### Backend Errors
- Validation errors returned with field-specific messages
- Database errors logged and handled gracefully
- 500 errors with user-friendly messages

## 📈 Future Enhancements

1. **Email Notifications**
   - Confirmation emails to submitters
   - Approval/rejection notifications
   - Admin notifications for new submissions

2. **Advanced Image Handling**
   - Multiple image uploads
   - Image cropping/editing
   - Automatic image optimization

3. **Enhanced Validation**
   - Address geocoding
   - Phone number formatting
   - Business hours validation

4. **Analytics**
   - Submission tracking
   - Approval rate metrics
   - User engagement data

## 📞 Support

For questions or issues with the Add Eatery workflow:
1. Check the validation rules above
2. Verify database schema matches requirements
3. Test API endpoints individually
4. Review browser console for JavaScript errors
5. Check server logs for backend errors 