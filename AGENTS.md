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
- Shadcn/ui コンポーネントは `@/components/ui` に配置、カスタムコンポーネントは `@/components` に配置。
- メインアクションのボタンには `primary` バリアント（デフォルト）を使用し、ブランド一貫性を保つ。

### Shadcn/ui コンポーネント管理

**重要: `@/components/ui` ディレクトリには shadcn/ui が生成したファイル以外を配置しないこと。**

- `@/components/ui` は shadcn/ui 専用のディレクトリです。
- カスタムコンポーネントは `@/components` 直下に配置してください。
- shadcn/ui コンポーネントの追加・更新は必ず以下のコマンドを使用：

```bash
# 新規追加
pnpm dlx shadcn@latest add <component-name>

# 既存コンポーネントの更新（上書き）
pnpm dlx shadcn@latest add --yes --overwrite <component-name>

# すべてのコンポーネントを最新版に更新
for file in components/ui/*.tsx; do
  component=$(basename "$file" .tsx)
  pnpm dlx shadcn@latest add --yes --overwrite "$component"
done
```

- shadcn/ui コンポーネントを手動で編集しないこと。
- 変更が必要な場合は、shadcn/ui の最新版を取得してから対応すること。

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

## サンプルドメインの使用

コード例やドキュメント内でサンプルURLやメールアドレスを使用する際は、**RFC 2606** で定義された予約済みドメイン名を使用すること。

**使用すべきドメイン:**

- `example.com`
- `example.org`
- `example.net`

**適用箇所:**

- コード例 (テスト、ドキュメント内のコードブロック)
- メールアドレスの例示
- URLの例示
- API リクエスト/レスポンスの例

**例:**

```typescript
// ✅ 正しい
const email = "user@example.com";
const url = "https://example.com/callback";

// ❌ 誤り (実在するドメインを使用しない)
const email = "user@mysite.com";
const url = "https://mycompany.com/callback";
```

**目的:**

- 実在するドメインの誤使用を防ぐ
- 標準的なサンプルドメインを統一して使用
- ドキュメントの品質と安全性を向上

**参考:** [RFC 2606 - Reserved Top Level DNS Names](https://www.rfc-editor.org/rfc/rfc2606.html)

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
- **メッセージファイルやドキュメントを更新する際は、必ず `docs/STYLE_GUIDE.md` を読んで日本語・英語の表記ルールに従うこと。**

## テスト

- テストフレームワーク: **Vitest**
- テストファイル: `*.test.ts` または `__tests__/*.ts`
- 実行コマンド: `pnpm test`
- 重要なユーティリティや複雑なロジックには必ずテストを追加すること。
- **テストの`describe`、`it`の説明文は日本語で記述すること**。
- **コード内のコメントは日本語で記述すること**。

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

## ドキュメント方針

このセクションでは、プロジェクトのドキュメントに関する明確なガイドラインを定義します。

### 記載すべきドキュメント

以下のドキュメントは `docs/` ディレクトリまたはルートディレクトリに配置し、継続的にメンテナンスします：

1. **GLOSSARY.md** (`docs/`)
   - プロジェクト固有の用語定義
   - AI開発やチーム開発での認識齟齬を防ぐための用語集
   - コード上の命名規則とUI表示の対応表

2. **MIGRATIONS.md** (`docs/`)
   - データベースマイグレーションの運用ガイド
   - 自動デプロイフロー、トラブルシューティング
   - 重要なルールや制約事項

3. **STYLE_GUIDE.md** (`docs/`)
   - 日本語・英語の表記統一ルール
   - メッセージファイルやドキュメントを編集する際は必ず参照すること
   - 括弧、空白、外来語、長音符、Oxford comma などのルールを定義

4. **AGENTS.md** (ルート)
   - AI エージェント向けの開発ガイドライン
   - コーディング規約、実行ポリシー
   - 本ドキュメント

5. **README.md** (ルート)
   - プロジェクト概要とセットアップ手順
   - 主要機能の説明
   - 基本的な使い方

6. **CONTRIBUTING.md** (ルート)
   - 貢献者向けガイドライン
   - PR作成ルール、コミット規約

### 記載すべきでないドキュメント

以下のドキュメントは作成・追加しないでください：

1. **実装ログ・開発過程の記録**
   - ❌ `YOUTUBE_CHANNEL_RESOLUTION.md` のような特定機能の実装詳細
   - **理由**: コードが真実の情報源（Single Source of Truth）であり、実装ログはコードの変更に追従できずすぐに陳腐化する
   - **代替案**: 重要な設計判断や技術的背景は以下に記録：
     - コード内のコメント（必要最小限）
     - Pull Request の description
     - GitHub Issues や Discussions
     - GLOSSARY.md の用語定義（概念レベルの説明）

2. **存在しない機能のドキュメント**
   - ❌ `OAUTH_SETUP.md` のような未実装の機能ガイド
   - **理由**: ドキュメントとコードの乖離を生み、混乱を招く
   - **代替案**: 機能実装と同時にドキュメントを追加する

3. **一時的・環境固有の手順書**
   - ❌ 特定の開発者の環境でのみ必要な設定手順
   - **代替案**:
     - 一般的な手順は README.md に統合
     - 環境固有の情報は `.env.local.example` に記載

4. **API リファレンスの重複**
   - ❌ 外部ライブラリのAPIドキュメントのコピー
   - **理由**: 公式ドキュメントが常に最新であり、重複は保守コストが高い
   - **代替案**: 公式ドキュメントへのリンクを記載

### ドキュメントのメンテナンス原則

1. **コードとドキュメントの同期**
   - 機能追加・変更時にドキュメントも同じPRで更新する
   - 破壊的変更は README.md や MIGRATIONS.md に明記する

2. **Single Source of Truth**
   - 同じ情報を複数箇所に記載しない
   - 参照が必要な場合は相互リンクを使用する

3. **定期的な見直し**
   - 四半期ごとにドキュメントの妥当性を確認
   - 陳腐化した情報は削除または更新する

4. **簡潔さの優先**
   - 長大なドキュメントは分割または削除を検討
   - 必要最小限の情報のみを記載

## GitHub Actions

GitHub Actions でアクションを使用する際は、以下のルールに従ってください。

- タグ指定（例: `@v4`）ではなく、**フルコミットSHA** を使用すること。
- 末尾に `# vX.Y.Z` の形式でバージョンコメントを付与すること。
- Renovate が `helpers:pinGitHubActionDigests` プリセットを使用して自動的に更新を行います。

**例:**

```yaml
- uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1
```
