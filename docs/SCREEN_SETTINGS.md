# Realtime Screen Settings Feature

## Overview

This feature enables real-time configuration of screen display settings from the admin dashboard. Settings are stored in the database and synchronized to all connected screen displays using Supabase Realtime.

## Key Changes

### Database Schema

- **New Table**: `screen_settings`
  - Stores display mode (`full` or `minimal`) and background color per space
  - Unique constraint on `space_id` (one settings row per space)
  - RLS policies for owner/admin write access and public read access
  - Realtime enabled for instant updates

### Admin UI

- **Screen Settings Dialog** (`app/[locale]/dashboard/spaces/[id]/_components/screen-settings-dialog.tsx`)
  - Manage display mode (Full/Minimal)
  - Configure background (Default/Transparent/Green/Blue)
  - Preview button to open screen in new tab
  - Real-time updates to connected screens

### Screen Display

- **Realtime Subscription** (`app/(standalone)/[locale]/screen/[token]/_components/screen-display.tsx`)
  - Subscribes to `screen_settings` table changes
  - Automatically updates display mode and background when settings change
  - Removed hover-based settings UI (cleaner display experience)

### Viewing URL

- **Simplified URL** (`app/[locale]/dashboard/spaces/[id]/_components/viewing-url-dialog.tsx`)
  - Removed query parameters (`?mode=...&bg=...`)
  - Settings are now managed via database instead of URL
  - Single, stable URL for each space

## Usage

1. Navigate to space dashboard: `/[locale]/dashboard/spaces/[id]`
2. Click "Screen Display Settings" button
3. Configure display mode and background
4. Click "Update Settings"
5. All connected screens update immediately
6. Use "Preview" button to test in new tab

## Technical Details

### Realtime Channel

Screen displays subscribe to:
```typescript
supabase
  .channel(`screen-settings-${spaceId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'screen_settings',
    filter: `space_id=eq.${spaceId}`
  }, handleUpdate)
```

### Server Actions

- `getScreenSettings(spaceId)`: Fetch current settings
- `updateScreenSettings(spaceId, settings)`: Upsert settings (requires owner/admin)

### Security

- RLS policies prevent unauthorized writes
- Public read access for screen display pages (no auth required)
- Settings changes verified with owner/admin check

## Migration

Migration file: `supabase/migrations/20260103000000_add_screen_settings.sql`

Existing spaces will use default settings (`full` mode, `default` background) until configured by owner.

## Benefits

1. ✅ No need to change URL for projector/OBS
2. ✅ Real-time updates without browser refresh
3. ✅ Preview settings before applying to live screens
4. ✅ Cleaner screen display (no hover UI)
5. ✅ Centralized settings management
