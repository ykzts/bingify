# YouTube Integration for Participation Requirements - Implementation Summary

## Overview

This implementation adds YouTube channel subscription verification as a participation requirement for bingo spaces. Space owners can specify a YouTube channel ID, and participants must be subscribed to that channel to join the space.

## What Has Been Implemented

### 1. Backend Infrastructure

#### Database Schema (`supabase/migrations/20251228040000_add_youtube_channel_requirement.sql`)
- Added `youtube_channel_id` column to `spaces` table
- Column is nullable (NULL = no YouTube verification required)

#### YouTube API Integration (`lib/youtube.ts`)
- `checkSubscriptionStatus()` function that verifies YouTube channel subscriptions
- Uses YouTube Data API v3 subscriptions endpoint
- Returns `{ isSubscribed: boolean, error?: string }`
- Proper error handling for API failures

#### Server Actions (`app/[locale]/spaces/actions.ts`)
- Updated `SpaceInfo` interface to include `youtube_channel_id`
- Modified `joinSpace()` action to accept optional `youtubeAccessToken` parameter
- Added `verifyYouTubeSubscription()` helper function
- Validates subscription before allowing participant to join

#### Dashboard Actions (`app/[locale]/dashboard/actions.ts`)
- Updated `createSpace()` to accept `youtube_channel_id` from form data
- Stores YouTube channel ID when creating new spaces

### 2. User Interface

#### Space Participation Component (`app/[locale]/spaces/[id]/_components/space-participation.tsx`)
- Shows blue info banner when YouTube verification is required
- Displays appropriate error messages for verification failures

#### Create Space Form (`app/[locale]/dashboard/create-space-form.tsx`)
- Added YouTube Channel ID input field (optional)
- Help text explaining the feature
- Integrated with createSpace action

### 3. Translations

Added translation keys for both English and Japanese:
- `errorYouTubeVerificationRequired`
- `errorYouTubeNotSubscribed`
- `errorYouTubeVerificationFailed`
- `verifyYouTubeButton`
- `verifyingYouTube`

### 4. Tests

Created comprehensive tests for YouTube API integration (`lib/__tests__/youtube.test.ts`):
- Subscription exists scenario
- No subscription scenario
- Missing parameters
- API errors
- Network errors
- Parameter validation

### 5. Documentation

Updated `.env.local.example` with YouTube API configuration:
- `NEXT_PUBLIC_YOUTUBE_API_KEY`
- `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID`

## What Remains to be Implemented

### OAuth Flow for YouTube Token Acquisition

The current implementation has the backend logic in place, but requires a client-side OAuth flow to obtain YouTube access tokens. Here's what needs to be done:

#### 1. Google OAuth Setup
1. Enable YouTube Data API v3 in Google Cloud Console
2. Create OAuth 2.0 Client ID for web application
3. Configure authorized redirect URIs
4. Add client ID to environment variables

#### 2. Client-Side OAuth Implementation

Add Google Identity Services to the application:

```html
<!-- In app layout or _document -->
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

Create a YouTube verification button component:

```tsx
// app/[locale]/spaces/[id]/_components/youtube-verification-button.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function YouTubeVerificationButton({ 
  onTokenReceived 
}: { 
  onTokenReceived: (token: string) => void 
}) {
  const t = useTranslations("UserSpace");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = () => {
    setIsVerifying(true);
    
    const client = google.accounts.oauth2.initTokenClient({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID!,
      scope: 'https://www.googleapis.com/auth/youtube.readonly',
      callback: (response) => {
        if (response.access_token) {
          onTokenReceived(response.access_token);
        }
        setIsVerifying(false);
      },
    });

    client.requestAccessToken();
  };

  return (
    <button
      onClick={handleVerify}
      disabled={isVerifying}
      className="..."
    >
      {isVerifying ? t("verifyingYouTube") : t("verifyYouTubeButton")}
    </button>
  );
}
```

#### 3. Integration with Space Participation

Update `space-participation.tsx` to:
1. Show YouTube verification button when required
2. Call `joinSpace()` with the access token after verification
3. Handle verification flow errors

Example flow:
```tsx
const handleYouTubeVerify = async (token: string) => {
  setIsJoining(true);
  const result = await joinSpace(spaceId, token);
  if (result.success) {
    setHasJoined(true);
    router.refresh();
  } else {
    setError(result.errorKey ? t(result.errorKey) : t("errorJoinFailed"));
  }
  setIsJoining(false);
};

// In render
{spaceInfo.youtube_channel_id && !hasJoined && (
  <YouTubeVerificationButton onTokenReceived={handleYouTubeVerify} />
)}
```

## Testing the Implementation

### Manual Testing Steps

1. **Create a Space with YouTube Requirement**
   - Go to dashboard
   - Create new space
   - Enter a YouTube Channel ID (e.g., `UCxxxxxxxxxxxxxx`)
   - Create the space

2. **Attempt to Join Without Verification**
   - Navigate to the space as a different user
   - Try to join
   - Should see error: "YouTube account verification is required"

3. **Join with Verification** (once OAuth is implemented)
   - Click "Verify YouTube Account" button
   - Authorize with Google
   - If subscribed: Successfully join the space
   - If not subscribed: See error message

### Database Verification

```sql
-- Check spaces with YouTube requirements
SELECT id, share_key, youtube_channel_id 
FROM spaces 
WHERE youtube_channel_id IS NOT NULL;

-- Check participants
SELECT * FROM participants WHERE space_id = '<space_id>';
```

## Security Considerations

1. **Access Token Handling**
   - Access tokens are not stored in the database
   - Tokens are only used transiently for verification
   - Tokens are passed via server actions (not exposed in URLs)

2. **API Rate Limits**
   - YouTube Data API has quota limits
   - Consider caching subscription status for a short period
   - Implement retry logic for transient failures

3. **Channel ID Validation**
   - Add input validation for channel ID format
   - Verify channel exists before saving

## Future Enhancements

1. **Membership Level Verification**
   - Extend to check for channel memberships (requires `members` API access)
   - Add membership tier requirements

2. **Multiple Channel Support**
   - Allow requiring subscription to any of multiple channels
   - Useful for collaborative streams

3. **Subscription Caching**
   - Cache subscription status for authenticated users
   - Reduce API calls and improve performance

4. **Admin Interface**
   - Show subscription requirements in space management
   - Allow editing after creation

## References

- [YouTube Data API v3 Documentation](https://developers.google.com/youtube/v3)
- [YouTube Subscriptions API](https://developers.google.com/youtube/v3/docs/subscriptions)
- [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/overview)
