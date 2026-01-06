# OAuth Token Error Handling and Monitoring

This document describes the OAuth token error handling and monitoring system implemented in the Bingify application.

## Overview

The error handling system automatically detects, classifies, and handles OAuth token errors including:
- Invalid or expired tokens (401 errors)
- Insufficient permissions (403 errors)
- Refresh token failures
- Network errors

## Architecture

### Error Classification

Errors are classified into five types (`lib/oauth/token-error-handler.ts`):

| Error Type | Description | HTTP Status | Action Taken |
|------------|-------------|-------------|--------------|
| `TOKEN_INVALID` | Token has been revoked or expired | 401 | Delete token, require re-authentication |
| `INSUFFICIENT_PERMISSIONS` | Token lacks required permissions | 403 | Log warning, keep token |
| `REFRESH_TOKEN_INVALID` | Refresh token cannot be used | 400 with specific error | Delete token, require re-authentication |
| `NETWORK_ERROR` | Temporary network issue | N/A | Log warning, retry possible |
| `UNKNOWN` | Unclassified error | Various | Log error |

### Components

#### 1. Error Handler (`lib/oauth/token-error-handler.ts`)

**Main Functions:**

- `classifyOAuthError(error)` - Classifies errors based on status codes and messages
- `classifyProviderError(error, provider)` - Provider-specific error classification
- `handleOAuthError(supabase, error, provider, context)` - Main error handling function
- `requiresReauthentication(errorType)` - Determines if user needs to re-authenticate

**Key Features:**
- Automatic token deletion on invalid credentials
- Provider-specific error patterns (Google, Twitch)
- Structured logging with context
- Type-safe error classification

#### 2. Token Refresh Integration (`lib/oauth/token-refresh.ts`)

**Enhanced Features:**
- Automatically calls error handler on refresh failures
- Returns `tokenDeleted` flag in `RefreshResult`
- Logs all refresh attempts and outcomes

#### 3. Cron Endpoint (`app/api/cron/token-refresh/route.ts`)

**Monitoring Capabilities:**
- Tracks refresh statistics:
  - `refreshed` - Successfully refreshed tokens
  - `skipped` - Tokens that didn't need refresh
  - `failed` - Failed refresh attempts
  - `tokensDeleted` - Tokens deleted due to invalidity
- Returns detailed failure information including deletion status
- Handles errors per-token without failing the entire job

## Error Detection Patterns

### Google OAuth

```typescript
// Detected patterns:
- "invalid_grant"
- "token_expired"
- "Token has been expired or revoked"
- HTTP 401
- HTTP 403
```

### Twitch OAuth

```typescript
// Detected patterns:
- "invalid token"
- HTTP 401
- HTTP 403
```

## Usage Examples

### Manual Error Handling

```typescript
import { handleOAuthError } from "@/lib/oauth/token-error-handler";
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();

try {
  // Call OAuth API
  const result = await someOAuthOperation();
} catch (error) {
  // Handle error and possibly delete invalid token
  const errorResult = await handleOAuthError(
    supabase,
    error,
    "google", // or "twitch"
    "user API call" // context for logging
  );

  if (errorResult.requiresReauth) {
    // Redirect user to re-authenticate
    return {
      error: "Please reconnect your account",
      errorKey: "errorTokenExpired",
    };
  }
}
```

### Automatic Handling in Token Refresh

Token refresh automatically uses the error handler:

```typescript
import { refreshOAuthToken } from "@/lib/oauth/token-refresh";

const result = await refreshOAuthToken(supabase, "google");

if (!result.refreshed && result.tokenDeleted) {
  // Token was invalid and has been deleted
  console.log("User needs to re-authenticate");
}
```

## User Messages

Error messages are available in both English and Japanese through the i18n system (`messages/en.json`, `messages/ja.json`):

```typescript
import { useTranslations } from "next-intl";

const t = useTranslations("OAuth");

// Available keys:
t("errorTokenExpired")             // Token expired or revoked
t("errorTokenDeleted")             // Token has been deleted
t("errorInsufficientPermissions")  // Insufficient permissions
t("errorNetworkError")             // Network error
t("errorUnknown")                  // Unknown error
```

## Monitoring and Logging

### Structured Logs

All error handling produces structured console logs:

```typescript
// Token deletion
[OAuth Error Handler] Invalid token detected for google in token refresh: invalid_grant
[OAuth Error Handler] Successfully deleted invalid google token for user

// Permission errors
[OAuth Error Handler] Insufficient permissions for twitch in API call: 403 Forbidden

// Network errors
[OAuth Error Handler] Network error for google in channel lookup: Network timeout
```

### Cron Job Monitoring

The token refresh cron job (`/api/cron/token-refresh`) provides comprehensive statistics:

```json
{
  "data": {
    "total": 100,
    "refreshed": 85,
    "skipped": 10,
    "failed": 5,
    "tokensDeleted": 3,
    "message": "Token refresh completed: 85 refreshed, 10 skipped, 5 failed, 3 tokens deleted",
    "failedTokens": [
      {
        "user_id": "uuid",
        "provider": "google",
        "error": "Token has been revoked",
        "tokenDeleted": true
      }
    ]
  }
}
```

## Testing

Comprehensive test coverage is provided in `lib/oauth/__tests__/token-error-handler.test.ts`:

- 40 total test cases
- Error classification tests (20 tests)
- Error handling tests (15 tests)
- Re-authentication logic tests (5 tests)
- Provider-specific error tests

Run tests:
```bash
pnpm test lib/oauth/__tests__/token-error-handler.test.ts
```

## Best Practices

1. **Always handle OAuth errors**: Wrap OAuth API calls in try-catch and use `handleOAuthError`
2. **Provide context**: Include meaningful context strings for better log analysis
3. **Check requiresReauth**: Always check if user needs to re-authenticate after errors
4. **Use i18n messages**: Display localized error messages to users
5. **Monitor cron logs**: Regularly check token refresh statistics for anomalies

## Future Enhancements

- [ ] Email notifications for repeated token failures
- [ ] Dashboard for OAuth health metrics
- [ ] Automatic retry strategies for network errors
- [ ] Integration with monitoring services (Sentry, DataDog)
- [ ] Rate limiting on re-authentication requests
