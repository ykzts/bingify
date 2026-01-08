# YouTube チャンネルID 自動解決機能

## 概要

スペースのゲートキーパー設定でYouTubeチャンネルを指定する際、チャンネルID（`UC`で始まる24文字の文字列）だけでなく、ユーザーにとって馴染みのある以下の形式からも自動的にチャンネルIDを解決できるようになりました。

## サポートされる入力形式

### 1. チャンネルID（従来通り）
```
UCxxxxxxxxxxxxxxxxxxxxxx
```

### 2. ハンドル形式
```
@GoogleDevelopers
```

### 3. 各種URL形式

#### ハンドルURL
```
https://www.youtube.com/@GoogleDevelopers
https://youtube.com/@GoogleDevelopers
```

#### チャンネルIDURL
```
https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx
```

#### カスタムURL（レガシー）
```
https://www.youtube.com/c/GoogleDevelopers
```

#### ユーザーURL（レガシー）
```
https://www.youtube.com/user/GoogleDevelopers
```

## 使い方

### スペース設定画面での使用

1. スペース設定画面で「ゲートキーパー」セクションに移動
2. 「ソーシャル連携」タブを選択
3. プラットフォームで「YouTube」を選択
4. 要件レベルで「チャンネル登録者のみ」または「メンバーのみ」を選択
5. 「YouTubeチャンネルID」フィールドに以下のいずれかを入力：
   - チャンネルID
   - ハンドル（`@username`）
   - YouTubeチャンネルのURL

入力後、自動的にチャンネルIDへの変換が試行されます。変換中はローディングインジケーターが表示されます。

## 技術的な実装

### アーキテクチャ

```
UI Component (space-settings-form.tsx)
    ↓ (debounced input)
Server Action (youtube-lookup-actions.ts)
    ↓
YouTube Resolution Logic (lib/youtube.ts)
    ↓
YouTube Data API v3 (channels.list)
    ↓
Channel ID
```

### 主要なファイル

- **`lib/youtube.ts`**: チャンネルID解決ロジック
  - `resolveYouTubeChannelId()`: メイン解決関数
  - `parseYouTubeInput()`: 入力値のパース
  - `resolveByHandle()`: ハンドルからの解決
  - `resolveByUsername()`: レガシーユーザー名からの解決

- **`app/[locale]/dashboard/spaces/[id]/_lib/youtube-lookup-actions.ts`**: Server Action
  - UIから呼び出されるサーバーサイド関数

- **`app/[locale]/dashboard/spaces/[id]/_components/space-settings-form.tsx`**: UI実装
  - リアルタイム変換機能
  - デバウンス処理（800ms）
  - ローディング状態とエラー表示

### YouTube Data API v3の使用

この機能は YouTube Data API v3 の `channels.list` エンドポイントを使用します：

- **ハンドル解決**: `forHandle` パラメータ
- **レガシーユーザー名解決**: `forUsername` パラメータ

## セットアップ

### OAuth認証の設定

YouTube チャンネル解決機能を使用するには、Google OAuth認証が必要です。

1. スペース管理者はGoogleアカウントでログイン
2. YouTube Data API v3へのアクセス許可を承認
3. システムが自動的にOAuthトークンを管理

### OAuth設定方法

詳細な設定手順については、`docs/OAUTH_SETUP.md` を参照してください。

- Google Cloud Console でOAuthクライアントIDを作成
- Supabase の認証設定にクライアント情報を追加
- YouTubeスコープを有効化

### 必要なスコープ

- `https://www.googleapis.com/auth/youtube.readonly` - チャンネル情報の読み取り

## テスト

実装には包括的なテストが含まれています：

```bash
pnpm test lib/__tests__/youtube.test.ts
```

テストカバレッジ：
- ✅ チャンネルIDの直接入力
- ✅ ハンドル形式の解決
- ✅ 各種URL形式の解決
- ✅ エラーハンドリング
- ✅ 入力値のトリミング

## エラーハンドリング

以下のエラーケースが適切に処理されます：

- **空の入力値**: 「入力値が空です」
- **APIキー未設定**: 「YouTube APIキーが設定されていません」
- **チャンネルが見つからない**: 「ハンドル '@username' に対応するチャンネルが見つかりませんでした」
- **無効な入力形式**: 「入力形式が不正です。チャンネルID、ハンドル（@username）、またはYouTube URLを入力してください」
- **APIエラー**: 「YouTube API エラー: [エラーメッセージ]」

## パフォーマンス

- **デバウンス処理**: 入力から800ms後に変換を実行（過剰なAPI呼び出しを防止）
- **キャッシュ**: すでにチャンネルIDの場合はAPI呼び出しをスキップ
- **正規表現の最適化**: 頻繁に使用される正規表現はトップレベルで定義

## 今後の改善案

- [ ] チャンネル情報（タイトル、サムネイル）のプレビュー表示
- [ ] 解決結果のクライアントサイドキャッシュ
- [ ] バッチ解決（複数チャンネルの一括変換）
- [ ] ショートURL（`youtu.be`）のサポート

## 関連ドキュメント

- [YouTube Data API v3 Documentation](https://developers.google.com/youtube/v3/docs)
- [Channels: list API Reference](https://developers.google.com/youtube/v3/docs/channels/list)
