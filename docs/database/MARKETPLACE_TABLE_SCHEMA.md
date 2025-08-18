# 🛍️ Marketplace Table Schema Documentation

## Overview

The `marketplace` table is designed to store comprehensive product listings for the JewGo marketplace, following the same design patterns as the `restaurants` table. This table supports full e-commerce functionality with kosher certification, vendor management, and product categorization.

## 📊 Table Structure

### 🔒 System-Generated / Controlled Fields
These fields are managed by the system and should not be manually modified:

| Field | Type | Notes |
|-------|------|-------|
| `id` | SERIAL PRIMARY KEY | Auto-increment unique identifier |
| `created_at` | TIMESTAMP | System-generated creation timestamp |
| `updated_at` | TIMESTAMP | System-managed update timestamp |

### 🧾 Required Fields
These fields are required for all marketplace listings:

| Field | Type | Description |
|-------|------|-------------|
| `name` | VARCHAR(255) | Product name (required) |
| `title` | VARCHAR(500) | Product title/display name (required) |
| `price` | NUMERIC(10, 2) | Product price in USD (required) |
| `category` | VARCHAR(100) | Main product category (required) |
| `location` | VARCHAR(500) | Product location/address (required) |
| `vendor_name` | VARCHAR(255) | Vendor/store name (required) |
| `city` | VARCHAR(100) | City name (required) |
| `state` | VARCHAR(50) | State abbreviation (required) |
| `zip_code` | VARCHAR(20) | ZIP code (required) |

### 📍 Location Details
Geographic information for product location:

| Field | Type | Description |
|-------|------|-------------|
| `latitude` | FLOAT | Latitude coordinate |
| `longitude` | FLOAT | Longitude coordinate |

### 🖼️ Product Images
Image management for product listings:

| Field | Type | Description |
|-------|------|-------------|
| `product_image` | VARCHAR(2000) | Main product image URL |
| `additional_images` | VARCHAR(2000)[] | Array of additional product images |
| `thumbnail` | VARCHAR(2000) | Thumbnail image URL |

### 📋 Product Details
Core product information:

| Field | Type | Description |
|-------|------|-------------|
| `subcategory` | VARCHAR(100) | Product subcategory |
| `description` | TEXT | Product description |
| `original_price` | NUMERIC(10, 2) | Original price for sales |
| `currency` | VARCHAR(10) | Currency code (default: USD) |
| `stock` | INTEGER | Stock quantity (default: 0) |
| `is_available` | BOOLEAN | Available for purchase (default: TRUE) |
| `is_featured` | BOOLEAN | Featured product (default: FALSE) |
| `is_on_sale` | BOOLEAN | On sale status (default: FALSE) |
| `discount_percentage` | INTEGER | Discount percentage (0-100) |

### 🏪 Vendor Information
Complete vendor/store details:

| Field | Type | Description |
|-------|------|-------------|
| `vendor_id` | VARCHAR(100) | Vendor identifier |
| `vendor_logo` | VARCHAR(2000) | Vendor logo URL |
| `vendor_address` | VARCHAR(500) | Vendor address |
| `vendor_phone` | VARCHAR(50) | Vendor phone number |
| `vendor_email` | VARCHAR(255) | Vendor email address |
| `vendor_website` | VARCHAR(500) | Vendor website URL |
| `vendor_rating` | FLOAT | Vendor rating |
| `vendor_review_count` | INTEGER | Vendor review count (default: 0) |
| `vendor_is_verified` | BOOLEAN | Verified vendor status (default: FALSE) |
| `vendor_is_premium` | BOOLEAN | Premium vendor status (default: FALSE) |

### 🧼 Kosher Certification
Kosher certification details:

| Field | Type | Description |
|-------|------|-------------|
| `kosher_agency` | VARCHAR(100) | Kosher certification agency |
| `kosher_level` | VARCHAR(50) | Kosher level (glatt, regular, chalav_yisrael, pas_yisrael) |
| `kosher_certificate_number` | VARCHAR(100) | Kosher certificate number |
| `kosher_expiry_date` | DATE | Kosher certificate expiry date |
| `kosher_is_verified` | BOOLEAN | Kosher verification status (default: FALSE) |

### 🥗 Dietary Information
Dietary restrictions and allergen information:

| Field | Type | Description |
|-------|------|-------------|
| `is_gluten_free` | BOOLEAN | Gluten-free status (default: FALSE) |
| `is_dairy_free` | BOOLEAN | Dairy-free status (default: FALSE) |
| `is_nut_free` | BOOLEAN | Nut-free status (default: FALSE) |
| `is_vegan` | BOOLEAN | Vegan status (default: FALSE) |
| `is_vegetarian` | BOOLEAN | Vegetarian status (default: FALSE) |
| `allergens` | VARCHAR(100)[] | Array of allergens |

### 🏷️ Product Metadata
Additional product information:

| Field | Type | Description |
|-------|------|-------------|
| `tags` | VARCHAR(100)[] | Product tags array |
| `specifications` | JSONB | Product specifications |
| `shipping_info` | JSONB | Shipping information |

### ⭐ Ratings & Reviews
Product rating and review data:

| Field | Type | Description |
|-------|------|-------------|
| `rating` | FLOAT | Product rating (0-5, default: 0.0) |
| `review_count` | INTEGER | Number of reviews (default: 0) |

### 📊 Business Logic
Business and administrative fields:

| Field | Type | Description |
|-------|------|-------------|
| `status` | VARCHAR(20) | Product status (active, inactive, pending, sold_out) |
| `priority` | INTEGER | Priority for sorting (default: 0) |
| `expiry_date` | DATE | Product expiry date |
| `created_by` | VARCHAR(100) | User who created the listing |
| `approved_by` | VARCHAR(100) | User who approved the listing |
| `approved_at` | TIMESTAMP | Approval timestamp |

### 📝 Additional Information
Miscellaneous fields:

| Field | Type | Description |
|-------|------|-------------|
| `notes` | TEXT | Internal notes |
| `external_id` | VARCHAR(100) | External system identifier |
| `source` | VARCHAR(50) | Data source (manual, import, api) |

## 🔍 Indexes

The table includes comprehensive indexes for optimal query performance:

### Primary Indexes
- `idx_marketplace_name` - Product name searches
- `idx_marketplace_category` - Category filtering
- `idx_marketplace_subcategory` - Subcategory filtering
- `idx_marketplace_vendor_name` - Vendor name searches
- `idx_marketplace_price` - Price-based queries
- `idx_marketplace_status` - Status filtering

### Business Logic Indexes
- `idx_marketplace_is_featured` - Featured product queries
- `idx_marketplace_is_on_sale` - Sale product queries
- `idx_marketplace_rating` - Rating-based sorting
- `idx_marketplace_created_at` - Date-based queries

### Location Indexes
- `idx_marketplace_location` - City/state location queries

### Kosher Certification Indexes
- `idx_marketplace_kosher_agency` - Kosher agency filtering
- `idx_marketplace_kosher_level` - Kosher level filtering

### Vendor Indexes
- `idx_marketplace_vendor_id` - Vendor ID lookups
- `idx_marketplace_external_id` - External system integration

## ✅ Check Constraints

The table includes data validation constraints:

```sql
-- Price validation
CHECK (price >= 0)

-- Stock validation
CHECK (stock >= 0)

-- Rating validation
CHECK (rating >= 0 AND rating <= 5)

-- Discount validation
CHECK (discount_percentage >= 0 AND discount_percentage <= 100)

-- Status validation
CHECK (status IN ('active', 'inactive', 'pending', 'sold_out'))

-- Kosher level validation
CHECK (kosher_level IN ('glatt', 'regular', 'chalav_yisrael', 'pas_yisrael'))
```

## 📋 Sample Data Structure

### Example Product Entry
```sql
INSERT INTO marketplace (
    name, title, price, category, location, vendor_name,
    city, state, zip_code, description, product_image,
    kosher_agency, kosher_level, is_gluten_free, is_dairy_free,
    stock, is_available, is_featured, status
) VALUES (
    'Glatt Kosher Beef Brisket',
    'Premium Quality Beef Brisket - Perfect for Shabbat',
    45.99,
    'Meat & Poultry',
    '123 Main Street, Miami, FL 33101',
    'Kosher Delights Market',
    'Miami',
    'FL',
    '33101',
    'Premium quality beef brisket, perfect for Shabbat meals. Hand-selected and expertly prepared.',
    'https://example.com/images/brisket.jpg',
    'OU',
    'glatt',
    FALSE,
    FALSE,
    15,
    TRUE,
    TRUE,
    'active'
);
```

## 🔄 Migration Scripts

### Creating the Table
Run the migration script to create the marketplace table:

```bash
cd backend/database/migrations
python create_marketplace_table_script.py
```

### Alembic Migration
For Alembic-based migrations, use:

```bash
alembic upgrade head
```

## 🎯 Usage Patterns

### Common Queries

#### Get All Active Products
```sql
SELECT * FROM marketplace 
WHERE status = 'active' 
ORDER BY created_at DESC;
```

#### Get Featured Products
```sql
SELECT * FROM marketplace 
WHERE is_featured = TRUE AND status = 'active' 
ORDER BY priority DESC, rating DESC;
```

#### Get Products by Category
```sql
SELECT * FROM marketplace 
WHERE category = 'Meat & Poultry' AND status = 'active' 
ORDER BY price ASC;
```

#### Get Products by Kosher Level
```sql
SELECT * FROM marketplace 
WHERE kosher_level = 'glatt' AND status = 'active' 
ORDER BY rating DESC;
```

#### Get Products on Sale
```sql
SELECT * FROM marketplace 
WHERE is_on_sale = TRUE AND status = 'active' 
ORDER BY discount_percentage DESC;
```

#### Search Products
```sql
SELECT * FROM marketplace 
WHERE (name ILIKE '%brisket%' OR description ILIKE '%brisket%') 
AND status = 'active' 
ORDER BY rating DESC;
```

## 🔧 Integration with Frontend

### TypeScript Interface Mapping
The database schema maps directly to the frontend TypeScript interfaces:

```typescript
interface MarketplaceProduct {
  id: string;
  name: string;
  title: string;
  price: number;
  category: string;
  location: string;
  vendor_name: string;
  product_image?: string;
  description?: string;
  kosher_agency?: string;
  kosher_level?: string;
  // ... additional fields
}
```

### API Endpoints
The marketplace table supports the following API operations:

- `GET /api/v4/marketplace/products` - List all products
- `GET /api/v4/marketplace/products/{id}` - Get specific product
- `POST /api/v4/marketplace/products` - Create new product
- `PUT /api/v4/marketplace/products/{id}` - Update product
- `DELETE /api/v4/marketplace/products/{id}` - Delete product

## 🚀 Performance Considerations

### Query Optimization
- Use indexes for filtering and sorting operations
- Implement pagination for large result sets
- Use JSONB fields for flexible metadata storage
- Consider materialized views for complex aggregations

### Data Management
- Regular cleanup of expired products
- Archive inactive products instead of deletion
- Implement soft deletes for data integrity
- Use transactions for multi-table operations

## 🔒 Security Considerations

### Data Validation
- Validate all input data before insertion
- Sanitize user-generated content
- Implement proper access controls
- Use parameterized queries to prevent SQL injection

### Privacy Protection
- Encrypt sensitive vendor information
- Implement audit logging for data changes
- Regular security reviews and updates
- Compliance with data protection regulations

## 📈 Future Enhancements

### Planned Features
- **Real-time Inventory**: Live stock updates
- **Vendor Dashboard**: Vendor management interface
- **Order Integration**: Shopping cart and checkout
- **Review System**: User-generated reviews
- **Analytics**: Sales and performance metrics

### Scalability Considerations
- **Partitioning**: Partition by category or date
- **Caching**: Redis caching for frequently accessed data
- **CDN Integration**: Image delivery optimization
- **Search Optimization**: Full-text search capabilities

## 📚 Related Documentation

- [Marketplace Implementation Guide](../features/MARKETPLACE_IMPLEMENTATION.md)
- [Database Schema Overview](./schema.md)
- [API Documentation](../api/API_V4_MIGRATION_GUIDE.md)
- [Frontend Components](../development/COMPONENT_ARCHITECTURE.md)
