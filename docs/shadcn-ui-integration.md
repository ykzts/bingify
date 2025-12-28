# Shadcn/ui Integration

This document describes the shadcn/ui integration in Bingify.

## Overview

Bingify uses **shadcn/ui** for UI components with a custom purple theme to maintain brand consistency.

## Configuration

- **Style**: New York
- **Base Color**: Zinc
- **CSS Variables**: Enabled
- **Primary Theme Color**: `#a78bfa` (Electric Lavender / HSL: `263 70% 76%`)

## Components

The following shadcn/ui components are currently installed:

- `Button` - Primary action component with purple default variant
- `Avatar` - User profile pictures and fallbacks
- `Dropdown Menu` - Contextual menus and dropdowns
- `Separator` - Visual dividers

## Usage

```tsx
import { Button } from "@/components/ui/button";

export function MyComponent() {
  return (
    <Button>Primary Action</Button>
  );
}
```

## Theme Colors

Primary colors are defined in `app/globals.css`:

- **Primary**: `#a78bfa` (Purple - Electric Lavender)
- **Secondary**: `#fbbf24` (Yellow - Sunshine Pop)
- **Accent**: `#34d399` (Green - Minty Fresh)
- **Destructive**: `#f43f5e` (Rose)

## Adding New Components

To add new shadcn/ui components:

```bash
pnpm dlx shadcn@latest add <component-name>
```

Note: If the CLI cannot reach external URLs, components can be manually added to `components/ui/`.

## Notes

- Namespace imports (`import * as`) are used for Radix UI primitives following shadcn/ui conventions
- The purple theme is applied via CSS variables in `app/globals.css`
- Components use Tailwind CSS classes that reference these variables
