# UnifiedCard Component Test Page

This page demonstrates the UnifiedCard utility component with real API data from your database.

## 🎯 Purpose

The UnifiedCard component serves as a **design system utility** that standardizes how both restaurant and marketplace listings should look across your application, with data coming directly from your database schemas.

## 🚀 How to Access

### Development Mode
1. Start your development server: `npm run dev`
2. Look for the blue floating action button (🔧) in the bottom-right corner
3. Click it to open the development tools menu
4. Select "UnifiedCard Test" to navigate to this page

### Direct Access
Navigate directly to: `/test-unified-card`

## 📊 What You'll See

### Restaurant Card
- **Tag**: Kosher category (top left corner)
- **Title**: Restaurant name
- **Badge**: Rating (top right)
- **Additional Text**: Price range
- **Secondary Text**: City location

### Marketplace Card
- **Tag**: Category name (top left corner)
- **Title**: Product title
- **Badge**: Listing type (top right)
- **Additional Text**: Price in bold
- **Secondary Text**: Timestamp of data entry

## 🔗 API Integration

### Restaurant Data Source
- **Endpoint**: `/api/restaurants`
- **Database**: PostgreSQL `restaurants` table
- **Fields**: `name`, `image_url`, `rating`, `price_range`, `kosher_category`, `city`

### Marketplace Data Source
- **Endpoint**: `/api/v4/marketplace/listings`
- **Database**: PostgreSQL `marketplace` table
- **Fields**: `title`, `price_cents`, `category_name`, `created_at`, `images`

## 🎨 Design System Features

### Visual Consistency
- Unified spacing and typography
- Consistent hover effects and animations
- Standardized image handling with fallbacks
- Responsive design across all screen sizes

### Database Integration
- Direct field mapping to database schemas
- Validation utilities for data integrity
- Type-safe data handling with TypeScript
- Error handling and graceful degradation

### Performance Optimizations
- Optimized image loading with Next.js Image
- Skeleton loading states
- Error boundaries for broken images
- Proper event handling and accessibility

## 🧪 Testing Features

### Real Data Display
- Shows actual data from your database
- Displays raw JSON for debugging
- Real-time API connection status

### Interactive Elements
- Heart button functionality
- Click handlers for navigation
- Console logging for debugging

### Error Handling
- Loading states while fetching data
- Error messages for failed requests
- Retry functionality

## 🔧 Development Tools

The test page includes several development features:

1. **Raw Data Display**: Shows the exact JSON data from your APIs
2. **API Information**: Details about endpoints and data sources
3. **Component Features**: Overview of design system capabilities
4. **Error Handling**: Demonstrates graceful error states

## 📱 Responsive Design

The test page is fully responsive and demonstrates how the UnifiedCard component adapts to different screen sizes:

- **Desktop**: Side-by-side card comparison
- **Tablet**: Stacked layout with proper spacing
- **Mobile**: Single column layout with touch-friendly interactions

## 🎯 Use Cases

This component is perfect for:

1. **Restaurant Listings**: Display kosher restaurants with ratings and pricing
2. **Marketplace Items**: Show products with categories and pricing
3. **Search Results**: Consistent card design across search results
4. **Featured Content**: Highlight special offers or featured items
5. **Grid Layouts**: Create responsive card grids

## 🔄 Data Flow

```
Database → API → UnifiedCard → UI
   ↓         ↓        ↓        ↓
PostgreSQL → REST → Component → Display
```

The component handles the complete data flow from your database to the user interface, ensuring consistency and reliability.

## 🚀 Next Steps

1. **Customize Styling**: Modify the component's visual design to match your brand
2. **Add More Types**: Extend the component to handle additional data types
3. **Performance Testing**: Test with large datasets and optimize as needed
4. **Accessibility**: Ensure WCAG compliance for production use
5. **Documentation**: Create comprehensive usage guidelines for your team
