---
name: supabase-setup
description: Initialize Supabase locally, manage database migrations, and configure Row Level Security. Use when setting up databases, creating tables, or managing schemas.
metadata:
  author: Bingify
  version: "1.0"
---

# Supabase Setup & Database Management

このスキルは、Bingifyプロジェクトのデータベース初期化とマイグレーション管理をカバーします。

## 概要

BingifyはSupabaseをバックエンドデータベースとして使用します。ローカル開発では Supabase CLI で完全なPostgSQL環境を提供します。

## ローカルセットアップ

### Supabaseの起動

```bash
pnpm local:setup
```

### Supabase Studioへのアクセス

```
http://localhost:54323
```

### PostgreSQLへのアクセス

- Host: localhost
- Port: 5432
- User: postgres
- Password: postgres
- Database: postgres

## マイグレーション管理

### 重要ルール

**既存のマイグレーションファイルを編集してはいけません。**

変更が必要な場合は、新しいマイグレーションを作成してください。

### マイグレーション作成

```bash
supabase migration new migration_name
```

### マイグレーション適用

```bash
supabase db push
```

### マイグレーション確認

```bash
supabase migration list
```

## RLSポリシー

```sql
-- ユーザー自身のデータのみ表示
CREATE POLICY "Users can view own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- 認証済みユーザーのみ挿入可能
CREATE POLICY "Authenticated users can insert"
  ON public.spaces
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```

## データシード

```bash
supabase seed run
```

シードスクリプト: `supabase/seed.sql`

## ドキュメントのフォーマット

SKILL.mdを編集した場合は、以下でフォーマットしてください：

```bash
pnpm format:docs
```

## 参考

- [docs/MIGRATIONS.md](../../../docs/MIGRATIONS.md) - マイグレーション運用ガイド
- [supabase-setup を参照](../../../docs/MIGRATIONS.md)
