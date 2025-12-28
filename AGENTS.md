# AGENTS

このリポジトリでエージェントが作業する際のガイドラインです。

## 実行ポリシー

- パッケージマネージャーは `pnpm` を使用。
- Next.js / App Router。
- スタイリングは Tailwind CSS（CSS-first）。`tailwind.config.ts` は不要。
- バリデーション・フォーム処理：Zod + Server Functions + `useActionState`。
- 新規パッケージ追加時は npm registry を確認し、最新バージョンを必ず使用する（例：`pnpm add <pkg>@latest`）。バージョンは `savePrefix: ''` により正確に固定されるため、`^` や `~` は付与しない。

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
- Server Functions でバリデーション実施、エラーは `useActionState` で状態管理。
- コメントは最小限、必要な箇所のみ。
- JSON および JS のオブジェクトキーは原則アルファベット順に並べること（設定ファイルや `package.json` の `dependencies`/`devDependencies` など）。必要に応じて ESLint の `sort-keys` で警告運用。

## 重要なパス

- Pages: `app/dashboard/`, `app/spaces/`
- Server Actions: `app/dashboard/actions.ts`
- Schemas: `lib/schemas/space.ts`
- Clients: `lib/supabase/`
- Middleware: `middleware.ts`

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
