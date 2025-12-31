# Code Examples and Usage

## URL Builder Query Parameters

The `ViewingUrlDialog` component generates URLs with query parameters based on user-selected options.

### Base URL Format
```
/{locale}/screen/{viewToken}
```

### With Query Parameters
```
/{locale}/screen/{viewToken}?hideInfo=true&transparent=true
```

### Implementation

```typescript
// Build URL with query parameters
const buildUrl = () => {
  const baseUrl = `${window.location.origin}/${locale}/screen/${currentToken}`;
  const params = new URLSearchParams();
  
  if (hideInfo) {
    params.append("hideInfo", "true");
  }
  if (transparent) {
    params.append("transparent", "true");
  }
  
  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};
```

### Example URLs Generated

| Options Selected | Generated URL |
|-----------------|---------------|
| None | `https://example.com/en/screen/abc123` |
| Hide Info | `https://example.com/en/screen/abc123?hideInfo=true` |
| Transparent | `https://example.com/en/screen/abc123?transparent=true` |
| Both | `https://example.com/en/screen/abc123?hideInfo=true&transparent=true` |

### Usage in Viewing Page

The viewing page should check for these parameters:

```typescript
// app/[locale]/screen/[token]/page.tsx (example)
const searchParams = await props.searchParams;
const hideInfo = searchParams.hideInfo === 'true';
const transparent = searchParams.transparent === 'true';

// Apply styling based on parameters
const containerClass = cn(
  "bingo-board",
  transparent && "bg-transparent",
  hideInfo && "hide-metadata"
);
```

---

## Using the New Components

### SpaceSettingsSheet

```tsx
import { SpaceSettingsSheet } from "./_components/space-settings-sheet";

<SpaceSettingsSheet
  currentParticipantCount={10}
  features={{
    gatekeeper: {
      email: { enabled: true },
      youtube: { enabled: true },
      twitch: { enabled: true }
    }
  }}
  isOwner={true}
  locale="en"
  space={{
    id: "uuid",
    share_key: "example-20241231",
    title: "My Space",
    description: "Example space",
    status: "draft",
    owner_id: "user-uuid",
    max_participants: 50,
    gatekeeper_rules: null,
    settings: {}
  }}
  systemMaxParticipants={1000}
/>
```

### ViewingUrlDialog

```tsx
import { ViewingUrlDialog } from "./_components/viewing-url-dialog";

<ViewingUrlDialog
  locale="en"
  spaceId="uuid"
  viewToken="secure-token-123"
/>
```

### DraftStatusView

```tsx
import { DraftStatusView } from "./_components/draft-status-view";

{space.status === "draft" && (
  <DraftStatusView
    locale="en"
    spaceId={space.id}
  />
)}
```

---

## Translation Keys Reference

### New Keys Added

#### English
```json
{
  "AdminSpace": {
    // Draft view
    "draftMainTitle": "Space is in Draft Mode",
    "draftMainMessage": "This space is not yet published...",
    "draftMainHint": "Use the Settings button at the top...",
    "publishSpaceButton": "Publish Space and Start",
    
    // Settings
    "settingsButton": "Settings",
    "settingsTitle": "Space Settings",
    "settingsStatusDraft": "Draft",
    "settingsStatusActive": "Active",
    
    // URL Builder
    "viewingUrlButton": "Viewing URL",
    "viewingUrlDialogTitle": "Public Viewing URL",
    "viewingUrlDialogDescription": "Share this URL to display...",
    "urlBuilderOptionsTitle": "Display Options",
    "urlOptionHideInfo": "Hide title and description",
    "urlOptionTransparent": "Transparent background (for future use)",
    "urlBuilderHelpText": "Options are applied as query parameters..."
  }
}
```

#### Usage in Components
```tsx
const t = useTranslations("AdminSpace");

<Button>{t("settingsButton")}</Button>
<Button>{t("viewingUrlButton")}</Button>
<h1>{t("draftMainTitle")}</h1>
```

---

## Server Actions

The new components reuse existing server actions from `settings/actions.ts`:

### publishSpace
```typescript
// Used by DraftStatusView
const [publishState, publishAction, isPublishing] = useActionState<
  PublishSpaceState,
  FormData
>(publishSpace.bind(null, spaceId), {
  success: false,
});

// On success, redirects to detail page
useEffect(() => {
  if (publishState.success) {
    router.push(`/${locale}/dashboard/spaces/${spaceId}`);
    router.refresh();
  }
}, [publishState.success]);
```

### updateSpaceSettings
```typescript
// Used by SpaceSettingsForm (inside SpaceSettingsSheet)
const [updateState, updateAction, isUpdating] = useActionState<
  UpdateSpaceState,
  FormData
>(updateSpaceSettings.bind(null, space.id), {
  success: false,
});
```

### regenerateViewToken
```typescript
// Used by ViewingUrlDialog
const result = await regenerateViewToken(spaceId);
if (result.success && result.viewToken) {
  setCurrentToken(result.viewToken);
  // URL automatically updates
}
```

---

## Data Fetching

The main page now fetches additional data needed for the settings sheet:

```typescript
// app/[locale]/dashboard/spaces/[id]/page.tsx

// Fetch space with all necessary fields
const { data: space } = await supabase
  .from("spaces")
  .select(
    "id, share_key, view_token, owner_id, status, created_at, " +
    "max_participants, title, description, gatekeeper_rules, settings"
  )
  .eq("id", id)
  .single();

// Get participant count for validation
const { data: participantsData } = await supabase
  .from("participants")
  .select("id")
  .eq("space_id", id);

const participantCount = participantsData?.length ?? 0;

// Get system settings for the settings sheet
const { data: systemSettings } = await supabase
  .from("system_settings")
  .select("features, max_participants_per_space")
  .eq("id", 1)
  .single();
```

---

## Conditional Rendering by Status

```tsx
{/* Draft State */}
{space.status === "draft" && (
  <DraftStatusView locale={locale} spaceId={space.id} />
)}

{/* Active State */}
{space.status === "active" && (
  <>
    <BingoGameManager spaceId={space.id} />
    <ParticipantsStatus 
      maxParticipants={space.max_participants}
      spaceId={space.id}
    />
    <CloseSpaceButton spaceId={space.id} />
  </>
)}

{/* Closed State */}
{space.status === "closed" && (
  <div>Space has been closed</div>
)}
```

---

## Styling Patterns

### Sheet Width
```tsx
<SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
  {/* Content */}
</SheetContent>
```

The sheet is:
- Full width on mobile
- Max width of 2xl (42rem) on larger screens
- Scrollable when content overflows

### Dialog Width
```tsx
<DialogContent className="sm:max-w-2xl">
  {/* Content */}
</DialogContent>
```

### Responsive Header
```tsx
<div className="mb-8 flex items-center justify-between">
  <div>
    <h1 className="font-bold text-3xl">{t("heading")}</h1>
    <p className="mt-1 text-gray-600">
      {t("spaceId")}: {space.share_key}
    </p>
  </div>
  <div className="flex gap-3">
    <ViewingUrlDialog {...props} />
    <SpaceSettingsSheet {...props} />
  </div>
</div>
```

On small screens, buttons might wrap to a new line (handled by flexbox).

---

## Error Handling

### Form Validation
```tsx
{updateState.error && (
  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
    <p className="text-red-800">{updateState.error}</p>
  </div>
)}
```

### Field Errors
```tsx
<FieldError>{updateState.fieldErrors?.title}</FieldError>
```

### Success Messages
```tsx
{updateState.success && (
  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
    <CheckCircle className="h-5 w-5 text-green-600" />
    <p className="text-green-800">{t("updateSuccess")}</p>
  </div>
)}
```

---

## Testing Examples

### Unit Test for URL Builder
```typescript
describe('buildUrl', () => {
  it('returns base URL with no options', () => {
    const url = buildUrl(false, false);
    expect(url).toBe('https://example.com/en/screen/token123');
  });

  it('adds hideInfo parameter', () => {
    const url = buildUrl(true, false);
    expect(url).toBe('https://example.com/en/screen/token123?hideInfo=true');
  });

  it('adds both parameters', () => {
    const url = buildUrl(true, true);
    expect(url).toContain('hideInfo=true');
    expect(url).toContain('transparent=true');
  });
});
```

### Integration Test
```typescript
describe('Space Detail Page', () => {
  it('shows publish button for draft spaces', async () => {
    const { getByText } = render(<AdminSpacePage params={{
      id: 'draft-space-id',
      locale: 'en'
    }} />);
    
    expect(getByText('Publish Space and Start')).toBeInTheDocument();
  });

  it('shows game manager for active spaces', async () => {
    const { getByText } = render(<AdminSpacePage params={{
      id: 'active-space-id',
      locale: 'en'
    }} />);
    
    expect(getByText('Bingo Game Manager')).toBeInTheDocument();
  });
});
```

---

## Migration Checklist

If you're migrating existing code:

- [ ] Remove any links to `/dashboard/spaces/[id]/settings`
- [ ] Update redirects to point to `/dashboard/spaces/[id]`
- [ ] Remove any components that rendered the old `ViewingUrlManager`
- [ ] Update tests that checked for settings route
- [ ] Update documentation/wiki pages
- [ ] Inform users about the new workflow
- [ ] Update any bookmarks or saved links

---

## Future Enhancements

### Additional URL Parameters
To add new URL parameters, update the `ViewingUrlDialog`:

```typescript
// Add state
const [fontSize, setFontSize] = useState("normal");

// Add to buildUrl
if (fontSize !== "normal") {
  params.append("fontSize", fontSize);
}

// Add UI
<Select value={fontSize} onValueChange={setFontSize}>
  <SelectItem value="small">Small</SelectItem>
  <SelectItem value="normal">Normal</SelectItem>
  <SelectItem value="large">Large</SelectItem>
</Select>
```

### URL Presets
```typescript
const presets = {
  streaming: { hideInfo: true, transparent: true },
  display: { hideInfo: false, transparent: false },
  minimal: { hideInfo: true, transparent: false }
};

<Button onClick={() => applyPreset(presets.streaming)}>
  Streaming Setup
</Button>
```

### QR Code Generation
```typescript
import QRCode from 'qrcode.react';

<QRCode value={viewingUrl} size={200} />
```
