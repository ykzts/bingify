# OAuth プロバイダー設定ガイド

## Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新規プロジェクトを作成するか、既存のプロジェクトを選択
3. 「Google+ API」を有効化
4. **認証情報** → **認証情報を作成** → **OAuth 2.0 クライアント ID** を選択
5. **ウェブアプリケーション** を選択
6. 認可されたリダイレクト URI を追加：
   - `http://127.0.0.1:3000/auth/callback?provider=google` (Next.js 開発サーバー)
   - `http://127.0.0.1:54321/auth/v1/callback?provider=google` (Supabase API)
7. `クライアント ID` と `クライアント シークレット` を `.env.local` にコピー：
   ```
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your_client_id
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your_client_secret
   ```

## Twitch OAuth

1. [Twitch Developer Console](https://dev.twitch.tv/console/apps) にアクセス
2. **+ アプリケーションを作成** をクリック
3. アプリケーション名を入力し、利用規約に同意
4. OAuth Client Type として **OAuth 2.0 Connect** を選択
5. **Redirect URLs** に以下を追加：
   - `http://127.0.0.1:3000/auth/callback?provider=twitch`
   - `http://127.0.0.1:54321/auth/v1/callback?provider=twitch`
6. 保存して新しいクライアント シークレットを生成
7. `クライアント ID` と `クライアント シークレット` を `.env.local` にコピー：
   ```
   SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID=your_client_id
   SUPABASE_AUTH_EXTERNAL_TWITCH_SECRET=your_client_secret
   ```

## ローカル開発環境での実行

認証情報を設定したら：

```bash
# .env.local.example から .env.local を作成
cp .env.local.example .env.local

# OAuth 認証情報を .env.local に追加

# Supabase を起動
pnpm supabase:start

# Next.js 開発サーバーを起動
pnpm dev
```

OAuth sign-in ボタンが機能するようになります。ユーザーはプロバイダーにリダイレクトされて認証され、その後アプリに戻ります。
