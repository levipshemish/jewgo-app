# Profile Edit Feature

## Overview

The Profile Edit feature provides users with a comprehensive interface to manage their profile information, including personal details, contact information, and preferences. This feature includes real-time validation, optimistic UI updates, and robust error handling.

## 🚀 Features

### Core Functionality
- **Comprehensive Profile Management**: Edit username, display name, bio, location, website, phone, and date of birth
- **Real-time Username Validation**: Debounced username availability checking with format validation
- **User Preferences**: Manage notification and privacy preferences
- **Optimistic UI Updates**: Immediate feedback for better user experience
- **Form Validation**: Client and server-side validation using Zod schemas
- **Toast Notifications**: Success and error feedback using a modern toast system

### Security Features
- **Input Sanitization**: All user inputs are validated and sanitized
- **Username Uniqueness**: Server-side constraint checking prevents duplicate usernames
- **Authentication Required**: All profile operations require user authentication
- **Data Validation**: Comprehensive validation using Zod schemas

## 🏗️ Architecture

### Frontend Components

#### 1. ProfileEditForm Component
**Location**: `frontend/components/profile/ProfileEditForm.tsx`

**Features**:
- React Hook Form integration with Zod validation
- Real-time username availability checking
- Optimistic UI updates
- Comprehensive form validation
- Loading states and error handling

**Key Props**:
```typescript
interface ProfileEditFormProps {
  onProfileUpdate?: (data: ProfileFormData) => void;
  className?: string;
}
```

#### 2. Username Validation Hook
**Location**: `frontend/hooks/useUsernameValidation.ts`

**Features**:
- Debounced username checking (500ms delay)
- Real-time format validation
- Availability status tracking
- Error state management

**Usage**:
```typescript
const {
  username,
  setUsername,
  validationState,
  getValidationMessage,
  getValidationStatus,
  isValid
} = useUsernameValidation(initialUsername);
```

#### 3. Toast Notification System
**Location**: `frontend/components/ui/Toast.tsx`

**Features**:
- Multiple notification types (success, error, info, warning)
- Auto-dismiss with configurable duration
- Portal-based rendering
- Accessibility compliant

### Backend Implementation

#### 1. Server Actions
**Location**: `frontend/app/actions/update-profile.ts`

**Functions**:
- `updateProfile()`: Main profile update function
- `checkUsernameAvailability()`: Username uniqueness checking
- `getCurrentProfile()`: Fetch current user profile

#### 2. Validation Schemas
**Location**: `frontend/lib/validators/profile.ts`

**Schemas**:
- `ProfileSchema`: Complete profile validation
- `UsernameSchema`: Username-specific validation
- `ProfileFormSchema`: Client-side form validation

### Database Schema

#### Profiles Table
```sql
CREATE TABLE profiles (
    id VARCHAR(50) PRIMARY KEY,           -- User ID from auth
    username VARCHAR(30) UNIQUE NOT NULL, -- Unique username
    display_name VARCHAR(50) NOT NULL,    -- Display name
    bio TEXT,                            -- User bio (max 500 chars)
    location VARCHAR(100),               -- User location
    website VARCHAR(500),                -- Website URL
    phone VARCHAR(20),                   -- Phone number
    date_of_birth DATE,                  -- Date of birth
    avatar_url VARCHAR(500),             -- Avatar image URL
    preferences JSONB,                   -- User preferences
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes**:
- `idx_profiles_username`: For username lookups
- `idx_profiles_display_name`: For display name searches
- `idx_profiles_created_at`: For chronological queries

**Constraints**:
- Username format: `^[a-zA-Z0-9_-]+$`
- Username length: 3-30 characters
- Display name length: 1-50 characters
- Bio length: Max 500 characters
- Phone format: International format validation

## 📋 Implementation Details

### Form Validation Flow

1. **Client-side Validation**:
   - Real-time field validation using Zod schemas
   - Username format and availability checking
   - Field length and format constraints

2. **Server-side Validation**:
   - Complete data validation before database operations
   - Username uniqueness verification
   - Data sanitization and transformation

3. **Error Handling**:
   - Specific error messages for each validation failure
   - Graceful fallback for network errors
   - User-friendly error display

### Username Validation Process

1. **Format Validation**:
   - Check username format using regex
   - Validate length requirements
   - Transform to lowercase

2. **Availability Checking**:
   - Debounced API calls (500ms delay)
   - Server-side uniqueness verification
   - Real-time status updates

3. **Error States**:
   - Format errors
   - Availability errors
   - Network errors

### Optimistic UI Updates

1. **Immediate Feedback**:
   - Form updates applied instantly
   - Loading states for async operations
   - Success/error notifications

2. **State Management**:
   - Form state tracking
   - Dirty state detection
   - Validation state management

## 🔧 Configuration

### Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database Configuration
DATABASE_URL=your_database_url
```

### Dependencies
```json
{
  "react-hook-form": "^7.x.x",
  "@hookform/resolvers": "^3.x.x",
  "zod": "^3.x.x",
  "uuid": "^9.x.x"
}
```

## 🚀 Usage

### Basic Implementation
```tsx
import ProfileEditForm from '@/components/profile/ProfileEditForm';

function SettingsPage() {
  const handleProfileUpdate = (data) => {
    console.log('Profile updated:', data);
  };

  return (
    <div>
      <h1>Profile Settings</h1>
      <ProfileEditForm onProfileUpdate={handleProfileUpdate} />
    </div>
  );
}
```

### With Toast Notifications
```tsx
import ProfileEditForm from '@/components/profile/ProfileEditForm';
import { ToastContainer } from '@/components/ui/Toast';

function SettingsPage() {
  return (
    <div>
      <ProfileEditForm />
      <ToastContainer />
    </div>
  );
}
```

## 🧪 Testing

### Unit Tests
**Location**: `frontend/__tests__/components/ProfileEditForm.test.tsx`

**Test Coverage**:
- Form validation
- Username availability checking
- Error handling
- Success scenarios

### Integration Tests
- End-to-end profile update flow
- Database constraint testing
- Authentication integration

## 🔒 Security Considerations

### Input Validation
- All user inputs are validated using Zod schemas
- Server-side validation prevents malicious data
- SQL injection prevention through parameterized queries

### Authentication
- All profile operations require valid user session
- User can only modify their own profile
- Session validation on every request

### Data Protection
- Sensitive data is not logged
- Error messages don't expose internal details
- Input sanitization prevents XSS attacks

## 📈 Performance Optimizations

### Debouncing
- Username validation is debounced to reduce API calls
- Form validation uses efficient validation strategies

### Caching
- Profile data is cached appropriately
- Database queries are optimized with proper indexes

### Bundle Optimization
- Components are code-split where appropriate
- Dependencies are tree-shaken for optimal bundle size

## 🔄 Migration Guide

### Database Migration
Run the profile migration script:
```bash
cd backend/scripts
python run_profile_migration.py
```

### Frontend Setup
1. Install dependencies:
```bash
npm install react-hook-form @hookform/resolvers zod uuid
```

2. Add components to your pages:
```tsx
import ProfileEditForm from '@/components/profile/ProfileEditForm';
```

3. Configure toast notifications:
```tsx
import { ToastContainer } from '@/components/ui/Toast';
```

## 🐛 Troubleshooting

### Common Issues

1. **Username Already Taken**:
   - Check if username exists in database
   - Verify uniqueness constraints
   - Clear browser cache if needed

2. **Validation Errors**:
   - Check Zod schema definitions
   - Verify input format requirements
   - Review error messages

3. **Database Connection Issues**:
   - Verify database URL configuration
   - Check network connectivity
   - Review database permissions

### Debug Mode
Enable debug logging by setting:
```bash
NODE_ENV=development
DEBUG=profile:*
```

## 📚 API Reference

### Server Actions

#### updateProfile(data: ProfileData)
Updates user profile information.

**Parameters**:
- `data`: ProfileData object containing user information

**Returns**:
```typescript
{
  success: boolean;
  data?: ProfileData;
  error?: string;
}
```

#### checkUsernameAvailability(username: string)
Checks if a username is available.

**Parameters**:
- `username`: Username to check

**Returns**:
```typescript
{
  available: boolean;
  error?: string;
}
```

#### getCurrentProfile()
Retrieves current user profile.

**Returns**:
```typescript
{
  success: boolean;
  data?: ProfileData;
  error?: string;
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
