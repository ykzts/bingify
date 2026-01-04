# AGENTS

このリポジトリでエージェントが作業する際のガイドラインです。

## 実行ポリシー

- パッケージマネージャーは `pnpm` を使用。
- Next.js / App Router。
- スタイリングは Tailwind CSS（CSS-first）。`tailwind.config.ts` は不要。
- バリデーション・フォーム処理：Zod + **TanStack Form** + Server Actions。
- 新規パッケージ追加時は npm registry を確認し、最新バージョンを必ず使用する（例：`pnpm add <pkg>@latest`）。バージョンは `savePrefix: ''` により正確に固定されるため、`^` や `~` は付与しない。
- **ライブラリ・API ドキュメントが必要な場合は Context7 MCP を常に使用する**（明示的な指示がなくても自動的に利用すること）。

## UI Framework

- **Shadcn/ui** + **Tailwind CSS** を使用。
- Theme Color: **Purple** (Primary: `#a78bfa`)。
- Icons: **Lucide React**。
- コンポーネントは `@/components/ui` に配置。
- メインアクションのボタンには `primary` バリアント（デフォルト）を使用し、ブランド一貫性を保つ。

## 環境 / サービス

- Supabase: `lib/supabase/server.ts` / `client.ts` を利用。
- 環境変数は `.env.local.example` を参照し、必要に応じ `.env.local` を作成。

## 開発手順

```bash
pnpm install
pnpm local:setup
pnpm dev
```

## コードスタイル

- ユーティリティ結合は `cn`（`lib/utils.ts`）を使用。
- Zod スキーマから型推論（`z.infer<typeof schema>`）。
- Server Actions とフォーム統合には **TanStack Form** を使用：
  - `formOptions` で共有フォームオプションを定義。
  - `createServerValidate` でサーバー側バリデーションを実装。
  - `useForm` + `useActionState` + `mergeForm` でクライアント/サーバー状態を統合。
  - フィールドレベルのバリデーションには `form.Field` コンポーネントを使用。
  - エラー表示は `field.state.meta.errors` から取得。
- **Next.js v16 型安全な Props**：
  - レイアウトコンポーネントには `LayoutProps<Route>` を使用。
  - ページコンポーネントには `PageProps<Route>` を使用。
  - これらの型は `pnpm typegen` で自動生成される（`.next/types/routes.d.ts`）。
  - `params` と `searchParams` は `Promise` として扱い、`await` で解決する。
  - 例:

    ```tsx
    // Layout
    export default async function Layout(props: LayoutProps<"/[locale]">) {
      const { locale } = await props.params;
      return <div>{props.children}</div>;
    }

    // Page
    export default async function Page(props: PageProps<"/blog/[slug]">) {
      const { slug } = await props.params;
      const query = await props.searchParams;
      return <h1>Blog Post: {slug}</h1>;
    }
    ```

- **エラー・成功フィードバックの統一** (#267):
  - **エラー表示**: shadcn/ui `Alert` コンポーネント（`destructive` variant）+ `AlertCircle` アイコン
  - **成功通知**: Sonner `toast.success()` を使用（フォーム内メッセージは廃止）
  - 参考実装: `app/[locale]/dashboard/spaces/[id]/_components/admin-management.tsx`
- コメントは最小限、必要な箇所のみ。
- JSON および JS のオブジェクトキーは原則アルファベット順に並べること（設定ファイルや `package.json` の `dependencies`/`devDependencies` など）。必要に応じて ESLint の `sort-keys` で警告運用。

## 重要なパス

- Pages: `app/[locale]/dashboard/`, `app/[locale]/spaces/`
- Server Actions: `app/[locale]/dashboard/actions.ts`
- Schemas: `lib/schemas/`
- Supabase Clients: `lib/supabase/`
- Middleware: `middleware.ts`
- i18n Messages: `messages/en.json`, `messages/ja.json`
- Tests: `lib/__tests__/`, `lib/utils/__tests__/`

## 国際化 (i18n)

- **next-intl** を使用（App Router 対応）。
- サポート言語: 英語 (en) / 日本語 (ja)。
- メッセージファイル: `messages/en.json`, `messages/ja.json`。
- 使用方法:

  ```tsx
  import { useTranslations } from "next-intl";

  const t = useTranslations("namespace");
  return <div>{t("key")}</div>;
  ```

- 新規テキスト追加時は両言語のメッセージファイルを更新すること。

## テスト

- テストフレームワーク: **Vitest**
- テストファイル: `*.test.ts` または `__tests__/*.ts`
- 実行コマンド: `pnpm test`
- 重要なユーティリティや複雑なロジックには必ずテストを追加すること。

## Context7 MCP

ライブラリの使用方法、API リファレンス、セットアップ手順が必要な場合、Context7 MCP を活用します：

- **明示的な指示がなくても Context7 MCP を自動的に使用する**。
- Next.js、React、Supabase、TanStack Form などのドキュメント参照時に活用。
- 最新のベストプラクティスとコード例を取得できる。

**例:**

- 「Supabase で RLS を設定したい」→ Context7 で Supabase ドキュメントを検索
- 「TanStack Form のフィールドバリデーション」→ Context7 で API リファレンスを取得
- 「Next.js の新機能」→ Context7 で最新ドキュメントを参照

参考: https://github.com/upstash/context7

## コミット前の検証

コミット前に必ず以下のスクリプトを実行し、すべてが成功することを確認してください：

```bash
# Biome による Lint & Format チェック
pnpm check

# TypeScript 型チェック
pnpm type-check

# テスト実行
pnpm test
```

これらはすべて CI で実行されるため、事前に実行しておくことでCI失敗を防ぎます。

## Conventional Commits

すべてのコミットメッセージと Pull Request タイトルは Conventional Commits に準拠します。

**形式:**

```
type(scope): brief subject
```

**type:**

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `refactor`: リファクタリング
- `perf`: パフォーマンス
- `test`: テスト
- `ci`: CI/CD
- `chore`: その他

**scope（例）:**

- `dashboard`, `space`, `auth`, `db`, `deps`, `config`

**subject:**

- 命令形で、50文字以内。
- 平易な英文（GitHub Web UI で見やすさ優先）。

**例:**

- `feat(dashboard): add space creation form`
- `fix(space): resolve slug validation error`
- `docs: update setup instructions`

## GitHub Actions

GitHub Actions でアクションを使用する際は、以下のルールに従ってください。

- タグ指定（例: `@v4`）ではなく、**フルコミットSHA** を使用すること。
- 末尾に `# vX.Y.Z` の形式でバージョンコメントを付与すること。
- Renovate が `helpers:pinGitHubActionDigests` プリセットを使用して自動的に更新を行います。

**例:**

```yaml
- uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1
```
