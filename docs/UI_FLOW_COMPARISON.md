# UI Flow Comparison: Before vs After

## Before Implementation

```
┌─────────────────────────────────────────┐
│  Space Detail Page                      │
│  /dashboard/spaces/[id]                 │
├─────────────────────────────────────────┤
│                                         │
│  [Draft Status Banner]                  │
│  "Go to Settings" button ───────┐      │
│                                  │      │
│  ┌────────────────────────────┐ │      │
│  │ Viewing URL Manager        │ │      │
│  │ - Full URL display         │ │      │
│  │ - Copy button              │ │      │
│  │ - Regenerate button        │ │      │
│  └────────────────────────────┘ │      │
│                                  │      │
│  [Bingo Game Manager]           │      │
│  (only if active)               │      │
│                                  │      │
│  "Settings" link ───────────────┤      │
│                                  │      │
└──────────────────────────────────┼──────┘
                                   │
                                   ↓
┌──────────────────────────────────────────┐
│  Settings Page (Separate Route)         │
│  /dashboard/spaces/[id]/settings         │
├──────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Space Settings Form                │ │
│  │ - Title                            │ │
│  │ - Description                      │ │
│  │ - Gatekeeper Rules                 │ │
│  │ - Max Participants                 │ │
│  │ - Privacy Settings                 │ │
│  │                                    │ │
│  │ [Update] [Publish] buttons        │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Admin Management (if owner)        │ │
│  │ - Invite admins                    │ │
│  │ - Remove admins                    │ │
│  └────────────────────────────────────┘ │
│                                          │
└──────────────────────────────────────────┘
```

**Issues:**
- ❌ Requires navigation between pages
- ❌ Viewing URL always visible (clutters interface)
- ❌ Draft status requires going to settings to publish
- ❌ Extra clicks to access settings

---

## After Implementation

```
┌───────────────────────────────────────────────────────────┐
│  Space Detail Page - Unified Interface                    │
│  /dashboard/spaces/[id]                                   │
├───────────────────────────────────────────────────────────┤
│  Dashboard                          [Viewing URL] [Settings]│
│  Space ID: example-20241231              ↓           ↓     │
├──────────────────────────────────────────┼───────────┼─────┤
│                                          │           │     │
│  ┌────────────────────────────────────┐ │           │     │
│  │  MAIN CONTENT (Status-based)       │ │           │     │
│  │                                    │ │           │     │
│  │  Draft State:                      │ │           │     │
│  │    🚀                              │ │           │     │
│  │    "Space is in Draft Mode"       │ │           │     │
│  │    [Publish Space and Start]      │ │           │     │
│  │                                    │ │           │     │
│  │  Active State:                     │ │           │     │
│  │    - Bingo Game Manager           │ │           │     │
│  │    - Participants Status          │ │           │     │
│  │    - Close Space Section          │ │           │     │
│  │                                    │ │           │     │
│  │  Closed State:                     │ │           │     │
│  │    - Completion message           │ │           │     │
│  └────────────────────────────────────┘ │           │     │
│                                          │           │     │
└──────────────────────────────────────────┼───────────┼─────┘
                                           │           │
                    ┌──────────────────────┘           │
                    ↓                                  │
       ┌────────────────────────────┐                 │
       │  URL Builder Dialog        │                 │
       │  (Modal)                   │                 │
       ├────────────────────────────┤                 │
       │                            │                 │
       │  [URL Display]             │                 │
       │  example.com/screen/token? │                 │
       │  hideInfo=true&...         │                 │
       │                            │                 │
       │  [Copy] [Open]             │                 │
       │                            │                 │
       │  Display Options:          │                 │
       │  ☑ Hide title/description  │                 │
       │  ☐ Transparent background  │                 │
       │                            │                 │
       │  [Regenerate URL]          │                 │
       └────────────────────────────┘                 │
                                                      │
                           ┌──────────────────────────┘
                           ↓
              ┌──────────────────────────────────────────┐
              │  Settings Sheet                          │
              │  (Side Drawer)                           │
              ├──────────────────────────────────────────┤
              │                                          │
              │  Space Settings                          │
              │  example-20241231 - Draft                │
              │                                          │
              │  ┌────────────────────────────────────┐ │
              │  │ Space Settings Form                │ │
              │  │ - Title                            │ │
              │  │ - Description                      │ │
              │  │ - Gatekeeper Rules (Tabs)          │ │
              │  │ - Max Participants                 │ │
              │  │ - Privacy Settings                 │ │
              │  │                                    │ │
              │  │ [Update] [Publish] buttons        │ │
              │  └────────────────────────────────────┘ │
              │                                          │
              │  ──────────────────────                │
              │                                          │
              │  ┌────────────────────────────────────┐ │
              │  │ Admin Management (if owner)        │ │
              │  │ - Invite admins                    │ │
              │  │ - Remove admins                    │ │
              │  └────────────────────────────────────┘ │
              │                                          │
              └──────────────────────────────────────────┘
```

**Improvements:**
- ✅ All operations on single page
- ✅ URL builder only shown when needed
- ✅ Query parameters for customization
- ✅ Clear draft → publish workflow
- ✅ Status-based main content
- ✅ Settings always accessible from header

---

## User Flows

### Creating and Publishing a New Space

**Before:**
1. Click "Create Space" → Enter details → Submit
2. Redirected to `/settings` page
3. Fill out settings form
4. Click "Publish" button
5. Manually navigate back to main page to see game

**After:**
1. Click "Create Space" → Enter details → Submit
2. Redirected to detail page (draft state)
3. See large "Publish Space" button in center
4. (Optional) Click "Settings" to configure details
5. Click "Publish Space and Start" button
6. Same page transitions to active state with game interface

### Getting Viewing URL

**Before:**
1. On detail page
2. Viewing URL always visible at top
3. Copy the displayed URL
4. URL has no customization options

**After:**
1. On detail page
2. Click "Viewing URL" button in header
3. Dialog opens with URL builder
4. Select display options (hide info, transparent, etc.)
5. URL updates in real-time with query parameters
6. Click "Copy" or "Open in New Tab"

### Editing Space Settings

**Before:**
1. On detail page
2. Click "Settings" link
3. Navigate to `/settings` page
4. Edit settings
5. Click "Update"
6. Navigate back to detail page

**After:**
1. On detail page
2. Click "Settings" button in header
3. Sheet slides in from right
4. Edit settings in sheet
5. Click "Update"
6. Sheet closes, still on detail page

---

## Component Structure

```
page.tsx (Server Component)
│
├── Header Section
│   ├── Title + Space ID
│   └── Action Buttons
│       ├── ViewingUrlDialog ← Client Component
│       │   └── URL Builder with Checkboxes
│       └── SpaceSettingsSheet ← Client Component
│           ├── SpaceSettingsForm (from settings/)
│           └── AdminManagement (from settings/)
│
└── Main Content (Conditional)
    │
    ├─[if Draft]─→ DraftStatusView
    │              └── Publish Button
    │
    ├─[if Active]─→ BingoGameManager
    │               ParticipantsStatus
    │               CloseSpaceButton
    │
    └─[if Closed]─→ Completion Message
```

---

## Key Design Decisions

### Why Sheet for Settings?
- **Contextual:** Keeps user on the same page
- **Non-blocking:** Can be dismissed without losing context
- **Familiar:** Common pattern in modern web apps
- **Mobile-friendly:** Works well on all screen sizes

### Why Dialog for URL?
- **Focus:** URL generation is a distinct task
- **Options:** Provides space for builder UI
- **Discoverability:** Clear that URL has options
- **Separation:** Not needed during normal workflow

### Why Prominent Publish Button?
- **Visibility:** Hard to miss the next action
- **Guidance:** Clear what to do when space is draft
- **Efficiency:** One-click publish from main view
- **Context:** Can see space details before publishing

### Why Status-Based Main Content?
- **Relevance:** Only show what's needed for current state
- **Simplicity:** Reduces cognitive load
- **Scalability:** Easy to add more states if needed
- **Clear State:** User always knows space status
