# Bingify

配信者・コミュニティ向けリアルタイム・ビンゴ大会ウェブアプリケーション

## 技術スタック

- **Next.js** (App Router, React)
- **Tailwind CSS** (CSS-first configuration)
- **Supabase** (Database, Realtime, Authentication)
- **OAuth** (Google, Twitch)
- **Zod** (Validation)
- **pnpm** (Package Manager)

## 認証について

Bingifyは **Supabase Auth** を使用した認証システムを実装しています。

- **認証方法**: OAuth (Google、Twitch)
- **認証が必須の機能**:
- スペースの作成・管理 (`/dashboard/*`)
- ビンゴカードの表示・参加 (`/spaces/*`, `/@<share_key>`)
- 管理者機能 (`/admin/*`)
- **認証不要の機能**:
- 表示専用画面 (`/screen/[token]`) - ストリーミング配信用

OAuthプロバイダーの設定は、Supabase Dashboardの Authentication > Providersから行います。

## セットアップ手順

### 1. 依存関係のインストール

```bash
pnpm install
```

### 2. 環境変数の設定

環境変数の設定には、以下の3つの方法があります:

#### 方法A: Supabaseから自動取得（推奨）

Supabaseローカルインスタンスから自動的に設定を取得します:

```bash
# Supabaseを起動
pnpm supabase:start

# 環境変数を自動生成
pnpm dev:env
```

このコマンドは以下を自動実行します:

- Supabaseインスタンスからキーを取得
- ランダムなシークレットキーの自動生成
- 既存の `.env` の値を保持

#### 方法B: 対話形式で設定

対話形式で環境変数を設定できるスクリプトを用意しています:

```bash
pnpm env:generate
```

このスクリプトは以下の機能を提供します:

- 必須項目の対話的な入力
- ランダムなシークレットキーの自動生成
- 既存の `.env` がある場合の値の保持
- 入力値のバリデーション

**非対話モード（CI/CD環境向け）:**

```bash
pnpm env:generate --non-interactive
```

**強制上書きモード:**

```bash
pnpm env:generate --force
```

#### 方法C: 手動で設定

`.env.example` をコピーして、Supabaseの接続情報を手動で設定します:

```bash
cp .env.example .env
```

### 3. ローカル開発環境の起動

```bash
# Supabaseローカルインスタンスを起動
pnpm local:setup

# 開発サーバーを起動
pnpm dev
```

アプリケーションは [http://localhost:3000](http://localhost:3000) で起動します。

### 4. ローカルインスタンスの停止

```bash
pnpm local:stop
```

## デプロイ

Bingify は複数のデプロイ方法をサポートしています。

### Vercel (推奨)

Vercel は Next.js アプリケーションに最適化されたホスティングプラットフォームです。自動スケーリング、グローバルCDN、プレビューデプロイなど、強力な機能を提供します。

**詳細なデプロイガイド**: [docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md)

**クイックスタート**:

1. [Bingify GitHubリポジトリ](https://github.com/ykzts/bingify)をフォーク
2. [Vercel Dashboard](https://vercel.com/dashboard) でリポジトリをインポート
3. 環境変数を設定
4. デプロイを実行

### Docker

Docker コンテナでのデプロイもサポートしています。

### イメージのビルド

```bash
docker build -t bingify:latest .
```

### コンテナの実行

```bash
docker run -d \
  --name bingify \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_supabase_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key \
  -e SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
  bingify:latest
```

または、環境変数ファイルを使用：

```bash
docker run -d \
  --name bingify \
  -p 3000:3000 \
  --env-file .env.production \
  bingify:latest
```

**その他のデプロイ方法**: Docker、VPS、クラウドサーバーなどのセルフホスティングについては、[docs/SELF_HOSTED.md](docs/SELF_HOSTED.md) を参照してください。

### Docker イメージの特徴

- **マルチステージビルド**: 最適化された小さなイメージサイズ
- **Node.js 24 Alpine**: 軽量なベースイメージ
- **非 root ユーザー**: セキュリティのための専用ユーザー (UID: 1001)
- **ヘルスチェック**: コンテナの健全性を自動監視

### 必要な環境変数

最低限必要な環境変数：

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase プロジェクトの URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase の匿名キー
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase のサービスロールキー

その他のオプション環境変数については、`.env.example` を参照してください。

## 主要な機能

### 1. スペース作成

- 管理画面 (`/dashboard`) でビンゴスペースを作成
- **認証必須**: OAuth (Google、Twitch) によるログインが必要
- 共有キー形式: `[ユーザー入力]-[日付YYYYMMDD]` (例: `my-party-20251224`)
- リアルタイムで重複チェック

### 2. URL解決 (Middleware)

- 公開URL: `/@<share_key>`
- **認証必須**: アクセスには認証が必要
- Supabaseの `share_key` で UUIDを検索
- `/spaces/<uuid>` に内部 rewrite (URLは `/@<share_key>` のまま表示)

### 3. 管理画面

- `/dashboard/spaces/<uuid>`: スペース管理・ビンゴ抽選実行
- **認証必須**: スペース所有者のみアクセス可能
- リアルタイム同期

### 4. 参加者画面

- `/spaces/<uuid>` または `/@<share_key>`: ビンゴカード表示
- **認証必須**: 認証されたユーザーのみアクセス可能
- Supabase Realtimeでリアルタイム同期

### 5. 表示専用画面 (認証不要)

- `/screen/[token]`: `view_token` を使用した公開表示画面
- **認証不要**: ストリーミング配信などで使用する表示専用画面
- リアルタイムで抽選結果を表示

## 開発ガイドライン

### Next.js 16 パラメータ取得

動的ルートのパラメータは必ず `await` してください。

```typescript
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
- `pnpm local:setup` — Supabaseローカルインスタンス起動
- `pnpm local:stop` — Supabaseローカルインスタンス停止
- `pnpm supabase:test` — データベーステスト実行 (PgTAP)
- `pnpm supabase:typegen` — Supabaseの型定義を生成 (DB 変更後に実行)
- `pnpm lint` — コードチェック (Ultracite)
- `pnpm test` — フロントエンドテスト実行 (Vitest)

## データベーステスト

Bingifyでは [PgTAP](https://pgtap.org/) を使用してデータベース層のテストを実施しています。これにより、RLS (Row Level Security) ポリシーやスキーマ定義が意図通りに動作することを検証できます。

### テストの実行

```bash
# Supabaseローカルインスタンスを起動
pnpm local:setup

# データベーステストを実行
pnpm supabase:test
```

### テストファイルの構成

テストファイルは `supabase/tests/database/` ディレクトリに配置されています：

- `01_schema.sql` — スキーマ定義のテスト (テーブル、カラム、外部キー制約)
- `02_rls_security.sql` — RLSポリシーのテスト (権限とセキュリティ)

### 新しいテストの追加

新しいデータベーステストを追加する場合は、`supabase/tests/database/` ディレクトリに `.sql` ファイルを作成してください。PgTAPの関数を使用してテストを記述します。詳細は [PgTAPドキュメント](https://pgtap.org/documentation.html) を参照してください。

## 環境変数

ローカル開発時は `.env.example` に記載されている値を参照してください。本番環境では Supabase Cloudを使用します。

## データベースマイグレーション

### 自動デプロイ

`supabase/migrations` ディレクトリ配下の `.sql` マイグレーションファイルは、`main` ブランチへのマージ時に自動的に Cloud Supabaseへデプロイされます。

**⚠️ 重要な運用ルール:**

- **既に適用済みのマイグレーションファイル (mainブランチに存在するファイル) は絶対に編集しないでください**
- Supabaseは一度適用されたマイグレーションを再実行しないため、既存ファイルの編集は新規環境にのみ反映され、環境間の不整合を引き起こします
- 変更が必要な場合は、必ず新しいマイグレーションファイルを作成してください (詳細は [docs/MIGRATIONS.md](docs/MIGRATIONS.md) を参照)
- マイグレーションファイルをリポジトリから削除しても、Cloud Supabaseに適用済みのマイグレーションは削除されません
- ロールバックが必要な場合は、新しいマイグレーションファイルで明示的にロールバックSQLを記述してください

**動作フロー:**

1. `supabase/migrations/**/*.sql` に変更を含む PRを作成
2. PRがレビュー・承認される
3. `main` ブランチへマージ
4. GitHub Actionsが自動的にマイグレーションを Cloud Supabaseに適用
5. デプロイ前後の検証ステップで安全性を確保

**必要な GitHub Secrets:**

- `SUPABASE_ACCESS_TOKEN` — Supabaseの Personal Access Token ([Settings > Access Tokens](https://supabase.com/dashboard/account/tokens) から取得)
- `SUPABASE_PROJECT_ID` — Supabaseプロジェクトの Project Reference ID (プロジェクト設定から確認可能)

### 手動デプロイ

緊急時や特定の環境へのデプロイが必要な場合は、GitHub Actionsの `workflow_dispatch` から手動実行できます。

1. GitHubリポジトリの **Actions** タブを開く
2. **Deploy Migrations** ワークフローを選択
3. **Run workflow** をクリックし、デプロイ先の環境を選択

### ローカルでのマイグレーション

```bash
# ローカルSupabaseインスタンスにマイグレーションを適用
pnpm local:setup

# 新しいマイグレーションファイルを作成
supabase migration new <migration_name>
```

### トラブルシューティング

**マイグレーションが失敗した場合:**

1. GitHub Actionsのログで詳細なエラーメッセージを確認
2. マイグレーションファイルの SQL 構文を確認
3. Supabase Dashboardで現在のデータベーススキーマを確認
4. 必要に応じて、手動でロールバックSQLを実行

**ロールバックが必要な場合:**

マイグレーションの自動ロールバックは実装されていません。問題が発生した場合は、以下の手順で手動対応してください：

1. Supabase Dashboardの SQL Editorを開く
2. 問題のあるマイグレーションを元に戻す SQLを実行
3. 修正内容を**新しい**マイグレーションファイルとして作成し、PRを作成 (⚠️ 既存ファイルは編集しない)

## 型定義の生成

Supabaseのデータベーススキーマから TypeScriptの型定義を自動生成できます。

### 型定義の更新手順

データベースのスキーマを変更した後は、以下のコマンドで型定義を更新してください：

```bash
pnpm supabase:typegen
```

このコマンドは `types/supabase.ts` に最新の型定義を生成します。

**重要:**

- ローカルの Supabaseインスタンスが起動している必要があります (`pnpm local:setup`)
- 生成された型定義ファイルは Git 管理対象となります
- DBスキーマ変更後は必ず型定義を更新し、コミットに含めてください

### 型定義の使用例

```typescript
import type { Database, Tables } from "@/types/supabase";

// テーブルの Row 型を取得
type Space = Tables<"spaces">;
type BingoCard = Tables<"bingo_cards">;

// Database 型を使用して Supabaseクライアントを型付け
import { createClient } from "@supabase/supabase-js";
const supabase = createClient<Database>(url, key);
```
