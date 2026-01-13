# 通知システムドキュメント

## 概要

Bingifyの通知システムは、ユーザーにリアルタイムでイベントや変更を知らせるための機能です。通知は30日間保持され、自動的に期限切れとなります。

## 通知タイプ

現在実装されている通知タイプ（`lib/types/notification.ts` の `NotificationType` で定義）:

| タイプ | 値 | 説明 | 実装状況 |
|--------|-----|------|---------|
| スペース招待 | `space_invitation` | スペースの管理者として招待された | ✅ 実装済み |
| スペース更新 | `space_updated` | スペース設定が更新された | 未実装 |
| スペースクローズ | `space_closed` | スペースがクローズされた | 未実装 |
| ビンゴ達成 | `bingo_achieved` | ビンゴを達成した | 未実装 |
| お知らせ公開 | `announcement_published` | 新しいお知らせが公開された | 未実装 |
| 権限変更 | `role_changed` | ユーザーの権限が変更された | 未実装 |
| システム更新 | `system_update` | システムの更新情報 | 未実装 |

## 新しい通知タイプの追加方法

通知機能を新しいアクションに統合する場合は、以下の手順に従ってください。

### 1. NotificationType enum の更新

必要に応じて、新しい通知タイプを `lib/types/notification.ts` の `NotificationType` オブジェクトに追加します。

```typescript
export const NotificationType = {
  // 既存の通知タイプ...
  NEW_TYPE: "new_type", // 新しい通知タイプ
} as const;
```

### 2. アクションから createNotification() を呼び出す

通知を送信したいアクション（Server Action）から `createNotification()` ヘルパー関数を呼び出します。

#### 基本的な使用例

```typescript
import { createNotification } from "@/lib/utils/create-notification";

// アクション内で通知を作成
const result = await createNotification(
  userId,                    // 通知を受け取るユーザーID
  "space_invitation",        // 通知タイプ
  "スペース「XXX」への招待",  // タイトル
  "あなたは管理者として招待されました", // 内容
  `/dashboard/spaces/${spaceId}`, // リンクURL（オプション）
  { space_id: spaceId }      // メタデータ（オプション）
);

// 結果の確認（オプション）
if (!result.success) {
  console.error("通知の作成に失敗:", result.error);
}
```

### 3. 翻訳キーの追加

通知のタイトルと内容を多言語対応する場合は、`messages/en.json` と `messages/ja.json` に翻訳キーを追加します。

```json
// messages/ja.json
{
  "Notifications": {
    "spaceInvitationTitle": "スペース「{spaceName}」への招待",
    "spaceInvitationContent": "あなたはスペースの管理者として招待されました"
  }
}
```

```json
// messages/en.json
{
  "Notifications": {
    "spaceInvitationTitle": "Invitation to space \"{spaceName}\"",
    "spaceInvitationContent": "You have been invited as an administrator"
  }
}
```

## 実装例: スペース招待通知

`app/[locale]/dashboard/spaces/[id]/_actions/invite-admin.ts` での実装例:

```typescript
import { createNotification } from "@/lib/utils/create-notification";

export async function inviteAdminAction(
  spaceId: string,
  _prevState: unknown,
  formData: FormData
) {
  // ... バリデーションと管理者追加のロジック ...

  // 管理者追加成功後
  const { error: insertError } = await supabase.from("space_roles").insert({
    role: "admin",
    space_id: spaceId,
    user_id: targetUser.id,
  });

  if (insertError) {
    return { errors: ["管理者の追加に失敗しました"] };
  }

  // スペース情報を取得
  const { data: spaceData } = await supabase
    .from("spaces")
    .select("title, share_key")
    .eq("id", spaceId)
    .single();

  // 通知を作成
  if (spaceData) {
    const spaceTitle = spaceData.title || spaceData.share_key;
    const linkUrl = `/dashboard/spaces/${spaceId}`;

    await createNotification(
      targetUser.id,
      "space_invitation",
      `スペース「${spaceTitle}」への招待`,
      "あなたはスペースの管理者として招待されました",
      linkUrl,
      { space_id: spaceId }
    );
  }

  return { success: true };
}
```

## 将来の通知統合ポイント

以下のアクションには通知統合のための TODO コメントが追加されています:

### 1. 参加者のキック (`space-operations.ts`)
- **アクション**: `kickParticipant`
- **通知対象**: キックされた参加者
- **通知タイプ**: `participant_kicked` (未定義)
- **必要な情報**: participant の user_id、スペース情報

### 2. スペースのクローズ (`space-operations.ts`)
- **アクション**: `closeSpace`
- **通知対象**: 全参加者と管理者
- **通知タイプ**: `space_closed`
- **必要な情報**: スペース情報、全参加者と管理者の user_id 一覧

### 3. スペースの削除 (`space-management.ts`)
- **アクション**: `deleteSpace`
- **通知対象**: 全参加者と管理者
- **通知タイプ**: `space_deleted` (未定義)
- **必要な情報**: スペース情報（削除前に取得が必要）、全参加者と管理者の user_id 一覧

### 4. 管理者権限の削除 (`settings.ts`)
- **アクション**: `removeAdmin`
- **通知対象**: 削除された管理者
- **通知タイプ**: `admin_removed` (未定義)
- **必要な情報**: スペース情報

## ベストプラクティス

1. **エラーハンドリング**: 通知作成の失敗は、メインのアクションの成功を妨げないようにします。通知の失敗はログに記録するのみとし、アクション自体は成功を返します。

2. **情報の取得**: 通知に含める情報（スペース名、ユーザー名など）は、通知作成前に取得しておきます。

3. **リンクURLの設定**: 通知から適切なページに遷移できるよう、有効なリンクURLを設定します。

4. **メタデータの活用**: 将来の拡張に備えて、関連するIDなどをメタデータに含めます。

5. **多言語対応**: ハードコードされたテキストではなく、可能な限り翻訳キーを使用します。

## 技術詳細

### createNotification() 関数

- **場所**: `lib/utils/create-notification.ts`
- **権限**: 管理者クライアント（`createAdminClient`）を使用してデータベースに直接書き込み
- **有効期限**: 作成から30日後に自動期限切れ
- **戻り値**: `{ success: boolean, notificationId?: string, error?: string }`

### 通知テーブル構造

- **テーブル名**: `notifications`
- **主要カラム**:
  - `id`: UUID
  - `user_id`: 通知を受け取るユーザーID
  - `type`: 通知タイプ
  - `title`: タイトル（最大200文字）
  - `content`: 内容（最大1000文字）
  - `metadata`: JSON形式の追加情報
  - `is_read`: 既読フラグ
  - `expires_at`: 有効期限
  - `created_at`: 作成日時

### リアルタイム通知

通知は Supabase Realtime を使用してリアルタイムに配信されます。フロントエンドコンポーネント（`components/notifications/`）が自動的に新しい通知を受信して表示します。

## 参考リンク

- [通知タイプ定義](../lib/types/notification.ts)
- [createNotification ヘルパー](../lib/utils/create-notification.ts)
- [通知コンポーネント](../components/notifications/)
- [翻訳ファイル（日本語）](../messages/ja.json)
- [翻訳ファイル（英語）](../messages/en.json)
