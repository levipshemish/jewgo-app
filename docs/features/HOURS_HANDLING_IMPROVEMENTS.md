# Hours Handling Improvements

## Overview

This document outlines the comprehensive hours handling improvements implemented for the JewGo app, addressing the inconsistency between Google Places API and ORB hours data sources.

## 🎯 **Problem Statement**

### **Current State (Before Improvements)**
- ❌ **Inconsistent Data Sources**: Google Places API vs ORB scraping
- ❌ **Multiple Formats**: Raw JSON, text strings, different structures
- ❌ **No Normalization**: Hours stored in various formats
- ❌ **Limited Helper Functions**: Basic parsing only
- ❌ **Poor UX**: Inconsistent display across the app
- ❌ **Timezone Issues**: No proper timezone handling

### **Data Source Issues**
- **Google Places API**: Structured JSON with periods and weekday_text
- **ORB Scraping**: Text strings like "Mon-Fri: 11AM-9PM, Sat: 12PM-10PM, Sun: Closed"
- **Manual Entry**: Various formats without standardization

## 🚀 **Solution: Comprehensive Hours Management System**

### **Core Components**

#### **1. HoursManager Class**
```python
# backend/utils/hours_manager.py
class HoursManager:
    def normalize_hours(self, hours_data: Any, source: str) -> Dict[str, Any]
    def get_today_hours(self, hours_json: Dict[str, Any]) -> Optional[Dict[str, Any]]
    def is_open_now(self, hours_json: Dict[str, Any]) -> bool
    def get_formatted_hours_for_ui(self, hours_json: Dict[str, Any], format_type: str) -> Any
```

#### **2. Standardized JSON Format**
```json
{
  "hours": {
    "mon": {"open": "11:00 AM", "close": "9:00 PM", "is_open": true},
    "tue": {"open": "11:00 AM", "close": "9:00 PM", "is_open": true},
    "wed": {"open": "11:00 AM", "close": "9:00 PM", "is_open": true},
    "thu": {"open": "11:00 AM", "close": "9:00 PM", "is_open": true},
    "fri": {"open": "11:00 AM", "close": "9:00 PM", "is_open": true},
    "sat": {"open": "12:00 PM", "close": "10:00 PM", "is_open": true},
    "sun": {"open": "", "close": "", "is_open": false}
  },
  "open_now": false,
  "timezone": "America/New_York",
  "last_updated": "2024-01-15T10:30:00Z"
}
```

## 🔧 **Implementation Details**

### **Backend Implementation**

#### **1. HoursManager Features**

##### **Normalization Functions**
```python
# Google Places API normalization
def _normalize_google_places_hours(self, hours_data: Dict[str, Any]) -> Dict[str, Any]:
    # Parse periods: [{"open": {"day": 0, "time": "1100"}, "close": {"day": 0, "time": "2200"}}]
    # Parse weekday_text: ["Monday: 11:00 AM – 10:00 PM", ...]
    # Convert to standardized format

# ORB text normalization
def _normalize_orb_hours(self, hours_text: str) -> Dict[str, Any]:
    # Parse patterns like "Mon-Fri: 11AM-9PM, Sat: 12PM-10PM, Sun: Closed"
    # Handle "Daily: 11AM-11PM"
    # Convert to standardized format
```

##### **Helper Functions**
```python
# Get today's hours
def get_today_hours(self, hours_json: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # Returns today's hours with open/close times

# Check if currently open
def is_open_now(self, hours_json: Dict[str, Any]) -> bool:
    # Handles timezone, overnight hours, current time comparison

# Format for UI display
def get_formatted_hours_for_ui(self, hours_json: Dict[str, Any], format_type: str) -> Any:
    # format_type: 'dropdown', 'compact', 'detailed', 'today'
```

#### **2. Database Integration**
```python
# Enhanced database manager methods
def normalize_restaurant_hours(self, restaurant_id: int, hours_source: str) -> bool
def get_restaurant_hours_status(self, restaurant_id: int) -> Dict[str, Any]
def update_restaurant_hours(self, restaurant_id: int, hours_data: Any, source: str) -> bool
```

#### **3. API Endpoints**
```python
# GET /api/restaurants/{id}/hours
# Get comprehensive hours information

# PUT /api/restaurants/{id}/hours
# Update restaurant hours with normalization

# POST /api/restaurants/{id}/hours/normalize
# Normalize existing hours data

# POST /api/restaurants/hours/batch-normalize
# Normalize hours for multiple restaurants
```

### **Frontend Implementation**

#### **1. Enhanced Hours Display Component**
```typescript
// frontend/components/restaurant/EnhancedHoursDisplay.tsx
export default function EnhancedHoursDisplay({
  restaurantId,
  showTimezone = true,
  showLastUpdated = true
}) {
  // Real-time hours status
  // Expandable weekly view
  // Timezone-aware display
  // Last updated information
}
```

#### **2. Features**
- **Real-time Status**: Shows if restaurant is currently open
- **Timezone Support**: Displays in restaurant's local timezone
- **Expandable View**: Click to see full weekly hours
- **Visual Indicators**: Green for open, red for closed, gray for unknown
- **Last Updated**: Shows when hours were last updated

## 📊 **Data Migration Strategy**

### **Migration Script**
```python
# scripts/maintenance/migrate_hours_to_normalized.py
def analyze_hours_data():
    # Analyze current hours data distribution

def migrate_restaurant_hours(restaurant_id: int, source: str):
    # Migrate single restaurant

def batch_migrate_hours(restaurant_ids: List[int] = None):
    # Batch migration for multiple restaurants

def validate_migration(restaurant_ids: List[int] = None):
    # Validate migration results
```

### **Migration Process**
1. **Analysis**: Understand current data distribution
2. **Migration**: Convert existing data to normalized format
3. **Validation**: Verify migration success
4. **Rollback**: Option to revert if needed

## 🎨 **User Experience Improvements**

### **1. Hours Display**
- **Status Badge**: Clear open/closed indicator
- **Today's Hours**: Shows current day's hours prominently
- **Weekly View**: Expandable full week schedule
- **Timezone Info**: Shows restaurant's timezone
- **Last Updated**: Transparency about data freshness

### **2. Interactive Features**
- **Expand/Collapse**: Smooth animations for weekly view
- **Real-time Updates**: Live status without page refresh
- **Loading States**: Visual feedback during data fetch
- **Error Handling**: Graceful fallbacks for missing data

### **3. Mobile Optimization**
- **Touch-Friendly**: Large touch targets
- **Responsive Design**: Adapts to screen size
- **Fast Loading**: Optimized API calls
- **Offline Support**: Cached hours data

## 🧪 **Testing Strategy**

### **1. Unit Tests**
```python
def test_google_places_normalization():
    # Test Google Places API format parsing

def test_orb_normalization():
    # Test ORB text format parsing

def test_timezone_handling():
    # Test timezone-aware open/closed logic

def test_overnight_hours():
    # Test restaurants open past midnight
```

### **2. Integration Tests**
```python
def test_hours_api_endpoints():
    # Test all hours-related API endpoints

def test_migration_process():
    # Test data migration from old to new format

def test_frontend_integration():
    # Test hours display component
```

### **3. Performance Tests**
```python
def test_hours_parsing_performance():
    # Ensure parsing is fast enough

def test_api_response_time():
    # Ensure API responses are under 200ms
```

## 📈 **Benefits**

### **1. Data Consistency**
- **Single Format**: All hours in standardized JSON
- **Source Tracking**: Know where hours data came from
- **Validation**: Ensure data integrity
- **Backward Compatibility**: Support old formats during transition

### **2. Developer Experience**
- **Helper Functions**: Easy-to-use API for common operations
- **Type Safety**: Strong typing for hours data
- **Documentation**: Comprehensive examples and guides
- **Testing**: Automated tests for all functionality

### **3. User Experience**
- **Accurate Status**: Real-time open/closed information
- **Better Display**: Clean, consistent hours presentation
- **Timezone Awareness**: Correct local time display
- **Performance**: Fast loading and updates

### **4. Maintenance**
- **Centralized Logic**: Single source of truth for hours handling
- **Easy Updates**: Simple to add new hours sources
- **Monitoring**: Track hours data quality
- **Debugging**: Clear error messages and logging

## 🔄 **Migration Timeline**

### **Phase 1: Backend Implementation**
1. ✅ Create HoursManager class
2. ✅ Add database integration methods
3. ✅ Create API endpoints
4. ✅ Add comprehensive testing

### **Phase 2: Data Migration**
1. 🔄 Analyze existing hours data
2. 🔄 Create migration scripts
3. 🔄 Test migration on sample data
4. 🔄 Execute full migration

### **Phase 3: Frontend Integration**
1. 🔄 Create EnhancedHoursDisplay component
2. 🔄 Update existing components
3. 🔄 Add user testing
4. 🔄 Performance optimization

### **Phase 4: Monitoring & Optimization**
1. 🔄 Monitor hours data quality
2. 🔄 Optimize performance
3. 🔄 Add advanced features
4. 🔄 User feedback collection

## 🎯 **Future Enhancements**

### **1. Advanced Features**
- **Holiday Hours**: Special hours for holidays
- **Seasonal Hours**: Different hours by season
- **Break Times**: Lunch breaks, etc.
- **Multiple Shifts**: Morning/evening shifts

### **2. Integration Features**
- **Google Calendar**: Sync with restaurant calendars
- **Social Media**: Pull hours from social media
- **Website Scraping**: Auto-update from restaurant websites
- **User Reports**: Allow users to report incorrect hours

### **3. Analytics**
- **Hours Analytics**: Track popular hours, peak times
- **Accuracy Metrics**: Monitor hours data quality
- **Update Frequency**: Track how often hours change
- **User Engagement**: Monitor hours feature usage

## 📚 **Usage Examples**

### **Backend Usage**
```python
from utils.hours_manager import HoursManager

# Initialize manager
hours_manager = HoursManager('America/New_York')

# Normalize Google Places data
google_hours = {
    "periods": [{"open": {"day": 0, "time": "1100"}, "close": {"day": 0, "time": "2200"}}],
    "weekday_text": ["Monday: 11:00 AM – 10:00 PM"]
}
normalized = hours_manager.normalize_hours(google_hours, 'google_places')

# Check if open now
is_open = hours_manager.is_open_now(normalized)

# Get formatted hours
formatted = hours_manager.get_formatted_hours_for_ui(normalized, 'dropdown')
```

### **Frontend Usage**
```typescript
import EnhancedHoursDisplay from '@/components/restaurant/EnhancedHoursDisplay';

// In restaurant detail page
<EnhancedHoursDisplay
  restaurantId={restaurant.id}
  showTimezone={true}
  showLastUpdated={true}
/>
```

### **API Usage**
```bash
# Get restaurant hours
curl "https://jewgo.onrender.com/api/restaurants/123/hours"

# Update restaurant hours
curl -X PUT "https://jewgo.onrender.com/api/restaurants/123/hours" \
  -H "Content-Type: application/json" \
  -d '{"hours_data": "Mon-Fri: 11AM-9PM", "source": "orb"}'

# Normalize existing hours
curl -X POST "https://jewgo.onrender.com/api/restaurants/123/hours/normalize" \
  -H "Content-Type: application/json" \
  -d '{"source": "google_places"}'
```

---

This comprehensive hours handling system transforms the inconsistent hours data into a reliable, user-friendly system that provides accurate, real-time information about restaurant operating hours. 