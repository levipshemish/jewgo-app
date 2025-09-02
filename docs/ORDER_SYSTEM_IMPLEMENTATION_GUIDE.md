# Order System Implementation Guide

## 🚀 Overview

The JewGo platform now features a complete order management system that enables customers to place orders at restaurants and track their status in real-time. This system provides a seamless experience from order creation to fulfillment.

## 📋 System Architecture

### Frontend Components
- **OrderForm**: Complete order form with menu selection, customer details, and payment options
- **OrderTracking**: Real-time order status tracking with visual progress indicators
- **OrderAPI Client**: Full CRUD operations for order management

### Backend Integration
- **OrderServiceV4**: Complete business logic for order processing
- **Database Models**: `Order` and `OrderItem` tables with comprehensive schema
- **API Routes**: RESTful endpoints at `/api/v4/orders/`
- **Feature Flags**: Controlled rollout via `api_v4_orders` flag

### Analytics Integration
- **Event Tracking**: Complete order lifecycle tracking (started, success, failed)
- **Performance Monitoring**: Order processing time and success rates
- **Business Intelligence**: Order patterns and customer behavior analysis

## 🛠 Implementation Details

### Order Creation Flow

1. **Menu Selection**: Customers browse menu and add items to cart
2. **Customer Information**: Collection of contact and delivery details
3. **Order Options**: Choice between pickup and delivery
4. **Payment Method**: Selection of payment type (cash, card, online)
5. **Order Submission**: Backend processing and confirmation
6. **Real-time Tracking**: Status updates and progress monitoring

### Order Status Lifecycle

```
pending → confirmed → preparing → ready → delivered
                               ↓
                           cancelled
```

### Key Features

#### ✅ Order Creation
- Interactive menu with item selection
- Real-time price calculation (subtotal, tax, delivery fees)
- Customer information validation
- Delivery address collection for delivery orders
- Special instructions support

#### ✅ Order Confirmation
- Beautiful confirmation modal with order details
- Order number generation and display
- Customer notification with order summary
- Integration with analytics tracking

#### ✅ Order Tracking
- Order lookup by order number
- Visual progress indicators
- Status descriptions and estimated times
- Order history and details display

#### ✅ Analytics Integration
- Order submission tracking
- Success/failure rate monitoring
- Customer behavior analysis
- Performance metrics collection

## 📊 Database Schema

### Orders Table
```sql
orders (
  id INTEGER PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE,
  restaurant_id INTEGER REFERENCES restaurants(id),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  delivery_address TEXT,
  delivery_instructions TEXT,
  order_type VARCHAR(20), -- 'pickup' or 'delivery'
  payment_method VARCHAR(20), -- 'cash', 'card', 'online'
  estimated_time VARCHAR(100),
  subtotal FLOAT,
  tax FLOAT,
  delivery_fee FLOAT,
  total FLOAT,
  status VARCHAR(20), -- 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'
  created_at DATETIME,
  updated_at DATETIME
)
```

### Order Items Table
```sql
order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  item_id VARCHAR(100), -- Menu item ID
  name VARCHAR(255), -- Menu item name
  price FLOAT, -- Unit price
  quantity INTEGER,
  special_instructions TEXT,
  subtotal FLOAT, -- price * quantity
  created_at DATETIME
)
```

## 🔌 API Endpoints

### Order Management
- `POST /api/v4/orders` - Create new order
- `GET /api/v4/orders/{id}` - Get order by ID
- `GET /api/v4/orders/number/{order_number}` - Get order by order number
- `GET /api/v4/orders/restaurant/{restaurant_id}` - Get orders for restaurant
- `GET /api/v4/orders/customer/{email}` - Get orders for customer
- `PATCH /api/v4/orders/{id}/status` - Update order status
- `POST /api/v4/orders/{id}/cancel` - Cancel order
- `GET /api/v4/orders/track/{order_number}` - Track order status

### Request/Response Examples

#### Create Order
```json
POST /api/v4/orders
{
  "restaurant_id": 1,
  "customer_name": "John Doe",
  "customer_phone": "+1-555-123-4567",
  "customer_email": "john@example.com",
  "delivery_address": "123 Main St, New York, NY 10001",
  "delivery_instructions": "Ring doorbell",
  "order_type": "delivery",
  "payment_method": "card",
  "estimated_time": "30-45 minutes",
  "items": [
    {
      "id": "1",
      "name": "Kosher Burger",
      "price": 15.99,
      "quantity": 2,
      "special_instructions": "No pickles"
    }
  ]
}
```

#### Order Response
```json
{
  "order": {
    "id": 123,
    "order_number": "ORD-20240902-001",
    "restaurant_id": 1,
    "customer_name": "John Doe",
    "total": 36.78,
    "status": "pending",
    "created_at": "2024-09-02T10:30:00Z",
    "items": [...]
  },
  "message": "Order ORD-20240902-001 created successfully"
}
```

## 🎯 Frontend Integration

### Using the OrderForm Component

```tsx
import { OrderForm } from '@/components/restaurant/OrderForm';

function RestaurantPage({ restaurant }) {
  const [showOrderForm, setShowOrderForm] = useState(false);

  return (
    <div>
      <button onClick={() => setShowOrderForm(true)}>
        Place Order
      </button>
      
      {showOrderForm && (
        <OrderForm
          restaurant={restaurant}
          onClose={() => setShowOrderForm(false)}
        />
      )}
    </div>
  );
}
```

### Using the OrderTracking Component

```tsx
import OrderTracking from '@/components/restaurant/OrderTracking';

function TrackingPage() {
  const [showTracking, setShowTracking] = useState(false);

  return (
    <div>
      <button onClick={() => setShowTracking(true)}>
        Track Order
      </button>
      
      {showTracking && (
        <OrderTracking onClose={() => setShowTracking(false)} />
      )}
    </div>
  );
}
```

### Using the Order API Client

```tsx
import { orderAPI } from '@/lib/api/orders';

// Create an order
const orderData = {
  restaurant_id: 1,
  customer_name: "John Doe",
  // ... other order data
};

try {
  const response = await orderAPI.createOrder(orderData);
  console.log('Order created:', response.order.order_number);
} catch (error) {
  console.error('Order creation failed:', error);
}

// Track an order
try {
  const order = await orderAPI.getOrderByNumber('ORD-20240902-001');
  console.log('Order status:', order.status);
} catch (error) {
  console.error('Order tracking failed:', error);
}
```

## 📈 Analytics Events

The order system automatically tracks the following events:

### Order Submission Events
- `order_submit_started` - When user starts order submission
- `order_submit_success` - When order is successfully created
- `order_submit_failed` - When order creation fails

### Order Tracking Events
- `order_tracking_requested` - When user requests order tracking
- `order_tracking_success` - When order is successfully found
- `order_tracking_failed` - When order tracking fails

### Event Properties
```javascript
{
  restaurant_id: number,
  restaurant_name: string,
  order_id?: number,
  order_number?: string,
  order_type: 'pickup' | 'delivery',
  payment_method: 'cash' | 'card' | 'online',
  item_count: number,
  total_amount: number,
  error_message?: string
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Backend URL for API calls
NEXT_PUBLIC_BACKEND_URL=http://localhost:8082

# Analytics configuration
NEXT_PUBLIC_ANALYTICS_ENABLED=true
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Feature flags
API_V4_ORDERS=true
```

### Feature Flag Control

The order system is controlled by the `api_v4_orders` feature flag:

```python
# backend/utils/feature_flags_v4.py
"api_v4_orders": {
    "default": True,
    "description": "Enable v4 order endpoints",
    "stage": MigrationStage.TESTING,
}
```

## 🧪 Testing

### Manual Testing Checklist

#### Order Creation
- [ ] Menu items display correctly
- [ ] Item quantities can be adjusted
- [ ] Price calculations are accurate
- [ ] Customer information validation works
- [ ] Delivery address required for delivery orders
- [ ] Order submission creates order in database
- [ ] Order confirmation modal displays correctly

#### Order Tracking
- [ ] Order can be found by order number
- [ ] Status displays correctly
- [ ] Progress indicators work
- [ ] Order details are accurate
- [ ] Error handling for invalid order numbers

#### Analytics
- [ ] Order events are tracked correctly
- [ ] Event properties are accurate
- [ ] Analytics dashboard shows order data

### API Testing

```bash
# Test order creation
curl -X POST http://localhost:8082/api/v4/orders \
  -H "Content-Type: application/json" \
  -d '{
    "restaurant_id": 1,
    "customer_name": "Test User",
    "customer_phone": "+1-555-123-4567",
    "customer_email": "test@example.com",
    "order_type": "pickup",
    "payment_method": "cash",
    "items": [
      {
        "id": "1",
        "name": "Test Item",
        "price": 10.99,
        "quantity": 1
      }
    ]
  }'

# Test order tracking
curl http://localhost:8082/api/v4/orders/number/ORD-20240902-001
```

## 🚀 Deployment Considerations

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Feature flags enabled
- [ ] Analytics tracking verified
- [ ] Error monitoring configured
- [ ] Performance monitoring enabled

### Performance Optimization
- Order API responses cached for 30 seconds
- Bulk order operations supported
- Database indexes on order_number and status
- Pagination for order lists

### Security Considerations
- Customer data validation and sanitization
- Rate limiting on order creation endpoints
- CORS configuration for frontend integration
- Input validation for all order fields

## 📖 Next Steps

### Planned Enhancements
1. **Payment Integration** - Stripe/PayPal integration for online payments
2. **Real-time Updates** - WebSocket support for live order status updates
3. **Order Modification** - Allow customers to modify orders before confirmation
4. **Bulk Orders** - Support for large/catering orders
5. **Restaurant Dashboard** - Order management interface for restaurants
6. **Customer Portal** - Order history and account management

### Integration Opportunities
1. **Email Notifications** - Order confirmation and status update emails
2. **SMS Notifications** - Text message updates for order status
3. **Push Notifications** - Mobile app integration for real-time updates
4. **Loyalty Program** - Points/rewards integration with orders
5. **Inventory Management** - Real-time menu availability updates

## 🆘 Troubleshooting

### Common Issues

#### Order Creation Fails
- Check if restaurant_id exists in database
- Verify all required fields are provided
- Check feature flag `api_v4_orders` is enabled
- Verify backend URL configuration

#### Order Tracking Not Working
- Confirm order number format is correct
- Check if order exists in database
- Verify API endpoint accessibility
- Check for network connectivity issues

#### Analytics Not Recording
- Verify analytics configuration
- Check Google Analytics measurement ID
- Confirm analytics events are being sent
- Check browser console for errors

### Debug Mode

Enable debug mode for detailed logging:

```bash
NEXT_PUBLIC_GA_DEBUG_MODE=true
NEXT_PUBLIC_ANALYTICS_ENABLED=true
```

---

## 📞 Support

For technical support or questions about the order system:

1. Check this documentation first
2. Review the troubleshooting section
3. Check system logs for error details
4. Contact the development team with specific error messages

---

*Last Updated: 2024-09-02*  
*System Version: 1.0.0*  
*Status: Production Ready*
