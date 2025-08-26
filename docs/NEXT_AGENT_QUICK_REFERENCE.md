# Next Agent Quick Reference

## 🎯 Current Mission
**Fix the 500 error in API v4 restaurant creation** to complete the "submit restaurant" button functionality.

## ✅ What's Already Working
- API v4 routes are registered and accessible
- Feature flags are enabled (`api_v4_restaurants: true`)
- Frontend form is properly connected to API v4
- Input validation is working (returns 400 for missing fields)
- All endpoints are responding (not 404)

## 🔴 Current Problem
**POST `/api/v4/restaurants` returns 500 error** when trying to create a restaurant.

## 🚀 Quick Start Commands

### 1. Start Backend
```bash
cd backend
source venv/bin/activate
DATABASE_URL="postgresql://app_user:Jewgo123@141.148.50.111:5432/app_db?sslmode=require" \
REDIS_URL="redis://localhost:6379" \
FLASK_ENV=development \
python app.py
```

### 2. Test Current Status
```bash
# Test API v4 endpoint (should return 500, not 404)
curl -s -X POST http://localhost:8082/api/v4/restaurants \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "address": "123 Test St", "city": "Test City", "state": "FL", "zip_code": "12345", "phone_number": "555-1234"}'

# Check feature flags
curl -s http://localhost:8082/api/v4/migration/status | grep -A 3 "api_v4_restaurants"
```

## 🔍 Debugging Steps

### 1. Check Database Service
```bash
cd backend
source venv/bin/activate
python -c "from services.restaurant_service_v4 import RestaurantServiceV4; print('Service import test')"
```

### 2. Check Database Connection
```bash
python -c "from database.database_manager_v4 import DatabaseManager; db = DatabaseManager(); print('DB connection:', db.connect())"
```

### 3. Check Service Creation
```bash
python -c "from routes.api_v4 import create_restaurant_service; service = create_restaurant_service(); print('Service created:', service)"
```

## 📁 Key Files to Investigate

### Backend Files
- `backend/services/restaurant_service_v4.py` - Main service causing 500 error
- `backend/database/database_manager_v4.py` - Database connection
- `backend/routes/api_v4.py` - Route handler (line ~436)
- `backend/utils/feature_flags_v4.py` - Feature flags (already fixed)

### Frontend Files
- `frontend/app/api/restaurants/route.ts` - API proxy (already updated)
- `frontend/components/forms/EnhancedAddEateryForm.tsx` - Form component

## 🎯 Success Criteria
- ✅ POST `/api/v4/restaurants` returns 201 with restaurant data
- ✅ Restaurant data is stored in PostgreSQL database
- ✅ Frontend form submission works end-to-end
- ✅ User gets confirmation popup and redirects to eatery page

## 📋 Expected Flow
1. User fills out form on `/add-eatery` page
2. Clicks "Submit Restaurant" button
3. Frontend sends data to `/api/restaurants` (Next.js API route)
4. Next.js forwards to `http://localhost:8082/api/v4/restaurants`
5. Backend validates data and stores in database
6. Returns 201 with restaurant data
7. Frontend shows success popup and redirects to `/eatery`

## 🚨 Common Issues to Check
1. **Database Connection** - Is DATABASE_URL working?
2. **Service Dependencies** - Are all required services imported?
3. **Table Schema** - Do restaurant tables exist?
4. **Permissions** - Does the database user have write permissions?
5. **Error Logging** - Check backend logs for detailed error messages

## 📚 Full Documentation
For complete details, see: **[API v4 Routes Status & Next Steps](API_V4_ROUTES_STATUS.md)**

---

**Last Updated:** August 26, 2025  
**Priority:** High - Blocking user form submission functionality
