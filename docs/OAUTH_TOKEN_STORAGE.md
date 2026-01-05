# OAuth Token Secure Storage

## 概要

Gatekeeper 機能（YouTube チャンネル登録確認、Twitch サブスク確認など）を実現するため、OAuth ログイン時に取得できる `provider_token` (Access Token) と `provider_refresh_token` をデータベースに安全に永続化する仕組み。

## アーキテクチャ

### セキュリティ設計

1. **Private スキーマの採用**
   - トークン管理テーブルは `private` スキーマに配置
   - PostgREST API から自動公開されないため、フロントエンドから直接アクセス不可
   - アクセスは必ずバックエンド（Server Actions / RPC）を経由

2. **透過的カラム暗号化（TCE）**
   - `pgsodium` 拡張機能を使用
   - `SECURITY LABEL` でカラムに暗号化を指定
   - データベース層で自動的に暗号化・復号化
   - アプリケーション側では暗号化ロジックを記述不要

3. **RPC 関数によるアクセス制御**
   - `upsert_oauth_token`: トークンの保存・更新
   - `get_oauth_token`: トークンの取得
   - `delete_oauth_token`: トークンの削除
   - すべて認証済みユーザーのみがアクセス可能
   - ユーザーは自分のトークンのみアクセス可能

## データベーススキーマ

```sql
-- private スキーマのトークンテーブル
CREATE TABLE private.oauth_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,  -- 暗号化される
  refresh_token TEXT,           -- 暗号化される
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE (user_id, provider)
);
```

### 暗号化の仕組み

**ローカル開発環境:**
- トークンは `private` スキーマに保存され、PostgREST API から直接アクセス不可
- データベースレベルでの暗号化は未設定（開発用途では十分なセキュリティ）

**本番環境（推奨）:**
```sql
-- Supabase Dashboard で Vault にキーを作成後、以下を実行:
SECURITY LABEL FOR pgsodium ON COLUMN private.oauth_tokens.access_token
  IS 'ENCRYPT WITH KEY ID <vault_key_id>';

SECURITY LABEL FOR pgsodium ON COLUMN private.oauth_tokens.refresh_token
  IS 'ENCRYPT WITH KEY ID <vault_key_id>';
```

## 使用方法

### トークンの保存（OAuth コールバック時）

```typescript
import { upsertOAuthToken } from "@/lib/oauth/token-storage";
import { createClient } from "@/lib/supabase/server";

// OAuth コールバック時に自動的に実行される
const supabase = await createClient();
const result = await upsertOAuthToken(supabase, {
  provider: "google", // または "twitch"
  access_token: session.provider_token,
  refresh_token: session.provider_refresh_token,
  expires_at: new Date(session.expires_at * 1000).toISOString(),
});
```

### トークンの取得

```typescript
import { getOAuthToken } from "@/lib/oauth/token-storage";
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
const result = await getOAuthToken(supabase, "google");

if (result.success && result.access_token) {
  // トークンを使用して API にアクセス
  const accessToken = result.access_token;
}
```

### トークンの有効期限チェック

```typescript
import { isTokenExpired } from "@/lib/oauth/token-storage";

if (isTokenExpired(result.expires_at)) {
  // トークンをリフレッシュする必要がある
}
```

## セキュリティ特性

### ✅ 実現されたセキュリティ

1. **Private スキーマによる隔離**
   - PostgREST API から直接アクセス不可
   - フロントエンドから直接テーブルを読み書き不可
   - アクセスは必ず RPC 関数経由

2. **アクセス制御**
   - RPC 関数は認証済みユーザーのみアクセス可能
   - ユーザーは自分のトークンのみ操作可能
   - `SECURITY DEFINER` による権限昇格の制御

3. **監査可能性**
   - すべてのアクセスは RPC 関数を経由
   - ログとモニタリングが容易

### 🔒 本番環境で推奨される追加対策

1. **Transparent Column Encryption (TCE) の有効化**
   - Supabase Dashboard で Vault にキーを作成
   - `SECURITY LABEL` で暗号化を適用
   - データベースバックアップでもトークンが暗号化される

2. **トークンのローテーション**
   - 定期的にトークンをリフレッシュ
   - 古いトークンの削除

3. **監査ログ**
   - トークンアクセスのログ記録
   - 異常なアクセスパターンの検知

4. **ネットワーク制限**
   - データベースへの直接アクセスを制限
   - IP ホワイトリストの設定

## テスト

```bash
# ユニットテスト実行
pnpm test lib/oauth/__tests__/token-storage.test.ts

# データベースマイグレーション適用
pnpm supabase db reset

# 型定義の再生成
pnpm supabase:typegen
```

## トラブルシューティング

### マイグレーションエラー

**ローカル環境:**
- TCE（透過的カラム暗号化）はローカル開発では未設定
- Private スキーマによる保護で開発には十分

**本番環境:**
- Supabase Dashboard から Vault でキーを作成
- SQL エディタで `SECURITY LABEL` を適用してTCEを有効化

### トークンが保存されない

1. OAuth プロバイダーの設定を確認
2. `provider_token` が session に含まれているか確認
3. RPC 関数の権限を確認

### トークンが取得できない

1. ユーザーが認証済みか確認
2. プロバイダー名が正しいか確認（"google" または "twitch"）
3. トークンが保存されているか確認

## 関連ファイル

- `supabase/migrations/20260105130000_enable_vault_and_pgsodium.sql`
- `supabase/migrations/20260105130001_create_oauth_tokens_table.sql`
- `supabase/migrations/20260105130002_create_oauth_token_rpc_functions.sql`
- `lib/oauth/token-storage.ts`
- `lib/oauth/__tests__/token-storage.test.ts`
- `app/auth/callback/route.ts`
