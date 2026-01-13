# AnnouncementBanner Component

システムお知らせバナーコンポーネントです。ページトップに固定表示され、優先度に基づいて最も重要なお知らせを表示します。

## Features

- **優先度ベース表示**: error > warning > info の順で最高優先度のお知らせのみを表示
- **非表示機能**: dismissible=true の場合、ユーザーがXボタンで非表示可能
- **非表示済み除外**: 一度非表示にしたお知らせは再表示されない
- **優先度別スタイリング**:
  - `info`: デフォルト variant (青系)
  - `error`: destructive variant (赤系)
  - `warning`: カスタムスタイル (amber-500 系の黄色)
- **アクセシビリティ**: ARIA 属性による適切なアクセシビリティ対応
- **スムーズなアニメーション**: スライドダウン + フェードインアニメーション

## Usage

### 基本的な使い方

```tsx
import { AnnouncementBanner } from "@/components/announcements/announcement-banner";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AnnouncementBanner />
      <main>{children}</main>
    </div>
  );
}
```

### レイアウトへの統合例

`app/[locale]/layout.tsx` に追加する場合:

```tsx
import { AnnouncementBanner } from "@/components/announcements/announcement-banner";

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  // ... 省略 ...

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${nunito.variable} antialiased`}>
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <ConfirmProvider>
              <div className="flex min-h-screen flex-col">
                <PreReleaseBanner />
                {/* システムお知らせバナーを追加 */}
                <AnnouncementBanner />
                <header className="sticky top-0 z-50 ...">
                  {/* ヘッダー内容 */}
                </header>
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              <Toaster />
            </ConfirmProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## Implementation Details

### コンポーネントの動作

1. **マウント時**:
   - `getActiveAnnouncements()` で公開中のお知らせを取得
   - `getDismissedAnnouncements()` で非表示済みIDを取得
   - 非表示済みを除外し、最高優先度のお知らせを選択

2. **表示中**:
   - タイトルと本文を FormattedText でレンダリング（改行対応）
   - dismissible=true の場合、閉じるボタンを表示
   - 優先度に応じたアイコンとスタイルを適用

3. **非表示時**:
   - 閉じるボタンクリック → UI から即座に非表示
   - `dismissAnnouncement()` でサーバーに非表示記録を保存

### スタイリング

- **info**: 
  - アイコン: `InfoIcon` (情報マーク)
  - variant: `default`
  - 色: デフォルトの青系カラー

- **warning**:
  - アイコン: `TriangleAlert` (三角警告マーク)
  - variant: `default` + カスタムクラス
  - 色: `amber-500/50` border + `amber-50/950` background

- **error**:
  - アイコン: `AlertCircle` (円形警告マーク)
  - variant: `destructive`
  - 色: デフォルトの赤系カラー

### 依存関係

- `@/lib/actions/announcements`: Server Actions
  - `getActiveAnnouncements()`: アクティブなお知らせ取得
  - `getDismissedAnnouncements()`: 非表示済みID取得
  - `dismissAnnouncement(id)`: お知らせを非表示

- `@/components/formatted-text`: FormattedText コンポーネント
- `@/components/ui/alert`: Alert, AlertTitle, AlertDescription
- `@/components/ui/button`: Button
- `lucide-react`: アイコンライブラリ

## Props

このコンポーネントは props を受け取りません。すべてのデータは Server Actions から取得します。

## Testing

14個の包括的なテストケースでカバー:

- ローディング状態
- 空の状態
- 優先度順表示
- 非表示済み除外
- 閉じるボタンの表示/非表示
- 非表示機能
- スタイル適用

テスト実行:

```bash
pnpm test components/announcements/__tests__/announcement-banner.test.tsx
```

## Notes

- このコンポーネントは Client Component (`"use client"`) です
- マウント時に一度だけお知らせを取得します
- 表示するお知らせがない場合は何も表示しません（`return null`）
- アニメーションクラス `animate-slide-down-fade-in` は tw-animate-css により提供されます
