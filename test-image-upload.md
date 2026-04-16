# Image Upload Features Test Guide

## Features Added

### 1. Profile Picture Upload
- **Location**: Profile page
- **Functionality**: Click the camera icon on profile picture to upload
- **File limit**: 5MB
- **Storage**: `server/public/avatars/`
- **URL pattern**: `/avatars/{user_id}.{ext}`

### 2. Community Post Images
- **Location**: Community page - new post form
- **Functionality**: "Choose Photo" button in post creation
- **File limit**: 10MB
- **Storage**: `server/public/community/`
- **URL pattern**: `/community/{timestamp}-{random}.{ext}`

### 3. Community Reply Images
- **Location**: Community page - reply section
- **Functionality**: "📷 Photo" button in reply form
- **File limit**: 10MB
- **Storage**: `server/public/community/`
- **URL pattern**: `/community/{timestamp}-{random}.{ext}`

## Database Changes
- Added `image_url` column to `community_posts` table
- Added `image_url` column to `community_replies` table
- Migration handles existing databases automatically

## API Endpoints
- `POST /api/users/me/avatar` - Upload profile picture
- `POST /api/community` - Create post (now supports FormData with image)
- `POST /api/community/:id/replies` - Reply to post (now supports FormData with image)

## Testing Steps

1. **Profile Picture**:
   - Go to Profile page
   - Click camera icon on avatar
   - Select an image file
   - Verify upload success and image display

2. **Community Post with Image**:
   - Go to Community page
   - Click "New Post"
   - Fill in title and details
   - Click "Choose Photo" and select image
   - Submit post
   - Verify image appears in post list and detail view

3. **Community Reply with Image**:
   - Open any community post
   - Write a reply
   - Click "📷 Photo" and select image
   - Submit reply
   - Verify image appears in reply

## File Structure
```
server/
  public/
    avatars/          # Profile pictures
    community/        # Community post/reply images
```

## Security Features
- File type validation (images only)
- File size limits (5MB for avatars, 10MB for community)
- Unique filename generation to prevent conflicts
- Proper error handling for upload failures