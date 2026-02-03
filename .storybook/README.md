# Bingify Storybook

This directory contains the Storybook configuration for the Bingify design system.

## Overview

Bingify uses Storybook v10 with the Next.js Vite adapter to provide an interactive component catalog and design system documentation.

## Features

- **30+ UI Components** - shadcn/ui components (Button, Card, Badge, etc.)
- **60+ Business Components** - Application-specific components
- **Dark Mode Support** - Toggle between light and dark themes
- **Internationalization** - English and Japanese language support
- **Accessibility Testing** - Built-in a11y addon for WCAG compliance
- **Interactive Controls** - Modify component props in real-time

## Development

Run Storybook locally:

\`\`\`bash
pnpm dev:storybook
\`\`\`

This will start Storybook at [http://localhost:6006](http://localhost:6006)

## Building

Build static Storybook:

\`\`\`bash
pnpm build-storybook
\`\`\`

Output will be in `storybook-static/` directory.

## Adding Stories

Stories should be placed in:
- `components/**/*.stories.tsx` - For component stories
- `stories/**/*.stories.tsx` - For dedicated story files
- `stories/**/*.mdx` - For documentation pages

Example story structure:

\`\`\`tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/ui/button";

const meta = {
  title: "UI Components/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Button",
  },
};
\`\`\`

## Configuration

- **Main config**: `.storybook/main.ts`
- **Preview config**: `.storybook/preview.ts`

## Addons

- `@storybook/addon-a11y` - Accessibility testing
- `@storybook/addon-themes` - Theme switching
- `@storybook/addon-docs` - Automatic documentation
- `@chromatic-com/storybook` - Visual regression testing (optional)
