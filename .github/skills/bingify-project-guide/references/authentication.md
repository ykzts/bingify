# Authentication & Session Management

Bingifyの認証実装とセッション管理をカバーします。

## 概要

BingifyはSupabase Auth を使用し、以下の認証方式に対応：

- **マジックリンク認証**: メール送信 → メール内のリンククリック → 自動ログイン
- **OAuth認証**: Google、Twitchなどのプロバイダーによる認証

認証は [proxy.ts](../../../../proxy.ts) のミドルウェア層と [lib/middleware/auth-handlers.ts](../../../../lib/middleware/auth-handlers.ts) で保護されます。

## ログインフロー

### 1. ログインページ

[app/[locale]/login/page.tsx](../../../../app/%5Blocale%5D/login/page.tsx) は以下を処理：

- 既に認証済みなら `/dashboard` へリダイレクト
- 未認証ユーザーに [LoginForm](../../../../app/%5Blocale%5D/login/_components/login-form.tsx) を表示
- メールアドレス入力フィールドと OAuth プロバイダーボタンを表示

### 2. マジックリンク認証フロー

**メール送信処理**:

```tsx
// app/[locale]/login/_components/login-form.tsx
"use client";

const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    data: {
      language: locale,
    },
    emailRedirectTo: buildAuthCallbackUrl(redirect ?? undefined),
  },
});
```

**フロー**:

1. ユーザーがメールアドレスを入力して「Send Magic Link」をクリック
2. `supabase.auth.signInWithOtp()` でSupabaseからメール送信リクエスト
3. ユーザーのメールボックスにマジックリンク付きメール到着
4. ユーザーがメール内のマジックリンク `/auth/callback?code=...` をクリック
5. [app/auth/callback/route.ts](../../../../app/auth/callback/route.ts) で `exchangeCodeForSession()` を実行
6. セッション確立後、`redirect` パラメータで指定した遷移先へリダイレクト

**ローカル開発での確認**:

1. [http://localhost:3000/login](http://localhost:3000/login) にアクセス
2. メールアドレスを入力してマジックリンク送信
3. Mailpit UI ([http://localhost:54324](http://localhost:54324)) でメール確認
4. メール内のマジックリンククリックでログイン完了

### 3. OAuth認証フロー (例：Google OAuth)

```tsx
// app/[locale]/login/_components/login-form.tsx
"use client";

const handleOAuthLogin = async (provider: string) => {
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider as "google" | "twitch",
    options: {
      redirectTo: buildOAuthCallbackUrl(provider, redirect),
      scopes: getScopesForProvider(provider, systemSettings),
    },
  });
};
```

**フロー**:

1. ユーザーが OAuth プロバイダー (Google、Twitchなど) のボタンをクリック
2. `supabase.auth.signInWithOAuth()` でプロバイダーのログインページへリダイレクト
3. ユーザーが認可を完了
4. プロバイダーが `auth_code` とともに `/auth/[provider]/callback` へリダイレクト

### 4. コールバック処理 (コード→セッション交換)

**メール OTP コールバック** (`/auth/callback`):

- [app/auth/callback/route.ts](../../../../app/auth/callback/route.ts) で処理
- `code` パラメータを受け取り `exchangeCodeForSession()` を実行
- 最大2回まで再試行（ネットワークエラー時）
- `redirect` パラメータで指定した遷移先へリダイレクト

**OAuth コールバック** (`/auth/[provider]/callback`):

- [app/auth/[provider]/callback/route.ts](../../../../app/auth/%5Bprovider%5D/callback/route.ts) で処理
- 処理フロー：
  1. **プロバイダー検証**: `isValidOAuthProvider()` でプロバイダーを検証
  2. **コード検証**: `code` パラメータが存在するか確認
  3. **セッション交換**: `exchangeCodeWithRetry()` でコードをセッションに交換（リトライロジック付き）
  4. **セッション取得**: `supabase.auth.getSession()` でセッション情報を取得
  5. **トークン保存**: `upsertOAuthToken()` でOAuthトークン（`provider_token`, `provider_refresh_token`）をデータベースに保存。暗号化はSupabase Vault側で自動処理
  6. **言語メタデータ設定**: Referer から locale を抽出、未設定の場合 `supabase.auth.updateUser({ data: { language: locale } })` で設定
  7. **リダイレクト**: `login_success=true` パラメータ付きで最終目的地へリダイレクト

**エラーハンドリング**:

- 無効なプロバイダー/コード不在: `/login?error=auth_failed` へリダイレクト
- トークン交換失敗: `/login?error=auth_failed` へリダイレクト
- セッション取得失敗: `/login?error=auth_failed` へリダイレクト
- トークン保存失敗: ログに記録するが認証は進行（トークン保存失敗は致命的ではない）

## ミドルウェア保護

### 実装位置

[proxy.ts](../../../../proxy.ts) が次の順序で検査を実行：

1. **Basic Auth**: `checkBasicAuth()` （管理画面など）
2. **ダッシュボード保護**: `handleAuthenticatedRoute()` - `/dashboard/*` ルート
3. **管理画面保護**: `handleAdminAuth()` - `/admin/*` ルート
4. **Share Key**: `handleShareKeyRoute()` - `/@key` パターン
5. **スクリーン表示**: `i18n` をスキップ - `/screen` ルート
6. **多言語対応**: `intlMiddleware()` - その他のルート

Auth-specific handlers は [lib/middleware/auth-handlers.ts](../../../../lib/middleware/auth-handlers.ts) に実装。

### 保護ルート

**ダッシュボード保護** (`/dashboard/*`):

- `handleAuthenticatedRoute()` で認証ユーザーのみ許可
- 未認証の場合、ログインページへリダイレクト（`redirect` クエリパラメータで元のパスを指定）
- Referer から locale を自動抽出して正しいログインページにリダイレクト

**管理画面保護** (`/admin/*`):

- `handleAdminAuth()` でAdminロールのみ許可
- 未認証の場合、ログインページへリダイレクト
- 認証済みだが管理者ロールがない場合、ホームページへリダイレクト
- `profiles` テーブルの `role` フィールドで権限を判定
