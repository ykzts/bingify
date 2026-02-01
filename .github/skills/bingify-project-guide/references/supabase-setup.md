# Supabase Setup & Database Management

Bingifyプロジェクトのデータベース初期化とマイグレーション管理をカバーします。

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
- Port: 54322
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

## 参考

- [docs/MIGRATIONS.md](../../../../docs/MIGRATIONS.md) - マイグレーション運用ガイド
