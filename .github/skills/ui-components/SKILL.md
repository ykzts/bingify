---
name: ui-components
description: Manage shadcn/ui components, apply TailwindCSS patterns, and implement accessible UI. Use when building interfaces and styling components.
metadata:
  author: Bingify
  version: "1.0"
---

# UI Components & Styling

このスキルは、BingifyのUI設計・コンポーネント管理・スタイリング戦略をカバーします。

## 概要

BingifyはshadcnuiとTailwindCSSを組み合わせて、アクセシブルで保守性の高いUIを構築します。

## shadcnuiコンポーネント管理

### ディレクトリ構成

```
components/
  ├── ui/                # shadcnui (自動生成、手動編集禁止)
  └── (カスタムコンポーネント)
```

### コンポーネント追加

```bash
pnpm dlx shadcn@latest add button
```

### コンポーネント更新

```bash
pnpm dlx shadcn@latest add --yes --overwrite button
```

## TailwindCSSスタイリング

CSS-firstアプローチ：

```tsx
<div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
  <h2 className="text-lg font-semibold text-gray-900">Title</h2>
</div>
```

## テーマカラー

Bingifyのプライマリカラーはパープル：

```tsx
// ボタン
<button className="bg-purple-500 hover:bg-purple-600 text-white">
  Primary Action
</button>
```

## アクセシビリティ

セマンティックHTML：

```tsx
<button aria-label="Close dialog">×</button>
<nav aria-label="Main navigation">
  <a href="/" aria-current="page">Home</a>
</nav>
```

## ドキュメントのフォーマット

SKILL.mdを編集した場合は、以下でフォーマットしてください：

```bash
pnpm format:docs
```

## 参考

- [shadcnui コンポーネント一覧](https://ui.shadcn.com/)
- [Tailwind CSS ドキュメント](https://tailwindcss.com/docs)
- [Lucide React アイコン](https://lucide.dev/)
