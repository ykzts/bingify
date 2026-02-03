# Bingify Storybook

このディレクトリには、Bingify デザインシステムの Storybook 設定が含まれています。

## 概要

Bingify では、Storybook v10 と Next.js Vite アダプターを使用して、インタラクティブなコンポーネントカタログとデザインシステムのドキュメントを提供しています。

## 機能

- **30+ UI コンポーネント** - shadcn/ui コンポーネント（Button、Card、Badge など）
- **60+ ビジネスコンポーネント** - アプリケーション固有のコンポーネント
- **ダークモード対応** - ライトテーマとダークテーマを切り替え可能
- **多言語対応** - 英語と日本語をサポート
- **アクセシビリティテスト** - WCAG 準拠のための a11y アドオンを内蔵
- **インタラクティブコントロール** - コンポーネントの props をリアルタイムで変更可能

## 開発

Storybook をローカルで実行：

```bash
pnpm dev:storybook
```

これにより、[http://localhost:6006](http://localhost:6006) で Storybook が起動します。

## ビルド

静的な Storybook をビルド：

```bash
pnpm build-storybook
```

出力は `storybook-static/` ディレクトリに生成されます。

## ストーリーの追加

ストーリーは以下に配置してください：
- `components/**/*.stories.tsx` - コンポーネントストーリー用
- `stories/**/*.stories.tsx` - 専用ストーリーファイル用
- `stories/**/*.mdx` - ドキュメントページ用

ストーリーの構造例：

```tsx
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
```

## 設定

- **メイン設定**: `.storybook/main.ts`
- **プレビュー設定**: `.storybook/preview.tsx`

## アドオン

- `@storybook/addon-a11y` - アクセシビリティテスト
- `@storybook/addon-themes` - テーマ切り替え
- `@storybook/addon-docs` - 自動ドキュメント生成
- `@chromatic-com/storybook` - ビジュアルリグレッションテスト（オプション）
