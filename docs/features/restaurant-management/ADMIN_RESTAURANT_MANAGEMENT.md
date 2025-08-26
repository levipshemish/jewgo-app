# Admin Restaurant Management

## Overview

The admin dashboard now includes comprehensive restaurant management capabilities that allow administrators to view, edit, create, and delete restaurant listings with full CRUD (Create, Read, Update, Delete) operations.

## Features

### 1. Restaurant Dashboard
- **Location**: `/admin/restaurants`
- **Access**: Super Admin only
- **Features**:
  - View all restaurant listings in a paginated table
  - Search restaurants by name, address, or city
  - Filter by status (active, inactive, pending)
  - Filter by kosher category (meat, dairy, pareve)
  - Real-time statistics showing total, active, inactive, and pending restaurants

### 2. Restaurant List View
- **Table Columns**:
  - Restaurant name and phone number
  - Location (city, state, address)
  - Kosher category with color-coded badges
  - Status with color-coded badges
  - Last updated timestamp
  - Action buttons (View, Edit, Delete)

### 3. Restaurant Details Modal
- **Access**: Click "View Details" button
- **Information Displayed**:
  - Basic Information (name, address, phone, website, description)
  - Kosher Information (category, agency, kosher certifications)
  - Hours & Status (operating hours, listing type)
  - Google Data (rating, review count, coordinates)

### 4. Restaurant Editor
- **Access**: Click "Edit" button or "Add Restaurant" button
- **Features**:
  - Full form for editing all restaurant fields
  - Validation for required fields
  - Support for creating new restaurants
  - Real-time saving with loading states

### 5. Restaurant Actions
- **View**: Display detailed restaurant information
- **Edit**: Modify restaurant details
- **Delete**: Remove restaurant with confirmation dialog
- **Add New**: Create new restaurant listings

## API Endpoints

### Frontend API Routes
- `GET /api/admin-proxy/restaurants` - Get restaurants with pagination and filtering
- `POST /api/admin-proxy/restaurants` - Create new restaurant
- `PUT /api/admin-proxy/restaurants` - Update existing restaurant
- `DELETE /api/admin-proxy/restaurants/[id]` - Delete restaurant by ID

### Backend API Routes
- `GET /api/admin/restaurants` - Get restaurants (admin only)
- `POST /api/admin/restaurants` - Create restaurant (admin only)
- `PUT /api/admin/restaurants` - Update restaurant (admin only)
- `DELETE /api/admin/restaurants/[id]` - Delete restaurant (admin only)

## Database Operations

### Restaurant Fields
The restaurant management system supports editing all major restaurant fields:

**Basic Information:**
- Name (required)
- Address (required)
- City (required)
- State (required)
- ZIP Code (required)
- Phone Number (required)
- Website (optional)
- Description (optional)

**Kosher Information:**
- Kosher Category (meat/dairy/pareve) (required)
- Certifying Agency (required)
- Listing Type (required)
- Status (active/inactive/pending)
- Price Range (optional)

**Additional Information:**
- Hours of Operation (optional)
- Image URL (optional)
- User Email (optional)

### Database Methods
- `get_restaurants()` - Retrieve restaurants with filtering and pagination
- `add_restaurant()` - Create new restaurant
- `update_restaurant_data()` - Update existing restaurant
- `delete_restaurant()` - Delete restaurant from database
- `get_restaurant_by_id()` - Get specific restaurant details

## Security

### Authentication
- All restaurant management features require super admin privileges
- Admin authentication is enforced at both frontend and backend levels
- API endpoints use admin token authentication

### Authorization
- Only users with `isSuperAdmin: true` can access restaurant management
- All operations are logged for audit purposes
- Confirmation dialogs for destructive operations

## User Interface

### Design Features
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Clean, professional interface with Tailwind CSS
- **Loading States**: Visual feedback during operations
- **Error Handling**: User-friendly error messages
- **Confirmation Dialogs**: Prevents accidental deletions

### Navigation
- Integrated into main admin navigation
- Breadcrumb navigation for easy navigation
- Quick access from admin dashboard

## Usage Examples

### Creating a New Restaurant
1. Navigate to `/admin/restaurants`
2. Click "Add Restaurant" button
3. Fill in required fields (name, address, city, state, zip, phone, category, agency, listing type)
4. Add optional information (website, description, hours, etc.)
5. Click "Save Restaurant"

### Editing an Existing Restaurant
1. Navigate to `/admin/restaurants`
2. Find the restaurant in the list
3. Click the "Edit" button (pencil icon)
4. Modify the desired fields
5. Click "Save Restaurant"

### Deleting a Restaurant
1. Navigate to `/admin/restaurants`
2. Find the restaurant in the list
3. Click the "Delete" button (trash icon)
4. Confirm the deletion in the dialog
5. Restaurant is permanently removed from the database

### Filtering and Searching
1. Use the search box to find restaurants by name, address, or city
2. Use the status filter to show only active, inactive, or pending restaurants
3. Use the category filter to show only meat, dairy, or pareve restaurants
4. Combine filters for more specific results

## Technical Implementation

### Frontend Technologies
- **React**: Component-based UI
- **TypeScript**: Type safety and better development experience
- **Next.js**: Server-side rendering and routing
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library

### Backend Technologies
- **Flask**: Python web framework
- **SQLAlchemy**: Database ORM
- **PostgreSQL**: Database
- **JWT**: Authentication tokens

### State Management
- **React Hooks**: Local component state
- **useState**: Form data and UI state
- **useEffect**: Data fetching and side effects

## Future Enhancements

### Planned Features
- **Bulk Operations**: Select multiple restaurants for batch operations
- **Import/Export**: CSV import/export functionality
- **Advanced Filtering**: More filter options (date ranges, ratings, etc.)
- **Audit Trail**: Track all changes made to restaurants
- **Image Management**: Upload and manage restaurant images
- **Review Management**: Direct access to restaurant reviews
- **Analytics**: Restaurant performance metrics

### Performance Optimizations
- **Virtual Scrolling**: For large restaurant lists
- **Caching**: Redis caching for frequently accessed data
- **Lazy Loading**: Load restaurant details on demand
- **Optimistic Updates**: Immediate UI updates with background sync

## Troubleshooting

### Common Issues
1. **Permission Denied**: Ensure user has super admin privileges
2. **Missing Fields**: Check that all required fields are filled
3. **Network Errors**: Verify backend API is running and accessible
4. **Database Errors**: Check database connection and permissions

### Debug Information
- All API calls are logged in the browser console
- Backend errors are logged with detailed stack traces
- Database operations are logged for audit purposes

## Support

For technical support or feature requests related to restaurant management, please contact the development team or create an issue in the project repository.
