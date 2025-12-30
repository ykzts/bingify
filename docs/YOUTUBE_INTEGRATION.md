# YouTube連携による参加条件判定 - 実装概要

## 概要

この実装は、ビンゴスペースへの参加条件としてYouTubeチャンネル登録の確認機能を追加します。スペースオーナーはYouTubeチャンネルIDを指定でき、参加者はそのチャンネルに登録していることを確認してからスペースに参加できます。

## 実装済みの内容

### 1. バックエンド基盤

#### データベーススキーマ (`supabase/migrations/20251228040000_add_gatekeeper_rules.sql`)

- `spaces`テーブルに`gatekeeper_rules` JSONB列を追加
- YouTube要件の構造: `{"youtube": {"channelId": "UCxxxxx", "required": true}}`
- NULL = 参加条件なし

#### YouTube API連携 (`lib/youtube.ts`)

- `@googleapis/youtube`公式ライブラリを使用
- `checkSubscriptionStatus()`関数でYouTubeチャンネル登録を確認
- YouTube Data API v3のsubscriptionsエンドポイントを使用
- `{ isSubscribed: boolean, error?: string }`を返却
- APIエラーの適切なハンドリング

#### サーバーアクション (`app/[locale]/spaces/actions.ts`)

- `SpaceInfo`インターフェースに`gatekeeper_rules`を追加
- `joinSpace()`アクションで任意の`youtubeAccessToken`パラメータを受け付け
- `verifyYouTubeSubscription()`ヘルパー関数を追加
- 参加者のINSERT前に登録状態を検証

#### ダッシュボードアクション (`app/[locale]/dashboard/actions.ts`)

- `createSpace()`でフォームデータから`youtube_channel_id`を受け取り
- 新規スペース作成時に`gatekeeper_rules`にYouTubeチャンネルIDを保存

### 2. ユーザーインターフェース

#### スペース参加コンポーネント (`app/[locale]/spaces/[id]/_components/space-participation.tsx`)

- YouTube確認が必要な場合に青色の情報バナーを表示
- 確認失敗時の適切なエラーメッセージ表示
- **スマートボタン統合**: YouTubeトークンの有無に応じて「YouTubeを確認して参加」または「参加する」を表示
- **OAuth自動処理**: トークンがない場合、ボタンクリックでGoogle OAuth（YouTube readonly scope）を実行
- **シームレスなUX**: OAuth後は同じページに戻り、ボタンが自動的に「参加する」に切り替わる

#### スペース作成フォーム (`app/[locale]/dashboard/create-space-form.tsx`)

- YouTubeチャンネルID入力欄を追加（オプション）
- 機能説明のヘルプテキスト
- createSpaceアクションと統合

### 3. 翻訳

英語と日本語の翻訳キーを追加:

- `errorYouTubeVerificationRequired`
- `errorYouTubeNotSubscribed`
- `errorYouTubeVerificationFailed`
- `verifyYouTubeButton`
- `verifyingYouTube`
- `verifyAndJoinButton` - スマートボタン用: "Verify & Join" / "YouTubeを確認して参加"
- `verifyingAndJoining` - スマートボタン用: "Verifying..." / "確認中..."

### 4. テスト

YouTube API連携の包括的なテスト (`lib/__tests__/youtube.test.ts`):

- 登録済みの場合
- 未登録の場合
- パラメータ不足
- APIエラー
- ネットワークエラー
- パラメータ検証

## 実装のテスト

### 手動テスト手順

1. **YouTube要件付きスペースの作成**
   - ダッシュボードに移動
   - 新規スペースを作成
   - YouTubeチャンネルIDを入力（例: `UCxxxxxxxxxxxxxx`）
   - スペースを作成

2. **確認なしでの参加試行**
   - 別のユーザーとしてスペースに移動
   - 参加を試行
   - エラーが表示される: "YouTubeアカウントの確認が必要です"

3. **確認付きでの参加**
   - "YouTubeを確認して参加"ボタンをクリック
   - Googleで認証（YouTube readonly scopeで）
   - 認証後、自動的にスペースページに戻る
   - ボタンが"参加する"に変わる
   - ボタンをクリックして参加
   - 登録済み: スペースに正常に参加
   - 未登録: エラーメッセージを表示

### データベース確認

```sql
-- YouTube要件付きスペースの確認
SELECT id, share_key, gatekeeper_rules
FROM spaces
WHERE gatekeeper_rules->>'youtube' IS NOT NULL;

-- 参加者の確認
SELECT * FROM participants WHERE space_id = '<space_id>';
```

## セキュリティに関する考慮事項

1. **アクセストークンの扱い**
   - アクセストークンはデータベースに保存しない
   - トークンは検証時のみ一時的に使用
   - トークンはサーバーアクション経由で渡す（URLには公開しない）

2. **APIレート制限**
   - YouTube Data APIにはクォータ制限がある
   - 短時間の登録ステータスのキャッシュを検討
   - 一時的な障害に対するリトライロジックの実装

3. **チャンネルIDの検証**
   - チャンネルID形式の入力検証を追加済み
   - 保存前にチャンネルの存在を確認することを推奨

## 今後の機能拡張

1. **メンバーシップレベルの確認**
   - チャンネルメンバーシップの確認まで拡張（`members` API アクセスが必要）
   - メンバーシップ階層の要件を追加

2. **複数チャンネルのサポート**
   - 複数チャンネルのいずれかへの登録を要求
   - コラボレーション配信に便利

3. **登録ステータスのキャッシュ**
   - 認証済みユーザーの登録ステータスをキャッシュ
   - API呼び出しを削減し、パフォーマンスを向上

4. **管理インターフェース**
   - スペース管理画面で登録要件を表示
   - 作成後の編集を許可

## 参考資料

- [YouTube Data API v3 ドキュメント](https://developers.google.com/youtube/v3)
- [YouTube Subscriptions API](https://developers.google.com/youtube/v3/docs/subscriptions)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [@googleapis/youtube NPMパッケージ](https://www.npmjs.com/package/@googleapis/youtube)
