# ソーシャル連携 UI/UX 改善ロードマップ

このドキュメントは Issue #520 に基づく、スペース設定のソーシャル連携 UI/UX 改善の実装ロードマップです。

## 完了した作業

### ✅ フェーズ 1: データベースとバックエンドの基盤構築（完了）

- [x] **データベーステーブルの作成**
  - `youtube_channels` テーブル: YouTube チャンネルメタデータの保存
  - `twitch_broadcasters` テーブル: Twitch ブロードキャスターメタデータの保存
  - RLS ポリシーの設定（全員読み取り可、認証済みユーザーのみ書き込み可）
  - インデックスの追加（`channel_id`, `broadcaster_id`, `fetched_at`）

- [x] **TypeScript 型定義**
  - `YouTubeChannelMetadata` 型
  - `TwitchBroadcasterMetadata` 型
  - Insert/Update 用の型定義
  - Supabase 型の再生成

- [x] **データアクセス層の実装**
  - `lib/data/youtube-metadata.ts`: YouTube メタデータの取得・キャッシュ・フォーマット関数
  - `lib/data/twitch-metadata.ts`: Twitch メタデータの取得・キャッシュ・フォーマット関数
  - 24 時間のキャッシュロジック
  - エラーハンドリングとフォールバック機能

- [x] **ドキュメント**
  - `docs/MIGRATIONS.md`: ソーシャルメタデータテーブルの説明追加

## 実装予定の作業

### 🔄 フェーズ 2: Server Actions の統合

#### 目的
スペース設定の保存時に、YouTube/Twitch のメタデータを自動的に取得・保存する。

#### 実装ファイル
- `app/[locale]/dashboard/spaces/[id]/_actions/settings.ts`

#### 実装内容

```typescript
import { fetchAndCacheYouTubeChannelMetadata } from "@/lib/data/youtube-metadata";
import { fetchAndCacheTwitchBroadcasterMetadata } from "@/lib/data/twitch-metadata";
import { getAppAccessToken } from "@/lib/twitch";

export async function updateSpaceSettings(
  spaceId: string,
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // ... 既存のバリデーションコード ...

  // YouTube メタデータの取得と保存
  if (
    validatedData.gatekeeper_mode === "social" &&
    validatedData.social_platform === "youtube" &&
    validatedData.youtube_channel_id
  ) {
    try {
      // ユーザーの OAuth トークンを取得
      const token = await getOAuthToken(supabase, user.id, "google");
      if (token?.access_token) {
        // メタデータを取得してキャッシュ
        await fetchAndCacheYouTubeChannelMetadata(
          supabase,
          validatedData.youtube_channel_id,
          token.access_token,
          user.id
        );
      }
    } catch (error) {
      // エラーは記録するが、設定保存は続行
      console.error("Failed to fetch YouTube metadata:", error);
    }
  }

  // Twitch メタデータの取得と保存
  if (
    validatedData.gatekeeper_mode === "social" &&
    validatedData.social_platform === "twitch" &&
    validatedData.twitch_broadcaster_id
  ) {
    try {
      // App Access Token を取得（サーバー側）
      const appToken = await getAppAccessToken();
      if (appToken) {
        // メタデータを取得してキャッシュ
        await fetchAndCacheTwitchBroadcasterMetadata(
          supabase,
          validatedData.twitch_broadcaster_id,
          appToken,
          user.id
        );
      }
    } catch (error) {
      // エラーは記録するが、設定保存は続行
      console.error("Failed to fetch Twitch metadata:", error);
    }
  }

  // ... 既存の設定保存コード ...
}
```

#### テスト計画
- チャンネル ID/ブロードキャスター ID が有効な場合、メタデータが正しく保存されること
- API エラーが発生しても設定保存は成功すること
- キャッシュが有効な場合、API が呼ばれないこと

### 🎨 フェーズ 3: UI コンポーネントの改善

#### 3.1 タグ表示コンポーネントの作成

新しいコンポーネント: `app/[locale]/dashboard/spaces/[id]/_components/social-channel-tag.tsx`

```typescript
"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  YouTubeChannelMetadata,
  TwitchBroadcasterMetadata,
} from "@/lib/types/social-metadata";

interface Props {
  metadata: YouTubeChannelMetadata | TwitchBroadcasterMetadata;
  onRemove: () => void;
  disabled?: boolean;
}

export function SocialChannelTag({ metadata, onRemove, disabled }: Props) {
  // YouTube チャンネルの場合
  if ("channel_id" in metadata) {
    const display = metadata.handle || metadata.channel_title || metadata.channel_id;
    return (
      <Badge variant="secondary" className="flex items-center gap-2 pr-1">
        <span>
          {display} <span className="text-muted-foreground">({metadata.channel_id})</span>
        </span>
        <Button
          disabled={disabled}
          onClick={onRemove}
          size="icon"
          type="button"
          variant="ghost"
          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="h-3 w-3" />
        </Button>
      </Badge>
    );
  }

  // Twitch ブロードキャスターの場合
  if ("broadcaster_id" in metadata) {
    const display = metadata.username || metadata.display_name || metadata.broadcaster_id;
    return (
      <Badge variant="secondary" className="flex items-center gap-2 pr-1">
        <span>
          {display} <span className="text-muted-foreground">({metadata.broadcaster_id})</span>
        </span>
        <Button
          disabled={disabled}
          onClick={onRemove}
          size="icon"
          type="button"
          variant="ghost"
          className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="h-3 w-3" />
        </Button>
      </Badge>
    );
  }

  return null;
}
```

#### 3.2 フィールドコンポーネントの更新

`youtube-channel-id-field.tsx` と `twitch-broadcaster-id-field.tsx` を更新して、ID が入力されている場合はタグ表示に切り替える。

```typescript
// youtube-channel-id-field.tsx の更新例

import { useEffect, useState } from "react";
import { SocialChannelTag } from "./social-channel-tag";
import { getYouTubeChannelMetadata } from "@/lib/data/youtube-metadata";

export function YoutubeChannelIdField({ field, ... }: Props) {
  const [metadata, setMetadata] = useState<YouTubeChannelMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const channelId = field.state.value as string;

  // チャンネル ID が設定されている場合、メタデータを取得
  useEffect(() => {
    if (channelId && YOUTUBE_CHANNEL_ID_REGEX.test(channelId)) {
      setLoading(true);
      // Server Action 経由でメタデータを取得
      fetchYouTubeMetadata(channelId)
        .then((data) => setMetadata(data))
        .catch(() => setMetadata(null))
        .finally(() => setLoading(false));
    } else {
      setMetadata(null);
    }
  }, [channelId]);

  // メタデータがある場合はタグ表示
  if (metadata && !loading) {
    return (
      <Field>
        <FieldContent>
          <FieldLabel>{t("youtubeChannelIdLabel")}</FieldLabel>
          <SocialChannelTag
            metadata={metadata}
            onRemove={() => field.handleChange("")}
            disabled={isPending}
          />
          <FieldDescription>{t("youtubeChannelIdHelp")}</FieldDescription>
        </FieldContent>
      </Field>
    );
  }

  // メタデータがない場合は従来の入力フィールド
  return (
    <Field>
      {/* 既存の Input コンポーネント */}
    </Field>
  );
}
```

#### 3.3 Server Action の追加

メタデータ取得用の Server Action を追加:

```typescript
// app/[locale]/dashboard/spaces/[id]/_actions/get-social-metadata.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { getYouTubeChannelMetadata } from "@/lib/data/youtube-metadata";
import { getTwitchBroadcasterMetadata } from "@/lib/data/twitch-metadata";

export async function getYouTubeMetadata(channelId: string) {
  const supabase = await createClient();
  return await getYouTubeChannelMetadata(supabase, channelId);
}

export async function getTwitchMetadata(broadcasterId: string) {
  const supabase = await createClient();
  return await getTwitchBroadcasterMetadata(supabase, broadcasterId);
}
```

### 📝 フェーズ 4: デフォルト値の改善

#### 目的
プラットフォーム選択時に、要件のデフォルト値を「なし」から意味のある値に変更する。

#### 実装箇所
- `app/[locale]/dashboard/spaces/[id]/_components/space-settings-form.tsx`

#### 実装内容

```typescript
// プラットフォーム変更時のハンドラーを追加
<form.Field name="social_platform">
  {(platformField) => (
    <RadioGroup
      disabled={isGatekeeperDisabled}
      onValueChange={(value) => {
        platformField.handleChange(value as "youtube" | "twitch");
        
        // プラットフォーム変更時にデフォルト要件を設定
        if (value === "youtube") {
          const currentReq = form.getFieldValue("youtube_requirement");
          if (!currentReq || currentReq === "none") {
            form.setFieldValue("youtube_requirement", "subscriber");
          }
        } else if (value === "twitch") {
          const currentReq = form.getFieldValue("twitch_requirement");
          if (!currentReq || currentReq === "none") {
            form.setFieldValue("twitch_requirement", "follower");
          }
        }
      }}
      value={effectiveSocialPlatform}
    >
      {/* RadioGroupItem コンポーネント */}
    </RadioGroup>
  )}
</form.Field>
```

### 🧪 フェーズ 5: テストの追加

#### 5.1 データアクセス層のテスト

新しいファイル: `lib/data/__tests__/youtube-metadata.test.ts`

```typescript
import { describe, it, expect, vi } from "vitest";
import {
  fetchAndCacheYouTubeChannelMetadata,
  formatYouTubeChannelDisplay,
} from "../youtube-metadata";

describe("YouTube メタデータ", () => {
  it("キャッシュが有効な場合、API を呼ばない", async () => {
    // テストコード
  });

  it("キャッシュが古い場合、API を呼ぶ", async () => {
    // テストコード
  });

  it("API エラー時、古いキャッシュを返す", async () => {
    // テストコード
  });

  it("ハンドル優先で表示文字列を生成する", () => {
    // テストコード
  });
});
```

新しいファイル: `lib/data/__tests__/twitch-metadata.test.ts`（同様の構造）

#### 5.2 UI コンポーネントのテスト

新しいファイル: `app/[locale]/dashboard/spaces/[id]/_components/__tests__/social-channel-tag.test.tsx`

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SocialChannelTag } from "../social-channel-tag";

describe("SocialChannelTag", () => {
  it("YouTube チャンネルを正しく表示する", () => {
    // テストコード
  });

  it("削除ボタンが機能する", () => {
    // テストコード
  });
});
```

### 📚 フェーズ 6: ドキュメントの整備

- [x] `docs/MIGRATIONS.md` の更新
- [ ] `docs/GLOSSARY.md` の更新（必要に応じて）
- [ ] API ドキュメントの追加（JSDoc コメント）
- [ ] README の更新（機能追加の説明）

## 実装の優先順位

1. **High**: フェーズ 2（Server Actions の統合）
2. **High**: フェーズ 3.3（Server Action の追加）
3. **High**: フェーズ 3.1（タグ表示コンポーネント）
4. **Medium**: フェーズ 3.2（フィールドコンポーネントの更新）
5. **Medium**: フェーズ 4（デフォルト値の改善）
6. **Low**: フェーズ 5（テストの追加）
7. **Low**: フェーズ 6（ドキュメントの整備）

## 技術的な考慮事項

### パフォーマンス
- メタデータの取得は非同期で行い、UI をブロックしない
- キャッシュを活用して API 呼び出しを最小限に抑える
- ローディング状態を適切に表示する

### エラーハンドリング
- API 取得失敗時のフォールバック（ID のみ表示）
- ユーザーへの適切なエラーメッセージ
- 設定保存は失敗させない（メタデータ取得は補助的）

### アクセシビリティ
- タグの削除ボタンは `aria-label` を設定
- キーボードナビゲーションのサポート
- スクリーンリーダー対応

### 後方互換性
- 既存のスペースは引き続き動作すること
- メタデータがない場合でも ID で機能すること
- 段階的な移行が可能であること

## 参考リンク

- Issue #520: https://github.com/ykzts/bingify/issues/520
- YouTube Data API: https://developers.google.com/youtube/v3
- Twitch API: https://dev.twitch.tv/docs/api/
- Shadcn/ui Badge: https://ui.shadcn.com/docs/components/badge
