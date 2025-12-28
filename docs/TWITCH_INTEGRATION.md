# Twitch連携による参加条件判定 - 実装概要

## 概要

この実装は、ビンゴスペースへの参加条件としてTwitchフォロー状態またはサブスクリプション状態の確認機能を追加します。スペースオーナーは配信者IDを指定でき、参加者はその配信者をフォローしているか、サブスクライバーであることを確認してからスペースに参加できます。

## 実装済みの内容

### 1. バックエンド基盤

#### データベーススキーマ

既存の`gatekeeper_rules` JSONB列を使用し、Twitch要件を追加:

```json
{
  "twitch": {
    "broadcasterId": "12345",
    "requireFollow": true,
    "requireSub": false
  }
}
```

- `broadcasterId`: Twitch配信者ID（必須）
- `requireFollow`: フォロー要件（オプション、デフォルト: false）
- `requireSub`: サブスク要件（オプション、デフォルト: false）

#### Twitch API連携 (`lib/twitch.ts`)

- Twitch Helix APIを使用した2つの検証関数:
  - `checkFollowStatus()`: フォロー状態を確認
  - `checkSubStatus()`: サブスクリプション状態を確認
- 環境変数`NEXT_PUBLIC_TWITCH_CLIENT_ID`を使用
- 各関数は `{ isFollowing/isSubscribed: boolean, error?: string }` を返却
- 共通のバリデーション関数でコード重複を削減

##### API エンドポイント

1. **フォロー確認**
   - エンドポイント: `https://api.twitch.tv/helix/channels/followers`
   - パラメータ: `user_id`, `broadcaster_id`
   - 戻り値: フォローしている場合は配列に1件以上のデータ

2. **サブスク確認**
   - エンドポイント: `https://api.twitch.tv/helix/subscriptions/user`
   - パラメータ: `user_id`, `broadcaster_id`
   - 戻り値: サブスクしている場合は配列に1件以上のデータ（404=未登録）

#### サーバーアクション (`app/[locale]/spaces/actions.ts`)

- `GatekeeperRules`インターフェースに`twitch`プロパティを追加
- `joinSpace()`アクションで以下のパラメータを受け付け:
  - `twitchAccessToken`: Twitchアクセストークン（オプション）
  - `twitchUserId`: TwitchユーザーID（オプション）
- `verifyTwitchRequirements()`ヘルパー関数を追加:
  - `requireFollow`がtrueの場合、フォロー状態を確認
  - `requireSub`がtrueの場合、サブスクリプション状態を確認
  - いずれかの検証が失敗した場合、適切なエラーを返す
- 認知的複雑性を削減するために`verifyGatekeeperRules()`でリファクタリング

### 2. ユーザーインターフェース

#### スペース参加コンポーネント (`app/[locale]/spaces/[id]/_components/space-participation.tsx`)

- Twitch確認が必要な場合に紫色の情報バナーを表示
- 確認失敗時の適切なエラーメッセージ表示

### 3. 翻訳

英語と日本語の翻訳キーを追加:

- `errorTwitchVerificationRequired`: Twitch確認が必要
- `errorTwitchNotFollowing`: フォローが必要
- `errorTwitchNotSubscribed`: サブスクが必要
- `errorTwitchVerificationFailed`: 確認に失敗
- `verifyTwitchButton`: Twitch確認ボタン
- `verifyingTwitch`: 確認中

### 4. テスト

Twitch API連携の包括的なテスト (`lib/__tests__/twitch.test.ts`):

#### checkFollowStatus のテスト

- フォロー済みの場合
- 未フォローの場合
- パラメータ不足（アクセストークン、ユーザーID、配信者ID）
- クライアントID未設定
- APIエラー（401など）
- ネットワークエラー

#### checkSubStatus のテスト

- サブスク済みの場合
- 未サブスクの場合（404レスポンス）
- データが空の場合
- パラメータ不足
- クライアントID未設定
- APIエラー（404以外）
- ネットワークエラー

### 5. 環境変数

`.env.local.example`に以下を追加:

```env
# Twitch API設定
NEXT_PUBLIC_TWITCH_CLIENT_ID=
```

## 実装が必要な残りの作業

### Twitchトークン取得のためのOAuthフロー

現在の実装ではバックエンドロジックが整っていますが、TwitchアクセストークンとユーザーIDを取得するためのクライアント側OAuthフローが必要です。

#### 1. Twitch OAuthの設定

既存のSupabase OAuth設定を使用します（`SUPABASE_AUTH_EXTERNAL_TWITCH_*`環境変数）。

#### 2. クライアント側のアクセストークン取得

Supabaseセッションから既存のTwitch OAuthトークンを取得:

```tsx
// app/[locale]/spaces/[id]/_components/twitch-verification-button.tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export function TwitchVerificationButton({
  onTokenReceived,
}: {
  onTokenReceived: (token: string, userId: string) => void;
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

      if (session?.provider_token && session?.user?.user_metadata?.provider_id) {
        // Twitchでログイン済み
        onTokenReceived(
          session.provider_token,
          session.user.user_metadata.provider_id
        );
      } else {
        // Twitch OAuth でログインする必要がある
        await supabase.auth.signInWithOAuth({
          provider: "twitch",
          options: {
            scopes: "user:read:follows user:read:subscriptions",
            redirectTo: window.location.href,
          },
        });
      }
    } catch (error) {
      console.error("Twitch verification error:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <button onClick={handleVerify} disabled={isVerifying} className="...">
      {isVerifying ? t("verifyingTwitch") : t("verifyTwitchButton")}
    </button>
  );
}
```

#### 3. スペース参加との統合

`space-participation.tsx`を更新:

1. Twitch確認が必要な場合にTwitch確認ボタンを表示
2. 確認後、アクセストークンとユーザーIDを使用して`joinSpace()`を呼び出し
3. 確認フローのエラーを処理

実装例:

```tsx
const handleTwitchVerify = async (token: string, userId: string) => {
  setIsJoining(true);
  const result = await joinSpace(
    spaceId,
    undefined, // youtubeAccessToken
    token, // twitchAccessToken
    userId // twitchUserId
  );
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
  spaceInfo.gatekeeper_rules?.twitch &&
    (spaceInfo.gatekeeper_rules.twitch.requireFollow ||
      spaceInfo.gatekeeper_rules.twitch.requireSub) &&
    !hasJoined && <TwitchVerificationButton onTokenReceived={handleTwitchVerify} />;
}
```

### スペース作成フォームへの追加

`create-space-form.tsx`に以下を追加:

1. Twitch配信者ID入力フィールド
2. フォロー要件のチェックボックス
3. サブスク要件のチェックボックス
4. 機能説明のヘルプテキスト

```tsx
// フォームフィールド例
<div>
  <label>Twitch配信者ID（オプション）</label>
  <input
    type="text"
    name="twitch_broadcaster_id"
    placeholder="12345"
  />
</div>

<div>
  <label>
    <input type="checkbox" name="twitch_require_follow" />
    フォローを必須とする
  </label>
</div>

<div>
  <label>
    <input type="checkbox" name="twitch_require_sub" />
    サブスクライバーを必須とする
  </label>
</div>
```

`dashboard/actions.ts`で`gatekeeper_rules`に保存:

```typescript
const twitchBroadcasterId = formData.get("twitch_broadcaster_id");
const twitchRequireFollow = formData.get("twitch_require_follow") === "on";
const twitchRequireSub = formData.get("twitch_require_sub") === "on";

if (twitchBroadcasterId && (twitchRequireFollow || twitchRequireSub)) {
  gatekeeperRules.twitch = {
    broadcasterId: twitchBroadcasterId,
    requireFollow: twitchRequireFollow,
    requireSub: twitchRequireSub,
  };
}
```

## 実装のテスト

### 手動テスト手順

1. **Twitch要件付きスペースの作成**
   - ダッシュボードに移動
   - 新規スペースを作成
   - Twitch配信者IDを入力（例: `12345`）
   - フォローまたはサブスク要件を選択
   - スペースを作成

2. **確認なしでの参加試行**
   - 別のユーザーとしてスペースに移動
   - 参加を試行
   - エラーが表示される: "Twitchアカウントの確認が必要です"

3. **確認付きでの参加** (OAuth実装後)
   - "Twitchアカウントを確認する"ボタンをクリック
   - Twitchで認証
   - フォロー/サブスク済み: スペースに正常に参加
   - 未フォロー/未サブスク: エラーメッセージを表示

### データベース確認

```sql
-- Twitch要件付きスペースの確認
SELECT id, share_key, gatekeeper_rules
FROM spaces
WHERE gatekeeper_rules->>'twitch' IS NOT NULL;

-- 参加者の確認
SELECT * FROM participants WHERE space_id = '<space_id>';
```

## セキュリティに関する考慮事項

1. **アクセストークンの扱い**
   - アクセストークンはデータベースに保存しない
   - トークンは検証時のみ一時的に使用
   - トークンはサーバーアクション経由で渡す（URLには公開しない）

2. **APIレート制限**
   - Twitch Helix APIにはレート制限がある
   - 短時間のフォロー/サブスク状態のキャッシュを検討
   - 一時的な障害に対するリトライロジックの実装

3. **配信者IDの検証**
   - 配信者ID形式の入力検証を推奨
   - 保存前に配信者の存在を確認することを推奨

4. **スコープの要件**
   - フォロー確認: `user:read:follows` スコープ
   - サブスク確認: `user:read:subscriptions` スコープ（配信者側で有効化が必要）

## 今後の機能拡張

1. **サブスクティアの確認**
   - サブスクリプションティア（Tier 1/2/3）の要件を追加
   - 特定のティア以上の参加者を許可

2. **複数配信者のサポート**
   - 複数の配信者のいずれかをフォローしていることを要求
   - コラボレーション配信に便利

3. **フォロー/サブスク状態のキャッシュ**
   - 認証済みユーザーの状態をキャッシュ
   - API呼び出しを削減し、パフォーマンスを向上

4. **管理インターフェース**
   - スペース管理画面でTwitch要件を表示
   - 作成後の編集を許可

5. **複合条件のサポート**
   - YouTubeとTwitchの両方の要件を組み合わせ
   - AND/OR条件の柔軟な設定

## 参考資料

- [Twitch API ドキュメント](https://dev.twitch.tv/docs/api/)
- [Twitch Helix API リファレンス](https://dev.twitch.tv/docs/api/reference)
- [Get Channel Followers](https://dev.twitch.tv/docs/api/reference/#get-channel-followers)
- [Check User Subscription](https://dev.twitch.tv/docs/api/reference/#check-user-subscription)
- [Supabase Auth with Twitch](https://supabase.com/docs/guides/auth/social-login/auth-twitch)
