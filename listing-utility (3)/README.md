# Listing Page Utility

A comprehensive, mobile-first listing page utility built with Next.js, TypeScript, and Tailwind CSS. Features a floating design with transparent containers, responsive layout, and backend API integration. **Now enhanced with eatery-specific functionality including kosher information, location services, and comprehensive restaurant details.**

## Features

- 🎨 **Floating Design**: Transparent containers with clean, modern aesthetics
- 📱 **Mobile-First**: Fully responsive design optimized for all screen sizes
- 🔗 **API Integration**: Complete backend integration with optional field handling
- ⚡ **Interactive Elements**: Hover effects, animations, and popup modals
- 🏷️ **Flexible Content**: Support for images, text, actions, tags, and custom data
- 🍽️ **Eatery-Specific**: Kosher information, location services, hours popup, and restaurant details
- 📍 **Location Services**: Distance calculation and directions integration
- 🕒 **Hours Management**: Interactive hours popup with formatted schedules
- 📞 **Contact Actions**: Website, phone, and email integration

## Enhanced Components

### ListingHeader
Enhanced floating header with kosher information and statistics.

**New Props:**
- `kosherType?: string` - Kosher certification type
- `kosherAgency?: string` - Kosher certifying agency
- `viewCount?: number` - View count display
- `shareCount?: number` - Share count display

### ListingContent
Enhanced content section with bold text and icon support.

**New Props:**
- `leftBold?: boolean` - Make left text bold
- `rightBold?: boolean` - Make right text bold
- `leftIcon?: React.ReactNode` - Icon for left side
- `rightIcon?: React.ReactNode` - Icon for right side

### ListingPage
Enhanced main container with additional text sections.

**New Props:**
- `address?: string` - Address display section
- `description?: string` - Description display section

## Eatery-Specific Features

### Database Mapping
Complete mapping from eatery database to listing utility format:

```typescript
// Database fields mapped to listing utility
{
  name → header.title + content.leftText (bolded)
  rating → content.rightText (with star icon)
  price_range → content.leftAction (bolded)
  kosher_type → header.kosherType + actions.tags
  kosher_agency → header.kosherAgency + actions.tags
  images → image.src (with carousel support)
  hours → actions.bottomAction.hoursInfo
  contact → actions.secondaryActions
  location → distance calculation (when user location available)
  admin_settings.show_order_button → actions.primaryAction (conditional)
}
```

### Location Services
- **Distance Calculation**: Haversine formula for accurate distance
- **Directions Integration**: Opens Google Maps with directions
- **Permission Handling**: Graceful location permission management
- **Local Storage**: Caches location for better UX

### Hours Management
- **Formatted Display**: Clean hours presentation
- **Interactive Popup**: Modal with full weekly schedule
- **Closed Day Handling**: Proper display of closed days

### Contact Integration
- **Website Links**: Direct website navigation
- **Phone Integration**: Native phone app integration
- **Email Integration**: Native email app integration
- **Share Functionality**: Native share API with fallback

## API Integration

### Enhanced Data Structure

```typescript
interface EateryDB {
  id: string
  name: string
  description: string
  short_description?: string
  address: string
  rating?: number
  price_range?: string
  kosher_type?: string
  kosher_agency?: string
  images: string[]
  hours: {
    [day: string]: {
      open: string
      close: string
      closed?: boolean
    }
  }
  contact: {
    phone?: string
    email?: string
    website?: string
  }
  location: {
    latitude: number
    longitude: number
  }
  admin_settings: {
    show_order_button?: boolean
    order_url?: string
  }
  stats: {
    view_count: number
    share_count: number
  }
}
```

### API Endpoints

**GET /api/eateries/[id]**
Fetches eatery data with all enhanced fields.

**Response Format:**
```json
{
  "success": true,
  "data": {
    "id": "eatery-123",
    "name": "Kosher Delight Restaurant",
    "rating": 4.5,
    "price_range": "$$",
    "kosher_type": "Glatt Kosher",
    "kosher_agency": "OU",
    "images": ["/image1.jpg", "/image2.jpg"],
    "hours": {
      "monday": { "open": "9:00 AM", "close": "10:00 PM" },
      "saturday": { "closed": true }
    },
    "contact": {
      "phone": "+1-555-123-4567",
      "email": "info@restaurant.com",
      "website": "https://restaurant.com"
    },
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "admin_settings": {
      "show_order_button": true,
      "order_url": "https://restaurant.com/order"
    },
    "stats": {
      "view_count": 1250,
      "share_count": 89
    }
  }
}
```

## Custom Hooks

### useEateryDetails
Fetches eatery data from API with error handling and retry functionality.

```typescript
const { data, loading, error, refetch } = useEateryDetails(eateryId)
```

### useUserLocation
Manages user location with permission handling and caching.

```typescript
const { location, loading, error, requestPermission } = useUserLocation()
```

## Utility Functions

### Distance Calculation
```typescript
import { calculateDistance } from '@/utils/eatery-helpers'

const distance = calculateDistance(eateryLocation, userLocation)
// Returns: "2.5km" or "500m"
```

### Hours Formatting
```typescript
import { formatHoursForPopup } from '@/utils/eatery-helpers'

const formattedHours = formatHoursForPopup(eatery.hours)
// Returns array of { day: string, time: string }
```

### Mapping Function
```typescript
import { mapEateryToListingData } from '@/utils/eatery-mapping'

const listingData = mapEateryToListingData(eatery, userLocation)
```

## Usage Examples

### Basic Eatery Details Page
```tsx
import { ListingPage } from '@/components/listing/listing-page'
import { useEateryDetails } from '@/hooks/use-eatery-details'
import { useUserLocation } from '@/hooks/use-user-location'
import { mapEateryToListingData } from '@/utils/eatery-mapping'

export default function EateryDetailsPage({ params }: { params: { id: string } }) {
  const { data: eatery, loading, error } = useEateryDetails(params.id)
  const { location: userLocation } = useUserLocation()

  const listingData = useMemo(() => {
    if (!eatery) return undefined
    return mapEateryToListingData(eatery, userLocation)
  }, [eatery, userLocation])

  return (
    <div className="min-h-screen bg-gray-50">
      <ListingPage 
        data={listingData} 
        loading={loading} 
        error={error}
      />
    </div>
  )
}
```

### Testing Integration
Visit `/test` to see a comprehensive test page with:
- Multiple eatery selection
- Location permission testing
- API status monitoring
- Data preview
- Real-time listing updates

## Field Mapping

| Backend Field | Frontend Usage | Description |
|---------------|----------------|-------------|
| `name` | Header title + Content left (bolded) | Restaurant name |
| `rating` | Content right (with star) | Restaurant rating |
| `price_range` | Content left action (bolded) | Price range display |
| `kosher_type` | Header + Tags | Kosher certification type |
| `kosher_agency` | Header + Tags | Kosher certifying agency |
| `images[0]` | Main image | Primary restaurant image |
| `images[]` | Image carousel | Gallery of restaurant images |
| `hours` | Hours popup | Weekly operating hours |
| `contact.website` | Secondary action | Website link |
| `contact.phone` | Secondary action | Phone call action |
| `contact.email` | Secondary action | Email action |
| `location` | Distance calculation | Distance from user |
| `admin_settings.show_order_button` | Primary action (conditional) | Order button visibility |
| `stats.view_count` | Header display | View count |
| `stats.share_count` | Header display | Share count |
| `address` | Text section | Restaurant address |
| `short_description` | Text section | Brief description |

## Styling

- **Colors**: Limited 3-5 color palette with green primary, gray neutrals
- **Typography**: Maximum 2 font families (sans-serif primary)
- **Layout**: Mobile-first flexbox with responsive breakpoints
- **Animations**: Smooth hover effects and scale transforms
- **Spacing**: Consistent gap utilities and padding system
- **Kosher Badges**: Green styling for kosher information
- **Location Icons**: Map pin icons for distance display

## Browser Support

- Modern browsers with CSS Grid and Flexbox support
- Mobile Safari, Chrome, Firefox, Edge
- Responsive design from 320px to desktop
- Geolocation API support for location services
- Web Share API support with clipboard fallback

## Testing

### Demo Pages
- `/` - Main demo with toggle between original and eatery modes
- `/eatery/[id]` - Full eatery details page
- `/test` - Comprehensive integration testing

### Test Data
Two mock eateries are included for testing:
- `eatery-123`: Kosher Delight (with order button)
- `eatery-456`: Shalom Pizza (without order button)

## Integration Notes

### Location Services
- Requires HTTPS in production
- Graceful fallback when location unavailable
- Caches location in localStorage
- Permission request handling

### API Integration
- Error handling with retry functionality
- Loading states for better UX
- Type-safe data transformation
- Mock data for development

### Performance
- Memoized data transformation
- Optimized re-renders
- Efficient distance calculations
- Cached location data
