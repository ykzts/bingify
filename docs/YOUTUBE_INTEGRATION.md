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

### 4. テスト

YouTube API連携の包括的なテスト (`lib/__tests__/youtube.test.ts`):

- 登録済みの場合
- 未登録の場合
- パラメータ不足
- APIエラー
- ネットワークエラー
- パラメータ検証

## 実装が必要な残りの作業

### YouTubeトークン取得のためのOAuthフロー

現在の実装ではバックエンドロジックが整っていますが、YouTubeアクセストークンを取得するためのクライアント側OAuthフローが必要です。実装手順は以下の通りです:

#### 1. Google OAuthの設定

既存のSupabase OAuth設定を使用します（`SUPABASE_AUTH_EXTERNAL_GOOGLE_*`環境変数）。

#### 2. クライアント側のアクセストークン取得

Supabaseセッションから既存のGoogle OAuthトークンを取得:

```tsx
// app/[locale]/spaces/[id]/_components/youtube-verification-button.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export function YouTubeVerificationButton({
  onTokenReceived,
}: {
  onTokenReceived: (token: string) => void;
}) {
  const t = useTranslations("UserSpace");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.provider_token) {
        onTokenReceived(session.provider_token);
      } else {
        // Google OAuth でログインする必要がある
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            scopes: "https://www.googleapis.com/auth/youtube.readonly",
            redirectTo: window.location.href,
          },
        });
      }
    } catch (error) {
      console.error("YouTube verification error:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <button onClick={handleVerify} disabled={isVerifying} className="...">
      {isVerifying ? t("verifyingYouTube") : t("verifyYouTubeButton")}
    </button>
  );
}
```

#### 3. スペース参加との統合

`space-participation.tsx`を更新:

1. YouTube確認が必要な場合にYouTube確認ボタンを表示
2. 確認後、アクセストークンを使用して`joinSpace()`を呼び出し
3. 確認フローのエラーを処理

実装例:

```tsx
const handleYouTubeVerify = async (token: string) => {
  setIsJoining(true);
  const result = await joinSpace(spaceId, token);
  if (result.success) {
    setHasJoined(true);
    router.refresh();
  } else {
    setError(result.errorKey ? t(result.errorKey) : t("errorJoinFailed"));
  }
  setIsJoining(false);
};

// レンダリング内
{
  spaceInfo.gatekeeper_rules?.youtube?.required && !hasJoined && (
    <YouTubeVerificationButton onTokenReceived={handleYouTubeVerify} />
  );
}
```

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

3. **確認付きでの参加** (OAuth実装後)
   - "YouTubeアカウントを確認する"ボタンをクリック
   - Googleで認証
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
