# Specials System Integration Guide

This guide shows you how to integrate the specials system into your JewGo app.

## 🎉 What's Been Completed

### ✅ Database Migration
- **8 sample specials** created across 5 restaurants
- **Complete database schema** with all tables, indexes, and constraints
- **Performance optimizations** with GiST indexes and materialized views

### ✅ Backend API
- **Flask blueprint registered** in `app.py`
- **RESTful endpoints** ready for use:
  - `GET /api/v5/specials` - List all specials
  - `GET /api/v5/specials?restaurant_id=X` - Filter by restaurant
  - `GET /api/v5/specials/<id>` - Get specific special
  - `POST /api/v5/specials` - Create new special
  - `PATCH /api/v5/specials/<id>` - Update special
  - `DELETE /api/v5/specials/<id>` - Delete special
  - `POST /api/v5/specials/<id>/claim` - Claim a special
  - `POST /api/v5/specials/<id>/redeem` - Redeem a special

### ✅ Frontend Components
- **Complete React component library** for specials
- **TypeScript interfaces** for type safety
- **Integration components** ready to use

## 🚀 Quick Start

### 1. Test the API (Already Working!)

The API is ready to use. You can test it with:

```bash
# Test the health endpoint
curl http://localhost:5000/test

# Get all specials
curl http://localhost:5000/api/v5/specials

# Get specials for a specific restaurant
curl "http://localhost:5000/api/v5/specials?restaurant_id=1843"
```

### 2. Use the Frontend Components

#### Basic Integration

```tsx
import { RestaurantSpecialsIntegration } from '@/components/specials'

function RestaurantDetailPage({ restaurantId }) {
  return (
    <div>
      {/* Your existing restaurant content */}
      
      {/* Add specials section */}
      <RestaurantSpecialsIntegration
        restaurantId={restaurantId}
        variant="full"
        maxItems={3}
      />
    </div>
  )
}
```

#### Compact Version

```tsx
import { RestaurantSpecialsCompact } from '@/components/specials'

function RestaurantCard({ restaurantId }) {
  return (
    <div className="restaurant-card">
      {/* Restaurant info */}
      
      {/* Compact specials display */}
      <RestaurantSpecialsCompact
        restaurantId={restaurantId}
        showTitle={false}
        maxItems={1}
      />
    </div>
  )
}
```

#### With ListingPage Component

```tsx
import { ListingPageWithSpecials } from '@/components/specials/ListingPageWithSpecials'

function RestaurantPage({ restaurantData }) {
  return (
    <ListingPageWithSpecials
      data={restaurantData}
      showSpecials={true}
      specialsVariant="full"
      specialsMaxItems={3}
    />
  )
}
```

## 📊 Sample Data Created

We've created **8 sample specials** across **5 restaurants**:

1. **Kosher gourmet by jacob** - Happy Hour Special (20% off drinks & apps)
2. **Ariel's delicious pizza** - Happy Hour Special (20% off drinks & apps)
3. **Yossef roasting** - Weekend Brunch Special ($10 off brunch)
4. **Toasted** - Weekend Brunch Special ($10 off brunch)
5. **Nothing bundt cakes** - Weekend Brunch Special ($10 off brunch)

### Special Types Created:
- **Happy Hour Specials** - 20% off drinks & apps (3-hour validity)
- **Weekend Brunch Specials** - $10 off brunch (2-day validity)
- **Free Dessert** - Complimentary dessert with main course

## 🛠 Available Components

### Core Components

```tsx
// Display multiple specials
import { SpecialsDisplay } from '@/components/specials'

// Display single special
import { SpecialCard } from '@/components/specials'

// Claim modal
import { ClaimModal } from '@/components/specials'
```

### Integration Components

```tsx
// Main integration component
import { RestaurantSpecialsIntegration } from '@/components/specials'

// Compact variants
import { RestaurantSpecialsCompact, RestaurantSpecialsCard } from '@/components/specials'

// With existing ListingPage
import { ListingPageWithSpecials } from '@/components/specials/ListingPageWithSpecials'
```

### Hooks

```tsx
import { useSpecials, useSpecialDetails } from '@/hooks/use-specials'

function MyComponent({ restaurantId }) {
  const { specials, loading, error, createSpecial, updateSpecial } = useSpecials(restaurantId)
  const { special, claimSpecial, redeemSpecial } = useSpecialDetails(specialId)
  
  // Use the data...
}
```

### API Client

```tsx
import { 
  getSpecials, 
  getSpecialById, 
  createSpecial, 
  claimSpecial 
} from '@/lib/api/specials'

// Fetch specials
const specials = await getSpecials({ restaurantId: 123 })

// Claim a special
const claim = await claimSpecial(specialId, { userId: 'user123' })
```

## 🎨 Component Variants

### SpecialsDisplay Variants
- `default` - Full display with all details
- `compact` - Condensed version for cards
- `upcoming` - Show only future specials
- `range` - Show specials within date range

### SpecialCard Variants
- `default` - Full card with all information
- `compact` - Smaller card for lists
- `featured` - Highlighted card for promotions

### Integration Variants
- `full` - Complete specials section
- `compact` - Minimal display
- `card` - Card-based layout

## 📱 Usage Examples

### Restaurant Detail Page

```tsx
import { RestaurantSpecialsIntegration } from '@/components/specials'

export default function RestaurantDetailPage({ params }) {
  const restaurantId = parseInt(params.id)
  
  return (
    <div className="restaurant-detail">
      {/* Restaurant header, images, info */}
      
      <section className="specials-section">
        <RestaurantSpecialsIntegration
          restaurantId={restaurantId}
          variant="full"
          maxItems={5}
          showTitle={true}
        />
      </section>
    </div>
  )
}
```

### Restaurant Grid Card

```tsx
import { RestaurantSpecialsCompact } from '@/components/specials'

export function RestaurantCard({ restaurant }) {
  return (
    <div className="restaurant-card">
      <img src={restaurant.image} alt={restaurant.name} />
      <h3>{restaurant.name}</h3>
      
      {/* Show one special if available */}
      <RestaurantSpecialsCompact
        restaurantId={restaurant.id}
        variant="compact"
        showTitle={false}
        maxItems={1}
      />
    </div>
  )
}
```

### Admin Panel

```tsx
import { useSpecials } from '@/hooks/use-specials'

export function AdminSpecialsPanel({ restaurantId }) {
  const { specials, loading, createSpecial, updateSpecial } = useSpecials(restaurantId)
  
  return (
    <div>
      <h2>Manage Specials</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {specials.map(special => (
            <div key={special.id}>
              {special.title} - {special.discount_label}
              <button onClick={() => updateSpecial(special.id, { is_active: false })}>
                Deactivate
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

## 🔧 Configuration

### Environment Variables

Make sure these are set in your `.env`:

```bash
# Database (already configured)
DATABASE_URL=postgresql://app_user:Jewgo123@129.80.190.110:5432/jewgo_db

# API Base URL
API_BASE_URL=http://localhost:5000
# or in production:
API_BASE_URL=https://api.jewgo.app
```

### API Endpoints

All endpoints are prefixed with `/api/v5/specials`:

- `GET /api/v5/specials` - List specials
- `GET /api/v5/specials/<id>` - Get special by ID
- `POST /api/v5/specials` - Create special
- `PATCH /api/v5/specials/<id>` - Update special
- `DELETE /api/v5/specials/<id>` - Delete special
- `POST /api/v5/specials/<id>/claim` - Claim special
- `POST /api/v5/specials/<id>/redeem` - Redeem special
- `POST /api/v5/specials/<id>/events` - Log event

## 🎯 Next Steps

1. **Test the components** - Try the integration components in your restaurant pages
2. **Customize styling** - Adjust the component styles to match your design
3. **Add more specials** - Create additional specials using the API
4. **Implement claiming** - Test the claim/redemption flow
5. **Add analytics** - Track special views and interactions

## 🐛 Troubleshooting

### API Not Working
- Check if Flask server is running: `curl http://localhost:5000/test`
- Verify database connection in logs
- Check blueprint registration in `app.py`

### Components Not Loading
- Verify TypeScript compilation: `npx tsc --noEmit`
- Check browser console for errors
- Ensure API endpoints are accessible

### No Specials Showing
- Check if restaurant has specials: `curl "http://localhost:5000/api/v5/specials?restaurant_id=1843"`
- Verify `restaurantId` prop is correct
- Check if specials are active and within valid date range

## 📞 Support

The specials system is now fully integrated and ready to use! All components are designed to be:
- **Type-safe** with TypeScript
- **Responsive** for mobile and desktop
- **Accessible** with proper ARIA attributes
- **Performant** with optimized queries
- **Extensible** for future enhancements

Happy coding! 🎉
