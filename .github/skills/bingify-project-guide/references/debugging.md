# Debugging Guide

Bingifyプロジェクトのデバッグ方法をカバーします。

## ローカル環境へのアクセス

### Supabase Studio

ローカル開発中、Supabase Studio (Web UI) でデータベースおよび認証状態を確認できます：

```bash
pnpm local:setup  # Supabase起動
```

**アクセスURL**:

- **Supabase Studio**: [http://localhost:54323](http://localhost:54323)
- **PostgreSQL**: `localhost:54322`

**確認可能項目**:

- 認証ユーザー情報
- データベーステーブルの内容
- OAuth トークン情報

### Mailpit

メール送信のテストにはMailpitを使用します：

- **Mailpit UI**: [http://localhost:54324](http://localhost:54324)

**確認可能項目**:

- マジックリンク送信テスト
- メール内容の確認
- リダイレクトリンクのクリック

## デバッグツール

### Next.js devtools MCP

`pnpm dev` 実行時に Next.js devtools MCP から以下が確認できます：

- **Server Actions ログ**: Server Actions 実行時のログ・エラー
- **Build 状態**: 型チェック、ビルドエラー
- **ランタイムエラー**: クライアント/サーバー側エラー

### ブラウザー開発者ツール

**Application タブ**:

- **Cookies**: Supabase セッションクッキーの確認
  - `sb-${PROJECT_ID}-auth-token`: セッショントークン
  - 有効期限、HttpOnly フラグなどを確認

**Console タブ**:

- クライアント側エラーメッセージ
- `console.log()` / `console.error()` 出力

**Network タブ**:

- API リクエスト/レスポンス確認
- OAuth リダイレクトフロー追跡

## セッション検証

ログイン後のセッション状態は以下で確認：

```typescript
// クライアント側
const supabase = createClient();
const { data: { user }, error } = await supabase.auth.getUser();
if (user) console.log("Logged in as:", user.email);

// サーバー側(Server Actions)
const supabase = await createClient();
const { data: { user }, error } = await supabase.auth.getUser();
```

## よくあるデバッグシナリオ

### 認証エラーのトレース

1. ブラウザーの Network タブで `/auth/callback` または `/auth/[provider]/callback` を確認
2. Query parameters (`code`, `error` など) を確認
3. Next.js devtools MCP でサーバー側ログを確認
4. Supabase Studio でユーザー情報が作成されているか確認

### メール送信失敗

1. Mailpit UI ([http://localhost:54324](http://localhost:54324)) でメール受信を確認
2. メール内のリンク形式を確認
3. `pnpm dev` ログで `signInWithOtp()` エラーを確認

### セッション保持の問題

1. ブラウザーの Cookie が設定されているか確認（Application タブ）
2. Cookie の HttpOnly、Secure フラグを確認
3. Supabase Studio でセッション有効期限を確認

### Server Actions のエラー

1. Next.js devtools MCP でサーバー側ログを確認
2. Server Action の型チェック: `pnpm type-check` で実行
3. `pnpm dev` 出力で実行時エラーを確認

## ログ出力

### 開発ログ

```bash
pnpm dev
```

出力に以下が表示されます：

- `Next.js ビルド情報`
- `Server Actions エラー`
- `console.log()` / `console.error()` 出力

### 型チェック

```bash
pnpm type-check
```

TypeScript エラーを確認。

### テスト実行

```bash
# 1回実行モード（コーディングエージェント用）
pnpm test -- --run --reporter=verbose

# ウォッチモード（開発中の連続テスト）
pnpm test -- --watch --reporter=verbose
```

テスト失敗のスタックトレースを確認。
