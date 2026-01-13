# SpaceAnnouncementList Component

スペース固有のお知らせを表示するコンポーネントです。

## 機能

- スペースお知らせの一覧表示
- ピン留めされたお知らせの優先表示と視覚的な区別
- Owner/Admin向けの編集・削除機能
- 改行対応のコンテンツ表示（FormattedText使用）
- ローディングスケルトン表示
- 空状態の表示
- レスポンシブ対応

## 使用方法

```tsx
import { SpaceAnnouncementList } from "@/components/announcements/space-announcement-list";
import { verifySpaceAdmin } from "@/lib/supabase/space-permissions";
import { createClient } from "@/lib/supabase/server";

export default async function SpacePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Check if user is admin
  const { isAdmin } = user 
    ? await verifySpaceAdmin(supabase, params.id, user.id)
    : { isAdmin: false };

  return (
    <div>
      <SpaceAnnouncementList 
        spaceId={params.id} 
        isAdmin={isAdmin}
      />
    </div>
  );
}
```

## Props

| プロパティ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `spaceId` | `string` | ✓ | スペースID |
| `isAdmin` | `boolean` | ✓ | 現在のユーザーがowner/adminかどうか |

## 表示内容

### 一般ユーザー
- お知らせのタイトル、内容、タイムスタンプ
- ピン留めされたお知らせは特別なスタイルで表示

### Owner/Admin
- 上記に加えて
- 各お知らせの編集ボタン
- 各お知らせの削除ボタン（確認ダイアログ付き）
- お知らせ管理ボタン

## 視覚的な特徴

### ピン留めされたお知らせ
- Primary colorの2px border
- Primary colorの背景色（透明度あり）
- Pinアイコン表示

### 通常のお知らせ
- 標準のCardスタイル

## i18n

`messages/en.json` と `messages/ja.json` の `SpaceAnnouncement` セクションに以下のキーを追加済み：

- `title`: "お知らせ" / "Announcements"
- `manageButton`: "お知らせを管理" / "Manage Announcements"
- `editButton`: "編集" / "Edit"
- `deleteButton`: "削除" / "Delete"
- `deleteConfirm`: "このお知らせを削除してもよろしいですか？" / "Are you sure you want to delete this announcement?"
- `deleteSuccess`: "お知らせを削除しました" / "Announcement deleted successfully"
- `emptyMessage`: "お知らせはまだありません" / "No announcements yet"
- `emptyMessageDescription`: "スペースのオーナーまたは管理者がお知らせを作成すると、ここに表示されます。" / "Announcements will appear here when the space owner or admins create them."
- `loadingMessage`: "お知らせを読み込んでいます..." / "Loading announcements..."
- `pinned`: "ピン留め" / "Pinned"

## テスト

`components/announcements/__tests__/space-announcement-list.test.tsx` に10のテストケースを実装：

1. ローディング中はスケルトンを表示
2. お知らせが存在しない場合は空状態を表示
3. 管理者の場合、空状態でも管理ボタンが表示
4. お知らせ一覧を表示
5. ピン留めされたお知らせには特別なスタイルが適用
6. 管理者の場合、編集・削除ボタンが表示
7. 一般ユーザーの場合、編集・削除ボタンが非表示
8. 削除ボタンをクリックすると確認ダイアログが表示され、削除が実行
9. エラーが発生した場合はエラーメッセージを表示
10. FormattedTextコンポーネントでコンテンツがレンダリング

## 依存関係

- `@/lib/actions/space-announcements`: お知らせの取得・削除API
- `@/components/formatted-text`: 改行対応のテキスト表示
- `@/components/providers/confirm-provider`: 確認ダイアログ
- `@/components/ui/card`: Cardコンポーネント
- `@/components/ui/button`: Buttonコンポーネント
- `@/components/ui/alert`: エラー表示用Alertコンポーネント
- `lucide-react`: アイコン（Pin, Edit, Trash2, AlertCircle）
- `next-intl`: 国際化対応
- `sonner`: トースト通知
