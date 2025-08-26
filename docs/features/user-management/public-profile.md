# Public Profile Feature

## Overview

The Public Profile feature allows users to share their profiles publicly through a dedicated URL. Each user gets a unique profile page at `/u/[username]` that displays their information, activity, and statistics in a clean, shareable format.

## 🚀 Features

### Core Functionality
- **Unique Profile URLs**: Each user gets a public profile at `/u/[username]`
- **Case-Insensitive Username Lookup**: Usernames work regardless of case
- **SEO Optimized**: Full metadata support for social sharing and search engines
- **Responsive Design**: Mobile-friendly profile layout
- **Privacy Controls**: Respects user privacy preferences
- **Activity Statistics**: Display user activity and engagement metrics

### SEO & Social Features
- **Open Graph Tags**: Rich social media previews
- **Twitter Cards**: Optimized Twitter sharing
- **Canonical URLs**: Proper SEO canonical links
- **Meta Descriptions**: Dynamic descriptions based on user bio
- **Profile Images**: Avatar integration in social previews

### Privacy & Security
- **Privacy Preferences**: Respects user's public profile settings
- **Location Privacy**: Optional location display based on user preferences
- **404 Handling**: Proper error handling for non-existent profiles
- **Rate Limiting**: Built-in protection against abuse

## 🏗️ Architecture

### Frontend Components

#### 1. Public Profile Page
**Location**: `frontend/app/u/[username]/page.tsx`

**Features**:
- Server-side rendering for SEO
- Dynamic metadata generation
- Case-insensitive username lookup
- Error handling with 404 redirects
- Profile statistics aggregation

**Key Functions**:
- `generateMetadata()`: Dynamic SEO metadata
- `PublicProfilePage()`: Main page component
- `getProfileStats()`: User activity statistics

#### 2. Public Profile Component
**Location**: `frontend/components/profile/PublicProfile.tsx`

**Features**:
- Clean, modern profile layout
- Avatar display with fallback
- Activity statistics grid
- Privacy-aware information display
- Responsive design

**Key Props**:
```typescript
interface PublicProfileProps {
  profile: Profile;
  stats: ProfileStats;
  username: string;
}
```

#### 3. Not Found Page
**Location**: `frontend/app/u/[username]/not-found.tsx`

**Features**:
- Custom 404 page for profiles
- User-friendly error messages
- Navigation options
- Consistent branding

### Backend Implementation

#### 1. Database Queries
- Case-insensitive username lookup using `ilike()`
- Profile data retrieval with privacy filtering
- Statistics aggregation from multiple tables
- Optimized queries with proper indexing

#### 2. Performance Optimizations
- Database indexes for username lookups
- Efficient statistics queries
- Caching-friendly structure
- Minimal data transfer

### Database Schema

#### Profiles Table Indexes
```sql
-- Case-insensitive username index
CREATE INDEX idx_profiles_username_ci ON profiles (LOWER(username));

-- Existing indexes
CREATE INDEX idx_profiles_username ON profiles (username);
CREATE INDEX idx_profiles_display_name ON profiles (display_name);
CREATE INDEX idx_profiles_created_at ON profiles (created_at);
```

#### Statistics Queries
```sql
-- Review count
SELECT COUNT(*) FROM reviews 
WHERE user_id = ? AND status = 'approved';

-- Favorite count
SELECT COUNT(*) FROM favorites 
WHERE user_id = ?;
```

## 📋 Implementation Details

### URL Structure
```
/u/[username] - Public profile page
```

**Examples**:
- `/u/johndoe` - John's public profile
- `/u/JaneSmith` - Jane's public profile (case-insensitive)
- `/u/admin` - Admin's public profile

### Metadata Generation

#### Dynamic Title
```typescript
title: `${displayName} | JewGo`
```

#### Dynamic Description
```typescript
description: bio 
  ? `${displayName} on JewGo: ${bio.substring(0, 150)}...`
  : `View ${displayName}'s profile on JewGo${location ? ` from ${location}` : ''}`
```

#### Open Graph Tags
```typescript
openGraph: {
  title: `${displayName} | JewGo`,
  description,
  type: 'profile',
  images: avatarUrl ? [{ url: avatarUrl, width: 400, height: 400 }] : undefined,
  siteName: 'JewGo',
}
```

### Privacy Controls

#### Profile Visibility
- `preferences.publicProfile`: Controls overall profile visibility
- `preferences.showLocation`: Controls location display
- Private profiles return 404

#### Information Display
- Avatar: Always shown if available
- Display Name: Always shown
- Bio: Always shown if provided
- Location: Only shown if `showLocation` is true
- Website: Always shown if provided
- Age: Calculated from date of birth if provided
- Member Since: Always shown

### Statistics Display

#### Current Statistics
- **Reviews**: Number of approved reviews
- **Favorites**: Number of favorited restaurants
- **Restaurants Visited**: Stubbed for future implementation
- **Helpful Reviews**: Stubbed for future implementation

#### Future Statistics
- Restaurant check-ins
- Review helpfulness score
- Community contributions
- Badges and achievements

## 🔧 Configuration

### Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://jewgo.app
```

### Database Setup
Run the username index migration:
```bash
cd backend/scripts
python add_username_index.py
```

## 🚀 Usage

### Accessing Public Profiles
Users can access public profiles by navigating to:
```
https://jewgo.app/u/[username]
```

### Sharing Profiles
Users can share their profiles by:
1. Copying the URL from their settings page
2. Sharing the direct link
3. Using social media sharing buttons (future feature)

### Integration with Profile Settings
The public profile link is displayed in the profile settings page:
- Shows the current username
- Provides a direct link to view the profile
- Updates automatically when username changes

## 🧪 Testing

### Manual Testing
1. **Valid Profile**: Navigate to `/u/[valid-username]`
2. **Invalid Profile**: Navigate to `/u/[invalid-username]` (should show 404)
3. **Case Sensitivity**: Test with different username cases
4. **Privacy Settings**: Test with private profiles
5. **Social Sharing**: Test Open Graph tags

### Automated Testing
```bash
# Run type checking
npm run type-check

# Run build
npm run build

# Run tests (when implemented)
npm test
```

## 🔒 Security Considerations

### Input Validation
- Username validation on the server side
- SQL injection prevention through parameterized queries
- XSS prevention through proper escaping

### Privacy Protection
- Respect user privacy preferences
- Don't expose sensitive information
- Proper 404 handling for private profiles

### Rate Limiting
- Built-in Next.js rate limiting
- Database query optimization
- Caching strategies

## 📈 Performance Optimizations

### Database Optimizations
- Case-insensitive index on username
- Efficient statistics queries
- Minimal data retrieval

### Frontend Optimizations
- Server-side rendering for SEO
- Optimized images with Next.js Image component
- Efficient component rendering

### Caching Strategy
- Static generation where possible
- Database query caching
- CDN-friendly structure

## 🔄 Migration Guide

### Database Migration
1. Run the username index migration:
```bash
cd backend/scripts
python add_username_index.py
```

2. Verify the index was created:
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'profiles' 
AND indexname = 'idx_profiles_username_ci';
```

### Frontend Deployment
1. Build the application:
```bash
npm run build
```

2. Deploy to your hosting platform
3. Verify the routes are working:
   - `/u/[username]` - Public profile
   - `/u/[invalid]` - 404 page

## 🐛 Troubleshooting

### Common Issues

1. **Profile Not Found**:
   - Check if username exists in database
   - Verify case-insensitive lookup is working
   - Check user's privacy settings

2. **Slow Loading**:
   - Verify database indexes are created
   - Check query performance
   - Review caching strategy

3. **SEO Issues**:
   - Verify metadata generation
   - Check Open Graph tags
   - Test social media previews

### Debug Mode
Enable debug logging:
```bash
NODE_ENV=development
DEBUG=profile:*
```

## 📚 API Reference

### Page Component
```typescript
interface PublicProfilePageProps {
  params: Promise<{
    username: string;
  }>;
}
```

### Profile Component
```typescript
interface PublicProfileProps {
  profile: Profile;
  stats: ProfileStats;
  username: string;
}
```

### Profile Interface
```typescript
interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  website: string | null;
  date_of_birth: string | null;
  preferences: {
    publicProfile?: boolean;
    showLocation?: boolean;
  } | null;
  created_at: string;
  updated_at: string;
}
```

### Stats Interface
```typescript
interface ProfileStats {
  reviewCount: number;
  favoriteCount: number;
  memberSince: string;
  restaurantsVisited: number;
  helpfulReviews: number;
}
```

## 🤝 Contributing

### Development Setup
1. Clone the repository
2. Install dependencies
3. Set up environment variables
4. Run database migrations
5. Start development server

### Code Style
- Follow TypeScript best practices
- Use ESLint and Prettier
- Write comprehensive tests
- Document new features

### Testing
- Run unit tests: `npm test`
- Run integration tests: `npm run test:integration`
- Run E2E tests: `npm run test:e2e`

## 📄 License

This feature is part of the JewGo application and follows the same licensing terms.
