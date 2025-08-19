# Avatar Upload Feature

## Overview

The avatar upload feature allows users to upload, manage, and display profile pictures in the JewGo application. This feature integrates with Supabase Storage for secure file storage and includes comprehensive security policies.

## 🚀 Features

### Core Functionality
- **Drag & Drop Upload**: Intuitive drag-and-drop interface for image uploads
- **File Validation**: Client and server-side validation for file type and size
- **Progress Tracking**: Visual progress indicator during upload
- **Preview**: Real-time preview of selected images
- **Delete Avatar**: Option to remove current avatar
- **Responsive Design**: Mobile-friendly interface

### Security Features
- **RLS Policies**: Row Level Security ensures users can only access their own avatars
- **File Type Validation**: Only allows JPEG, PNG, WebP, and GIF files
- **Size Limits**: Maximum 5MB file size
- **Unique Filenames**: UUID-based naming prevents conflicts
- **User Isolation**: Each user's avatars are stored in their own folder

## 🏗️ Architecture

### Storage Structure
```
avatars/
├── {userId}/
│   ├── {uuid1}.jpg
│   ├── {uuid2}.png
│   └── {uuid3}.webp
└── {anotherUserId}/
    └── {uuid4}.gif
```

### File Naming Convention
- Format: `{userId}/{uuid}.{extension}`
- Example: `123e4567-e89b-12d3-a456-426614174000/abc123.jpg`

### Database Integration
- Avatar URLs are stored in Supabase user metadata (`user_metadata.avatar_url`)
- Automatic revalidation of profile pages after upload/delete

## 📁 File Structure

```
frontend/
├── app/
│   ├── actions/
│   │   └── upload-avatar.ts          # Server actions for upload/delete
│   └── profile/
│       └── settings/
│           └── page.tsx              # Updated settings page with avatar upload
├── components/
│   └── profile/
│       └── AvatarUpload.tsx          # Reusable avatar upload component
├── lib/
│   └── supabase/
│       ├── client.ts                 # Browser client
│       └── server.ts                 # Server client
└── scripts/
    └── setup-supabase-storage.js     # Storage bucket setup script
```

## 🔧 Setup Instructions

### 1. Environment Variables

Ensure these environment variables are set in your `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 2. Supabase Storage Setup

Run the setup script to create the storage bucket and RLS policies:

```bash
cd frontend
node scripts/setup-supabase-storage.js
```

This script will:
- Create the "avatars" bucket
- Set up RLS policies for secure access
- Configure file size and type limits
- Enable public read access

### 3. Dependencies

The following dependencies are required:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.55.0",
    "@supabase/ssr": "^0.6.1",
    "react-dropzone": "^14.3.8",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/uuid": "^9.0.0"
  }
}
```

## 🔒 Security Implementation

### RLS Policies

The following policies are automatically created:

1. **Public Read Access**: Anyone can view avatar images
```sql
CREATE POLICY "Public read access to avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');
```

2. **User Upload Access**: Users can upload to their own folder
```sql
CREATE POLICY "Users can upload to own avatar folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

3. **User Update Access**: Users can update their own avatars
```sql
CREATE POLICY "Users can update own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

4. **User Delete Access**: Users can delete their own avatars
```sql
CREATE POLICY "Users can delete own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Validation

#### Client-Side Validation
- File type checking (JPEG, PNG, WebP, GIF)
- File size validation (max 5MB)
- Real-time preview generation

#### Server-Side Validation
- File type verification
- File size verification
- User authentication check
- File upload error handling

## 🎨 UI Components

### AvatarUpload Component

```typescript
interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarChange?: (avatarUrl: string) => void;
  className?: string;
}
```

**Features:**
- Drag and drop interface
- File browser integration
- Progress indicator
- Error handling
- Success feedback
- Delete functionality

### Integration Example

```tsx
import AvatarUpload from "@/components/profile/AvatarUpload";

function ProfileSettings() {
  const [user, setUser] = useState(userData);
  
  const handleAvatarChange = (avatarUrl: string) => {
    setUser(prev => ({ ...prev, avatar_url: avatarUrl }));
  };

  return (
    <AvatarUpload
      currentAvatarUrl={user.avatar_url}
      onAvatarChange={handleAvatarChange}
    />
  );
}
```

## 🔄 Server Actions

### uploadAvatar

Uploads a file to Supabase Storage and updates user profile.

```typescript
export async function uploadAvatar(formData: FormData): Promise<{
  success: boolean;
  avatarUrl?: string;
  error?: string;
}>
```

**Process:**
1. Validate user authentication
2. Extract and validate file from FormData
3. Generate unique filename with UUID
4. Upload to Supabase Storage
5. Get public URL
6. Update user metadata
7. Revalidate profile pages

### deleteAvatar

Deletes the current avatar and updates user profile.

```typescript
export async function deleteAvatar(): Promise<{
  success: boolean;
  error?: string;
}>
```

**Process:**
1. Validate user authentication
2. Extract current avatar URL from metadata
3. Delete file from storage
4. Update user metadata to remove avatar URL
5. Revalidate profile pages

## 📱 Mobile Optimization

- Touch-friendly interface
- Responsive design
- Optimized image loading
- Progressive enhancement
- Accessibility compliance

## 🧪 Testing

### Manual Testing Checklist

- [ ] Upload different file types (JPEG, PNG, WebP, GIF)
- [ ] Test file size limits (try files > 5MB)
- [ ] Verify drag and drop functionality
- [ ] Test file browser integration
- [ ] Check progress indicator
- [ ] Verify error handling
- [ ] Test delete functionality
- [ ] Check mobile responsiveness
- [ ] Verify RLS policies work correctly

### Automated Testing

```bash
# Run tests
npm test

# Test specific component
npm test AvatarUpload
```

## 🚨 Error Handling

### Common Errors

1. **File Type Error**: "Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image."
2. **File Size Error**: "File too large. Please upload an image smaller than 5MB."
3. **Upload Error**: "Failed to upload image. Please try again."
4. **Authentication Error**: "User not authenticated"
5. **Network Error**: "An unexpected error occurred. Please try again."

### Error Recovery

- Automatic cleanup of uploaded files on profile update failure
- Graceful fallback to previous avatar on errors
- User-friendly error messages
- Retry mechanisms

## 📊 Performance Considerations

- **Image Optimization**: Next.js Image component for optimized loading
- **Lazy Loading**: Images load only when needed
- **Caching**: Supabase Storage caching for fast access
- **Bundle Size**: Minimal impact on application bundle

## 🔄 Future Enhancements

### Planned Features
- [ ] Image cropping and editing
- [ ] Multiple avatar support
- [ ] Avatar templates/themes
- [ ] Social media integration
- [ ] Avatar analytics

### Technical Improvements
- [ ] WebP conversion for better compression
- [ ] Thumbnail generation
- [ ] CDN integration
- [ ] Advanced image processing

## 📚 API Reference

### Supabase Storage Methods

```typescript
// Upload file
supabase.storage.from('avatars').upload(filePath, file, options)

// Get public URL
supabase.storage.from('avatars').getPublicUrl(filePath)

// Delete file
supabase.storage.from('avatars').remove([filePath])
```

### User Metadata Update

```typescript
// Update avatar URL
supabase.auth.updateUser({
  data: { avatar_url: avatarUrl }
})

// Remove avatar URL
supabase.auth.updateUser({
  data: { avatar_url: null }
})
```

## 🤝 Contributing

When contributing to the avatar upload feature:

1. Follow the existing code patterns
2. Add appropriate error handling
3. Include tests for new functionality
4. Update documentation
5. Test on mobile devices
6. Verify security implications

## 📄 License

This feature is part of the JewGo application and follows the same licensing terms.
