# Bingify

配信者・コミュニティ向けリアルタイム・ビンゴ大会ウェブアプリケーション

## 技術スタック

- **Next.js** (App Router, React)
- **Tailwind CSS** (CSS-first configuration)
- **Supabase** (Database, Realtime)
- **Zod** (Validation)
- **pnpm** (Package Manager)

## セットアップ手順

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

`.env.local.example` をコピーして、Supabase の接続情報を設定します。

```bash
cp .env.local.example .env.local
```

### 3. ローカル開発環境の起動

```bash
# Supabase ローカルインスタンスを起動
pnpm local:setup

# 開発サーバーを起動
pnpm dev
```

アプリケーションは [http://localhost:3000](http://localhost:3000) で起動します。

### 4. ローカルインスタンスの停止

```bash
pnpm local:stop
```

## 主要な機能

### 1. スペース作成

- 管理画面 (`/dashboard`) でビンゴスペースを作成
- Slug形式: `[ユーザー入力]-[日付YYYYMMDD]`（例: `my-party-20251224`）
- リアルタイムで重複チェック

### 2. URL解決（Middleware）

- 公開URL: `/@<slug>`
- Supabase の `share_key` で UUID を検索
- `/spaces/<uuid>` に内部 rewrite（URLは `/@<slug>` のまま表示）

### 3. 管理画面

- `/dashboard/spaces/<uuid>`: スペース管理・ビンゴ抽選実行
- リアルタイム同期

### 4. 参加者画面

- `/spaces/<uuid>` または `/@<slug>`: ビンゴカード表示
- Supabase Realtime でリアルタイム同期

## 開発ガイドライン

### Next.js 16 パラメータ取得

動的ルートのパラメータは必ず `await` してください。

```typescript
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // ...
}
```

### プロジェクト構造

```
app/
├── dashboard/
│   ├── spaces/[id]/page.tsx
│   ├── actions.ts
│   └── page.tsx
├── spaces/[id]/page.tsx
├── globals.css
└── layout.tsx
lib/
├── supabase/
│   ├── server.ts
│   └── client.ts
├── schemas/
│   └── space.ts
└── utils.ts
```

### 開発スクリプト

- `pnpm dev` — 開発サーバー起動
- `pnpm build` — 本番ビルド
- `pnpm local:setup` — Supabase ローカルインスタンス起動
- `pnpm local:stop` — Supabase ローカルインスタンス停止
- `pnpm lint` — ESLint 実行

## 環境変数

ローカル開発時は `.env.local.example` に記載されている値を参照してください。本番環境では Supabase Cloud を使用します。

## データベースマイグレーション

### 自動デプロイ

`supabase/migrations` ディレクトリ配下のマイグレーションファイルは、`main` ブランチへのマージ時に自動的に Cloud Supabase へデプロイされます。

**動作フロー:**

1. `supabase/migrations/**` に変更を含む PR を作成
2. PR がレビュー・承認される
3. `main` ブランチへマージ
4. GitHub Actions が自動的にマイグレーションを Cloud Supabase に適用

**必要な GitHub Secrets:**

- `SUPABASE_ACCESS_TOKEN` — Supabase の Personal Access Token（[Settings > Access Tokens](https://supabase.com/dashboard/account/tokens) から取得）
- `SUPABASE_PROJECT_ID` — Supabase プロジェクトの Project Reference ID（プロジェクト設定から確認可能）

### 手動デプロイ

緊急時や特定の環境へのデプロイが必要な場合は、GitHub Actions の `workflow_dispatch` から手動実行できます。

1. GitHub リポジトリの **Actions** タブを開く
2. **Deploy Migrations** ワークフローを選択
3. **Run workflow** をクリックし、デプロイ先の環境を選択

### ローカルでのマイグレーション

```bash
# ローカル Supabase インスタンスにマイグレーションを適用
pnpm local:setup

# 新しいマイグレーションファイルを作成
supabase migration new <migration_name>
```

### トラブルシューティング

**マイグレーションが失敗した場合:**

1. GitHub Actions のログで詳細なエラーメッセージを確認
2. マイグレーションファイルの SQL 構文を確認
3. Supabase Dashboard で現在のデータベーススキーマを確認
4. 必要に応じて、手動でロールバック SQL を実行

**ロールバックが必要な場合:**

マイグレーションの自動ロールバックは実装されていません。問題が発生した場合は、以下の手順で手動対応してください：

1. Supabase Dashboard の SQL Editor を開く
2. 問題のあるマイグレーションを元に戻す SQL を実行
3. 修正したマイグレーションファイルを再度 PR として作成
