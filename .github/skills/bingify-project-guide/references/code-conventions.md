# Development Setup & Code Conventions

Bingifyプロジェクトの開発環境構築とコード規約をカバーします。

## セットアップ手順

セットアップおよびSupabase初期化詳細は [supabase-setup.md](supabase-setup.md) を参照してください。

開発環境で重要な TypeScript & Next.js のコード規約は以下の通りです。

## TypeScript & Next.js

- **型安全な Props**：
  - レイアウト: `LayoutProps<Route>`
  - ページ: `PageProps<Route>`
  - 自動生成: `pnpm typegen` (`.next/types/routes.d.ts`)
  - `params` と `searchParams` は `Promise` として扱い、`await` で解決

## UIコンポーネント

- shadcn/ui: `@/components/ui` (自動生成、手動編集禁止)
- カスタムコンポーネント: `@/components`
- ユーティリティ: `cn` (`lib/utils.ts`)

**shadcn/ui 管理**:

```bash
# 新規追加
pnpm dlx shadcn@latest add <component-name>

# 既存コンポーネント更新（上書き）
pnpm dlx shadcn@latest add --yes --overwrite <component-name>
```

## スタイリング

Tailwind CSS (CSS-first)：

- Theme Color: Purple (Primary: `#a78bfa`)
- Icons: Lucide React
- メインアクションボタン: `primary` バリアント（デフォルト）

## 型安全性

Zodスキーマから型推論し、型安全なアプリケーション開発を心がけます。詳細な型安全パターンはフォームバリデーション領域では [form-validation.md](form-validation.md) を参照してください。

## Server Actions

フォーム処理・データ操作はサーバーサイドで実装します。実装パターンについては [form-validation.md](form-validation.md) および [supabase-setup.md](supabase-setup.md) を参照してください。

## エラー・成功フィードバック

- **エラー表示**: shadcn/ui `Alert` + `AlertCircle` アイコン
- **成功通知**: Sonner `toast.success()`

## コード品質チェック

```bash
pnpm check       # Biome: Lint + Format
pnpm type-check  # TypeScript 型チェック
pnpm test        # Vitest によるテスト実行
```

詳細については [github-workflow.md](github-workflow.md) および [testing.md](testing.md) を参照してください。

## コメント・コード規約

- 最小限のコメント（日本語）
- JSON/JSオブジェクトキーはアルファベット順
- 複雑なロジックにはテストを追加（日本語）
