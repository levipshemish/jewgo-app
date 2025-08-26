# Specials Constraint Implementation

## Overview

This document outlines the implementation of a database constraint that enforces a maximum of 3 specials per restaurant. This ensures data integrity and prevents restaurants from having excessive specials that could impact performance and user experience.

## 🎯 **Problem Statement**

### **Business Requirements**
- **Maximum 3 Specials**: Each restaurant can have a maximum of 3 specials
- **Data Integrity**: Prevent data corruption and ensure consistent business rules
- **Performance**: Limit the number of specials to maintain good performance
- **User Experience**: Provide a clean, manageable interface for specials

### **Technical Requirements**
- **Database Constraint**: Enforce the limit at the database level
- **Application Validation**: Validate at the application level before database operations
- **API Enforcement**: Ensure all API endpoints respect the constraint
- **Migration Strategy**: Handle existing data that may exceed the limit

## 🚀 **Solution: Multi-Layer Constraint System**

### **Constraint Layers**

#### **1. Database-Level Constraint**
- **PostgreSQL Triggers**: BEFORE INSERT/UPDATE triggers to check specials count
- **JSON Array Length**: Use `json_array_length()` to count specials in JSON field
- **Error Handling**: Raise exceptions when constraint is violated
- **Rollback Protection**: Prevent invalid data from being committed

#### **2. Application-Level Validation**
- **Pre-Validation**: Check limits before database operations
- **Business Logic**: Enforce business rules in application code
- **Error Messages**: Provide clear error messages to users
- **Data Integrity**: Ensure data consistency across operations

#### **3. API-Level Enforcement**
- **Request Validation**: Validate incoming requests
- **Response Information**: Include constraint information in responses
- **Status Tracking**: Track current specials count and ability to add more
- **Error Handling**: Proper HTTP status codes for constraint violations

## 🔧 **Implementation Details**

### **Database Migration**

#### **1. Constraint Functions**
```sql
-- Function to check specials limit on UPDATE
CREATE OR REPLACE FUNCTION check_specials_limit()
RETURNS TRIGGER AS $$
DECLARE
    specials_count INTEGER;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.specials IS NOT NULL THEN
        BEGIN
            specials_count := json_array_length(NEW.specials::json);
        EXCEPTION
            WHEN OTHERS THEN
                specials_count := 0;
        END;
        
        IF specials_count > 3 THEN
            RAISE EXCEPTION 'Restaurant cannot have more than 3 specials. Current count: %', specials_count;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check specials limit on INSERT
CREATE OR REPLACE FUNCTION check_specials_limit_insert()
RETURNS TRIGGER AS $$
DECLARE
    specials_count INTEGER;
BEGIN
    IF NEW.specials IS NOT NULL THEN
        BEGIN
            specials_count := json_array_length(NEW.specials::json);
        EXCEPTION
            WHEN OTHERS THEN
                specials_count := 0;
        END;
        
        IF specials_count > 3 THEN
            RAISE EXCEPTION 'Restaurant cannot have more than 3 specials. Current count: %', specials_count;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### **2. Database Triggers**
```sql
-- Trigger for UPDATE operations
CREATE TRIGGER enforce_specials_limit
BEFORE UPDATE ON restaurants
FOR EACH ROW
EXECUTE FUNCTION check_specials_limit();

-- Trigger for INSERT operations
CREATE TRIGGER enforce_specials_limit_insert
BEFORE INSERT ON restaurants
FOR EACH ROW
EXECUTE FUNCTION check_specials_limit_insert();
```

### **Application-Level Methods**

#### **1. Specials Management Methods**
```python
def add_restaurant_special(self, restaurant_id: int, special_data: Dict[str, Any]) -> bool:
    """Add a special to a restaurant, enforcing the 3-specials limit."""
    
def update_restaurant_special(self, restaurant_id: int, special_id: str, special_data: Dict[str, Any]) -> bool:
    """Update a specific special for a restaurant."""
    
def remove_restaurant_special(self, restaurant_id: int, special_id: str) -> bool:
    """Remove a specific special from a restaurant."""
    
def replace_restaurant_specials(self, restaurant_id: int, specials_data: List[Dict[str, Any]]) -> bool:
    """Replace all specials for a restaurant, enforcing the 3-specials limit."""
```

#### **2. Validation Methods**
```python
def get_specials_count(self, restaurant_id: int) -> int:
    """Get the number of specials for a restaurant."""
    
def can_add_special(self, restaurant_id: int) -> bool:
    """Check if a restaurant can add another special."""
    
def validate_specials_data(self, specials_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Validate specials data and return validation results."""
```

### **API Endpoints**

#### **1. Get Restaurant Specials**
```http
GET /api/restaurants/{restaurant_id}/specials
```

**Response:**
```json
{
  "specials": [
    {
      "id": "uuid",
      "title": "Special Title",
      "description": "Special description",
      "price": 15.99,
      "is_paid": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1,
  "can_add": true,
  "max_specials": 3
}
```

#### **2. Add Special**
```http
POST /api/restaurants/{restaurant_id}/specials
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "New Special",
  "description": "Special description",
  "price": 12.99,
  "is_paid": false
}
```

**Response (Success):**
```json
{
  "message": "Special added successfully",
  "specials": [...],
  "count": 2,
  "can_add": true,
  "max_specials": 3
}
```

**Response (Limit Reached):**
```json
{
  "error": "Cannot add more specials",
  "message": "Restaurant already has 3 specials (maximum allowed)"
}
```

#### **3. Update Special**
```http
PUT /api/restaurants/{restaurant_id}/specials/{special_id}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Updated Special",
  "description": "Updated description",
  "price": 14.99
}
```

#### **4. Remove Special**
```http
DELETE /api/restaurants/{restaurant_id}/specials/{special_id}
Authorization: Bearer {admin_token}
```

#### **5. Replace All Specials**
```http
PUT /api/restaurants/{restaurant_id}/specials
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "specials": [
    {
      "title": "Special 1",
      "description": "Description 1"
    },
    {
      "title": "Special 2", 
      "description": "Description 2"
    }
  ]
}
```

#### **6. Validate Specials**
```http
POST /api/restaurants/{restaurant_id}/specials/validate
Content-Type: application/json

{
  "specials": [...]
}
```

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": [],
  "count": 2,
  "current_count": 1,
  "can_add": true,
  "max_specials": 3
}
```

## 📊 **Data Structure**

### **Special Object Structure**
```json
{
  "id": "uuid-string",
  "title": "Special Title",
  "description": "Special description",
  "price": 15.99,
  "is_paid": true,
  "payment_status": "paid",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### **Required Fields**
- `title`: Special title (required)
- `description`: Special description (required)

### **Optional Fields**
- `price`: Special price (numeric)
- `is_paid`: Payment status (boolean)
- `payment_status`: Payment status string
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## 🔄 **Migration Strategy**

### **1. Pre-Migration Analysis**
```bash
# Analyze current specials distribution
python scripts/maintenance/cleanup_excess_specials.py
```

### **2. Database Migration**
```bash
# Run the migration
alembic upgrade head
```

### **3. Data Cleanup**
```bash
# Clean up excess specials
python scripts/maintenance/cleanup_excess_specials.py
```

### **4. Validation**
```bash
# Validate constraint compliance
python scripts/maintenance/cleanup_excess_specials.py --validate
```

## 🛡️ **Error Handling**

### **1. Database Constraint Violations**
```sql
-- Error when trying to insert more than 3 specials
ERROR: Restaurant cannot have more than 3 specials. Current count: 4
```

### **2. Application-Level Errors**
```json
{
  "error": "Cannot add more specials",
  "message": "Restaurant already has 3 specials (maximum allowed)"
}
```

### **3. Validation Errors**
```json
{
  "error": "Invalid special data",
  "errors": [
    "Cannot have more than 3 specials. Provided: 4",
    "Special 1: Missing required field 'title'"
  ],
  "warnings": [
    "Special 1: 'is_paid' should be boolean"
  ]
}
```

## 📈 **Monitoring and Metrics**

### **1. Constraint Compliance**
- **Violation Tracking**: Monitor constraint violations
- **Compliance Reports**: Regular reports on constraint compliance
- **Alert System**: Alerts for repeated violations

### **2. Performance Metrics**
- **Specials Distribution**: Track distribution of specials counts
- **API Performance**: Monitor API response times
- **Error Rates**: Track validation error rates

### **3. Business Metrics**
- **Average Specials**: Average specials per restaurant
- **Utilization Rate**: Percentage of restaurants at the limit
- **Special Performance**: Track which specials perform best

## 🔧 **Usage Examples**

### **1. Adding a Special**
```python
import requests

# Add a special to a restaurant
response = requests.post(
    'https://jewgo-app-oyoh.onrender.com/api/restaurants/123/specials',
    headers={'Authorization': 'Bearer your_admin_token'},
    json={
        'title': 'Lunch Special',
        'description': '20% off all lunch items',
        'price': 12.99,
        'is_paid': False
    }
)

if response.status_code == 201:
    data = response.json()
    print(f"Special added! Total specials: {data['count']}")
    print(f"Can add more: {data['can_add']}")
else:
    print(f"Error: {response.json()['message']}")
```

### **2. Checking Specials Status**
```python
# Get current specials status
response = requests.get(
    'https://jewgo.onrender.com/api/restaurants/123/specials'
)

data = response.json()
print(f"Current specials: {data['count']}")
print(f"Can add more: {data['can_add']}")
print(f"Maximum allowed: {data['max_specials']}")
```

### **3. Validating Specials Data**
```python
# Validate specials before adding
specials_data = [
    {'title': 'Special 1', 'description': 'Desc 1'},
    {'title': 'Special 2', 'description': 'Desc 2'},
    {'title': 'Special 3', 'description': 'Desc 3'},
    {'title': 'Special 4', 'description': 'Desc 4'}  # This will fail
]

response = requests.post(
    'https://jewgo.onrender.com/api/restaurants/123/specials/validate',
    json={'specials': specials_data}
)

validation = response.json()
if not validation['valid']:
    print("Validation errors:")
    for error in validation['errors']:
        print(f"  - {error}")
```

## 🚨 **Troubleshooting**

### **1. Constraint Violation Errors**
- **Check Current Count**: Verify current specials count
- **Remove Excess**: Remove specials to get under the limit
- **Validate Data**: Ensure specials data is valid

### **2. Migration Issues**
- **Backup Data**: Always backup before migration
- **Test Migration**: Test migration on staging first
- **Rollback Plan**: Have rollback plan ready

### **3. API Issues**
- **Check Authentication**: Ensure proper admin token
- **Validate Request**: Check request format and data
- **Review Logs**: Check application logs for errors

## 📚 **Best Practices**

### **1. Data Management**
- **Regular Cleanup**: Regularly clean up old or invalid specials
- **Validation**: Always validate data before operations
- **Backup**: Regular backups of specials data

### **2. API Usage**
- **Check Limits**: Always check if you can add more specials
- **Handle Errors**: Properly handle constraint violation errors
- **Validate Data**: Validate data before sending to API

### **3. Monitoring**
- **Track Usage**: Monitor specials usage patterns
- **Alert Violations**: Set up alerts for constraint violations
- **Performance**: Monitor API performance impact

---

This comprehensive implementation ensures that the 3-specials constraint is enforced at multiple levels, providing robust data integrity while maintaining good performance and user experience. 