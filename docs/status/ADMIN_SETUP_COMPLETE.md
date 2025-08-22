# Admin Dashboard Setup Complete

## Generated Admin Token
```
ADMIN_TOKEN=9e7ca8004763f06536ae4e34bf7a1c3abda3e6971508fd867f9296b7f2f23c25
```

## Environment Variables to Set

### Backend (Render)
Set these environment variables in your Render backend service:

```
ADMIN_TOKEN=9e7ca8004763f06536ae4e34bf7a1c3abda3e6971508fd867f9296b7f2f23c25
```

### Frontend (Vercel)
Set these environment variables in your Vercel frontend service:

```
ADMIN_TOKEN=9e7ca8004763f06536ae4e34bf7a1c3abda3e6971508fd867f9296b7f2f23c25
ADMIN_API_URL=https://jewgo-app-oyoh.onrender.com
```

## Admin Functionality Implemented

### Backend API Endpoints
- `GET /api/admin/users` - List users with pagination
- `PUT /api/admin/users` - Update user role (admin/non-admin)
- `DELETE /api/admin/users` - Delete user
- `GET /api/admin/restaurants` - List restaurants with pagination
- `PUT /api/admin/restaurants` - Update restaurant data
- `GET /api/admin/reviews` - List reviews with pagination
- `PUT /api/admin/reviews` - Update review data
- `DELETE /api/admin/reviews` - Delete review

### Frontend Admin Pages
- `/admin` - Dashboard with stats
- `/admin/users` - User management
- `/admin/restaurants` - Restaurant management
- `/admin/reviews` - Review moderation

### Security Features
- Admin token authentication on all admin endpoints
- Rate limiting (50 requests per hour)
- Server-side proxy routes to prevent token exposure
- Role-based access control (isSuperAdmin flag)

## Testing Status

✅ Frontend proxy routes working (tested locally)
✅ Backend endpoints implemented
✅ Admin token generated and configured locally
⏳ Backend token deployment pending
⏳ Frontend token deployment pending

## Next Steps

1. **Deploy to Render Backend:**
   - Go to Render dashboard
   - Find your backend service
   - Add environment variable: `ADMIN_TOKEN=9e7ca8004763f06536ae4e34bf7a1c3abda3e6971508fd867f9296b7f2f23c25`
   - Redeploy the service

2. **Deploy to Vercel Frontend:**
   - Go to Vercel dashboard
   - Find your frontend project
   - Add environment variables:
     - `ADMIN_TOKEN=9e7ca8004763f06536ae4e34bf7a1c3abda3e6971508fd867f9296b7f2f23c25`
     - `ADMIN_API_URL=https://jewgo-app-oyoh.onrender.com`
   - Redeploy the project

3. **Test Admin Flow:**
   - Login as admin user
   - Navigate to `/admin`
   - Verify dashboard stats load
   - Test user management at `/admin/users`
   - Test restaurant management at `/admin/restaurants`
   - Test review moderation at `/admin/reviews`

## Security Notes

- The admin token is a 64-character hex string
- Store securely and rotate periodically
- Never expose in client-side code
- All admin operations require valid token
- Rate limiting prevents abuse

## Troubleshooting

If admin endpoints return "Invalid or expired token":
1. Verify ADMIN_TOKEN is set correctly on backend
2. Check token matches between frontend and backend
3. Ensure backend service is redeployed after env changes

If admin pages show errors:
1. Verify ADMIN_TOKEN and ADMIN_API_URL are set on frontend
2. Check network tab for API call failures
3. Ensure frontend is redeployed after env changes
