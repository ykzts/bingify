---
name: development
description: Set up the development environment, understand code conventions, and implement type-safe patterns. Use when starting development work, writing new components, or following project-specific coding guidelines.
metadata:
  author: Bingify
  version: "1.0"
---

# Development Setup & Code Conventions

このスキルは、Bingifyプロジェクトの開発環境構築とコード規約をカバーします。

## 概要

BingifyはNext.js+AppRouter、TailwindCSS、shadcn/ui、Supabaseを使用したプロジェクトです。エージェントが効率的に開発できるよう、プロジェクト固有のルールと実装パターンを提供します。

## セットアップ手順

### リポジトリのクローン

```bash
git clone https://github.com/ykzts/bingify.git
cd bingify
```

### パッケージのインストール

```bash
pnpm install
```

### 環境変数の設定

```bash
cp .env.local.example .env.local
```

### Supabaseのセットアップ

```bash
pnpm local:setup
```

### 開発サーバー起動

```bash
pnpm dev
```

## コード規約

### UIコンポーネント

- shadcn/uiコンポーネントは`@/components/ui`に配置 (自動生成、手動編集禁止)
- カスタムコンポーネントは`@/components`に配置

### スタイリング

TailwindCSSを使用 (CSS-first)：

```tsx
import { cn } from "@/lib/utils";

export function Button({ variant, className, ...props }) {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-lg font-medium",
        variant === "primary" && "bg-purple-500 text-white",
        className,
      )}
      {...props}
    />
  );
}
```

### 型安全性

Zodスキーマから型推論：

```tsx
import { z } from "zod";

const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof userSchema>;
```

### フォーム処理

TanStackForm+ServerActions+Zod：

```tsx
"use client";

import { useForm } from "@tanstack/react-form";
import { updateUser } from "./actions";

export function UserForm() {
  const form = useForm({
    defaultValues: { email: "" },
    onSubmit: async ({ value }) => {
      await updateUser(value);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <form.Field name="email" />
      <button type="submit">Save</button>
    </form>
  );
}
```

### ServerActions

バリデーション・DB操作はサーバーサイド：

```tsx
"use server";

import { db } from "@/lib/supabase/server";

export async function createUser(data: unknown) {
  const validData = userSchema.parse(data);

  const { data: user, error } = await db
    .from("users")
    .insert([validData])
    .select()
    .single();

  if (error) throw error;
  return user;
}
```

## ドキュメントのフォーマット

すべてのMarkdownドキュメント（`.md`）はPrettierで自動フォーマットされます：

```bash
pnpm format:docs
```

SKILL.mdを含むドキュメントを編集した場合は、コミット前に実行してください。

## 参考

- [AGENTS.md](../../../AGENTS.md) - 開発ガイドライン全体
- [CONTRIBUTING.md](../../../CONTRIBUTING.md) - 貢献ガイドライン
