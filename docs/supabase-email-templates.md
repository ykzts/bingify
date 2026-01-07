# Supabase メールテンプレートのカスタマイズ

このドキュメントでは、Bingifyで実装されたバイリンガル（日本語/英語）メールテンプレートの概要とテスト方法を説明します。

## 概要

ユーザーの言語設定（ロケール）に基づいて、適切な言語でメールを自動送信する機能を実装しました。

### 対応メール

1. **confirmation.html** - ユーザー登録確認メール
2. **recovery.html** - パスワードリセットメール
3. **email_change.html** - メールアドレス変更確認メール
4. **invite.html** - ユーザー招待メール
5. **password_changed_notification.html** - パスワード変更通知メール

## 言語設定の仕組み

### Magic Link（メールログイン）

ユーザーが `/ja/login` または `/en/login` からMagic Linkでログインする際、`signInWithOtp` に `options.data.language` パラメータを渡すことで、ユーザーメタデータに言語設定が保存されます。

```typescript
await supabase.auth.signInWithOtp({
  email,
  options: {
    data: {
      language: locale, // "ja" または "en"
    },
    emailRedirectTo: buildOAuthCallbackUrl(redirect ?? undefined),
  },
});
```

### OAuth（Google、Twitch）

OAuth認証では、以下の流れで言語設定を保存します：

1. ログインページでロケールをsessionStorageに保存（将来の拡張用）
2. OAuth認証後、`/auth/callback` でリファラーURLからロケールを抽出
3. `updateUser` を使用してユーザーメタデータに言語設定を追加

```typescript
const { error: updateError } = await supabase.auth.updateUser({
  data: {
    language: locale,
  },
});
```

## メールテンプレートの構造

### Go テンプレート構文

Supabaseは Go Template Language を使用してメールをレンダリングします。

```html
{{if eq .Data.language "ja"}}
  <h1>Bingifyへようこそ</h1>
  <p>アカウント登録ありがとうございます。</p>
{{else}}
  <h1>Welcome to Bingify</h1>
  <p>Thank you for signing up.</p>
{{end}}
```

### 利用可能な変数

- `{{ .ConfirmationURL }}` - 確認用URL（ボタンリンク）
- `{{ .Token }}` - OTPコード（6桁）
- `{{ .SiteURL }}` - サイトのベースURL
- `{{ .Data.language }}` - ユーザーの言語設定

### デザイン特徴

- **カラースキーム**: Purple (`#a78bfa`) - Bingifyブランドカラー
- **レスポンシブ**: モバイルデバイス対応
- **フォント**: 日本語に最適化（Hiragino Sans、Meiryo等）
- **アクセシビリティ**: 十分なコントラスト比とフォントサイズ

## ローカルでのテスト方法

### 1. Supabaseローカル環境の起動

```bash
pnpm supabase:start
```

### 2. Inbucketでメールを確認

Supabaseはローカル環境でInbucketを使用してメールをキャプチャします。

- URL: http://localhost:54324
- すべての送信メールがここに表示されます

### 3. テストシナリオ

#### シナリオ A: 日本語メールのテスト

1. ブラウザで http://localhost:3000/ja/login にアクセス
2. メールアドレスを入力してMagic Linkを送信
3. Inbucket (http://localhost:54324) で日本語メールを確認

#### シナリオ B: 英語メールのテスト

1. ブラウザで http://localhost:3000/en/login にアクセス
2. メールアドレスを入力してMagic Linkを送信
3. Inbucket (http://localhost:54324) で英語メールを確認

#### シナリオ C: OAuth後の言語設定

1. `/ja/login` でGoogle/Twitchログイン
2. 初回ログイン後、パスワードリセットを試行
3. Inbucketで日本語のパスワードリセットメールを確認

#### シナリオ D: OTPコードフォールバック

1. メールのリンクをクリックせず、OTPコードをコピー
2. ログインページでコードを入力して認証成功を確認

## 設定ファイル

### supabase/config.toml

```toml
[auth.email.template.confirmation]
subject = "メールアドレスの確認 / Confirm Your Email"
content_path = "./supabase/templates/confirmation.html"

[auth.email.template.invite]
subject = "Bingifyへの招待 / Invitation to Bingify"
content_path = "./supabase/templates/invite.html"

[auth.email.template.recovery]
subject = "パスワードのリセット / Reset Your Password"
content_path = "./supabase/templates/recovery.html"

[auth.email.template.email_change]
subject = "メールアドレスの変更確認 / Confirm Email Change"
content_path = "./supabase/templates/email_change.html"

[auth.email.notification.password_changed]
enabled = true
subject = "パスワードが変更されました / Password Changed"
content_path = "./supabase/templates/password_changed_notification.html"
```

## トラブルシューティング

### メールが表示されない

1. Supabaseが正常に起動しているか確認
   ```bash
   pnpm supabase:status
   ```

2. Inbucketが有効になっているか確認
   ```bash
   # config.toml の [inbucket] セクション
   enabled = true
   port = 54324
   ```

### 言語が正しく設定されない

1. ブラウザのDevToolsでNetwork タブを開く
2. `signInWithOtp` または `updateUser` リクエストのペイロードを確認
3. `data.language` が正しく設定されているか確認

### テンプレートが読み込まれない

1. ファイルパスが正しいか確認（`./supabase/templates/` から相対パス）
2. HTMLファイルの構文エラーがないか確認
3. Supabaseを再起動
   ```bash
   pnpm supabase:stop
   pnpm supabase:start
   ```

## 本番環境への適用

### Supabase Cloud Console での設定

1. Supabase Dashboard にアクセス
2. Authentication > Email Templates を開く
3. 各テンプレートタイプで "Edit" をクリック
4. Subject と HTML コンテンツを `supabase/templates/` のファイルから貼り付け
5. "Save" をクリック

### 注意事項

- テンプレート変更は即座に反映されます
- 変更前に必ずバックアップを取ってください
- 本番環境でテストする前に、ステージング環境で検証してください

## 参考資料

- [Supabase - Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase - Customizing emails by language](https://supabase.com/docs/guides/troubleshooting/customizing-emails-by-language)
- [Go Template Language](https://pkg.go.dev/text/template)

## 今後の拡張案

- [ ] 追加言語のサポート（韓国語、中国語等）
- [ ] ダークモードテンプレート
- [ ] HTMLメール + プレーンテキストメールの両対応
- [ ] ユーザーの言語設定を管理画面から変更可能に
