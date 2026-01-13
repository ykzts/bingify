# SpaceAnnouncementList コンポーネント統合例

このドキュメントでは、SpaceAnnouncementListコンポーネントをスペースダッシュボードページに統合する方法を示します。

## 統合箇所

`app/[locale]/dashboard/spaces/[id]/page.tsx` にコンポーネントを追加します。

## 統合コード例

```tsx
// app/[locale]/dashboard/spaces/[id]/page.tsx
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getSpace } from "@/lib/data/spaces";
import { createClient } from "@/lib/supabase/server";
import { verifySpaceAdmin } from "@/lib/supabase/space-permissions";
import { SpaceAnnouncementList } from "@/components/announcements/space-announcement-list";
// ... その他のインポート

export default async function AdminSpacePage({
  params,
}: PageProps<"/[locale]/dashboard/spaces/[id]">) {
  const { id, locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("AdminSpace");
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: `/login?redirect=/dashboard/spaces/${id}`, locale });
  }

  // Fetch space
  const space = await getSpace(id);
  if (!space) {
    notFound();
  }

  // Check if current user is owner or admin
  const { isAdmin } = await verifySpaceAdmin(supabase, id, user.id);

  // ... その他の処理

  return (
    <div className="container mx-auto space-y-6 p-4">
      {/* スペース情報やその他のコンポーネント */}
      
      {/* お知らせセクション */}
      <section>
        <SpaceAnnouncementList 
          spaceId={id} 
          isAdmin={isAdmin}
        />
      </section>

      {/* その他のコンポーネント */}
    </div>
  );
}
```

## レイアウトの提案

### Option 1: トップに配置
お知らせは重要な情報なので、ページの上部に配置することを推奨します。

```tsx
return (
  <div className="container mx-auto space-y-6 p-4">
    {/* お知らせ（最優先） */}
    <SpaceAnnouncementList spaceId={id} isAdmin={isAdmin} />
    
    {/* ビンゴゲーム */}
    <BingoGameManager />
    
    {/* 参加者情報 */}
    <ParticipantsStatus />
  </div>
);
```

### Option 2: サイドバーに配置
デスクトップではサイドバーに、モバイルではメインコンテンツとして表示。

```tsx
return (
  <div className="container mx-auto p-4">
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* メインコンテンツ */}
      <div className="lg:col-span-2">
        <BingoGameManager />
      </div>
      
      {/* サイドバー */}
      <aside className="space-y-6">
        <SpaceAnnouncementList spaceId={id} isAdmin={isAdmin} />
        <ParticipantsStatus />
      </aside>
    </div>
  </div>
);
```

### Option 3: タブで切り替え
大量のコンテンツがある場合は、タブで切り替える方法も有効です。

```tsx
<Tabs defaultValue="game">
  <TabsList>
    <TabsTrigger value="game">ゲーム</TabsTrigger>
    <TabsTrigger value="announcements">お知らせ</TabsTrigger>
    <TabsTrigger value="participants">参加者</TabsTrigger>
  </TabsList>
  
  <TabsContent value="game">
    <BingoGameManager />
  </TabsContent>
  
  <TabsContent value="announcements">
    <SpaceAnnouncementList spaceId={id} isAdmin={isAdmin} />
  </TabsContent>
  
  <TabsContent value="participants">
    <ParticipantsStatus />
  </TabsContent>
</Tabs>
```

## 権限チェック

`verifySpaceAdmin` 関数を使用して、現在のユーザーがowner/adminかどうかを判定します：

```tsx
import { verifySpaceAdmin } from "@/lib/supabase/space-permissions";

const { isAdmin, isOwner } = await verifySpaceAdmin(supabase, spaceId, userId);

// isAdmin: owner または admin の場合 true
// isOwner: owner の場合 true
```

## モバイル対応

SpaceAnnouncementListコンポーネントは自動的にモバイル対応されています：

- カードは画面幅に合わせて調整
- ボタンは適切なサイズで表示
- タッチ操作に対応
- テキストは折り返して表示

## アクセシビリティ

- セマンティックHTML使用
- ARIAラベル付きボタン
- キーボード操作対応
- スクリーンリーダー対応

## パフォーマンス最適化

- `use client` ディレクティブで必要な部分のみクライアントサイドレンダリング
- Loading skeleton で体感速度向上
- 不要な再レンダリングを防ぐuseEffect依存関係最適化

## 今後の拡張予定

コンポーネントには以下のTODOコメントがあります：

```tsx
// TODO: Navigate to edit page or open edit dialog
const handleEdit = (announcementId: string) => {
  console.log("Edit announcement:", announcementId);
};

// TODO: Navigate to announcement management page
const handleManage = () => {
  console.log("Manage announcements");
};
```

編集機能と管理ページの実装が完了したら、これらのハンドラーを更新してください。
