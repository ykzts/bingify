# Vercelデプロイガイド (Vercel Deployment Guide)

このドキュメントは、BingifyをVercelでデプロイするための包括的なガイドです。VercelはNext.jsアプリケーションの最適なパフォーマンスとシームレスな統合を提供するため、**推奨されるデプロイ方法**です。

## 目次

- [Vercelを選ぶ理由](#vercelを選ぶ理由)
- [前提条件](#前提条件)
- [クイックスタート](#クイックスタート)
- [詳細なセットアップ手順](#詳細なセットアップ手順)
  - [1. Supabaseプロジェクトの準備](#1-supabaseプロジェクトの準備)
  - [2. リポジトリの準備](#2-リポジトリの準備)
  - [3. Vercelプロジェクトの作成](#3-vercelプロジェクトの作成)
  - [4. 環境変数の設定](#4-環境変数の設定)
  - [5. デプロイの実行](#5-デプロイの実行)
- [環境変数リファレンス](#環境変数リファレンス)
  - [必須の環境変数](#必須の環境変数)
  - [推奨の環境変数](#推奨の環境変数)
  - [オプションの環境変数](#オプションの環境変数)
- [Supabase連携](#supabase連携)
  - [データベースマイグレーション](#データベースマイグレーション)
  - [Row Level Security (RLS)](#row-level-security-rls)
  - [Realtime機能の設定](#realtime機能の設定)
  - [OAuth設定](#oauth設定)
- [カスタムドメインの設定](#カスタムドメインの設定)
  - [ドメインの追加](#ドメインの追加)
  - [DNS設定](#dns設定)
  - [SSL証明書](#ssl証明書)
- [CI/CD統合 (GitHub連携)](#cicd統合-github連携)
  - [自動デプロイの仕組み](#自動デプロイの仕組み)
  - [プレビューデプロイ](#プレビューデプロイ)
  - [本番デプロイ](#本番デプロイ)
  - [デプロイフック](#デプロイフック)
- [パフォーマンス最適化](#パフォーマンス最適化)
  - [Edge Network最適化](#edge-network最適化)
  - [画像最適化](#画像最適化)
  - [キャッシング戦略](#キャッシング戦略)
  - [バンドルサイズの最適化](#バンドルサイズの最適化)
- [モニタリングとデバッグ](#モニタリングとデバッグ)
  - [リアルタイムログ](#リアルタイムログ)
  - [Analytics](#analytics)
  - [Speed Insights](#speed-insights)
  - [エラートラッキング](#エラートラッキング)
- [Cronジョブの設定](#cronジョブの設定)
- [トラブルシューティング](#トラブルシューティング)
- [コスト管理](#コスト管理)
- [サポートとリソース](#サポートとリソース)

---

## Vercelを選ぶ理由

VercelはNext.jsの開発元が提供するホスティングプラットフォームで、Next.jsアプリケーションに最適化されています。

### 主な利点

- **ゼロコンフィグデプロイ**: Next.jsに最適化された自動設定で、複雑な設定は不要
- **自動スケーリング**: トラフィックに応じた自動スケールで、手動での容量管理が不要
- **グローバルCDN**: 世界中で高速なコンテンツ配信を実現
- **自動HTTPS**: 無料のSSL証明書とHTTPS対応を自動設定
- **プレビューデプロイ**: PRごとの自動プレビュー環境で、レビューが容易
- **組み込みCron**: `vercel.json` で定義されたCronジョブの自動実行
- **エッジネットワーク**: 世界中のエッジロケーションで高速レスポンス
- **簡単なロールバック**: ワンクリックで以前のデプロイに戻せる
- **統合Analytics**: ビルトインのパフォーマンス監視とアナリティクス

### Next.jsとの深い統合

VercelはNext.jsの開発元であるため、以下の機能が完全にサポートされています:

- Server Components
- App Router
- Incremental Static Regeneration (ISR)
- Edge Runtime
- Middleware
- Image Optimization
- Font Optimization

---

## 前提条件

デプロイを始める前に、以下を準備してください:

- **GitHubアカウント**: リポジトリ管理用
- **Vercelアカウント**: 無料プランで開始可能 ([vercel.com](https://vercel.com/))
- **Supabaseプロジェクト**: Cloud版またはOSS版 ([supabase.com](https://supabase.com/))
- **基本的な知識**: Git、環境変数、DNSの基礎知識

---

## クイックスタート

最速でデプロイする方法です。詳細な手順は次のセクションを参照してください。

1. **リポジトリをフォーク**

   ```
   https://github.com/ykzts/bingify
   ```

2. **Vercelにインポート**

   [Vercel Dashboard](https://vercel.com/dashboard) で "New Project" をクリックし、フォークしたリポジトリを選択します。

3. **環境変数を設定**

   最低限必要な環境変数を設定:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
   CRON_SECRET=your-random-secret
   ```

4. **デプロイ**

   "Deploy" をクリックして数分待つと、デプロイが完了します。

---

## 詳細なセットアップ手順

### 1. Supabaseプロジェクトの準備

Vercelデプロイの前に、Supabaseプロジェクトをセットアップします。

#### 1.1 Supabase Cloudプロジェクトの作成

1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセスしてログイン
2. "New Project" をクリック
3. プロジェクト名、データベースパスワード、リージョンを設定
4. "Create new project" をクリックして作成を完了

**推奨設定**:

- **リージョン**: ユーザーの地理的位置に近いリージョンを選択 (例: Tokyo for Asia, Frankfurt for Europe)
- **プラン**: 無料プラン (Hobby) で開始可能、本番環境ではProプラン以上を推奨

#### 1.2 接続情報の取得

Supabase Dashboardの "Settings" → "API" で以下の情報を取得:

- **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
- **anon/public key**: 公開用の匿名キー
- **service_role key**: 管理者権限を持つサービスロールキー (⚠️ 秘密情報)

**重要**: `service_role key` は秘密情報です。絶対にコードにハードコードしたり、公開リポジトリにコミットしないでください。

#### 1.3 データベースマイグレーションの適用

ローカル環境でSupabase CLIを使用してマイグレーションを適用します。

```bash

# Supabase CLIをインストール (未インストールの場合)

pnpm add -g supabase

# Supabaseにログイン

supabase login

# プロジェクトにリンク

supabase link --project-ref your-project-ref

# マイグレーションを適用

supabase db push
```

**代替方法**: Supabase Dashboardの "SQL Editor" から `supabase/migrations/\*.sql` ファイルの内容を手動で実行できます。

#### 1.4 Realtime機能の有効化

Supabase Dashboardの "Database" → "Replication" で以下のテーブルのRealtimeを有効化:

- `spaces`
- `bingo_cards`
- `called_numbers`

これにより、リアルタイムでのビンゴゲームの同期が可能になります。

---

### 2. リポジトリの準備

#### 2.1 リポジトリのフォーク

1. [Bingify GitHub リポジトリ](https://github.com/ykzts/bingify) にアクセス
2. 右上の "Fork" ボタンをクリック
3. フォーク先のアカウント/組織を選択
4. "Create fork" をクリック

#### 2.2 ローカルでのクローン (オプション)

ローカルで環境変数を事前に確認したい場合:

```bash
git clone https://github.com/your-username/bingify.git
cd bingify
```

`.env.local.example` を参考に、必要な環境変数をリストアップします。

---

### 3. Vercelプロジェクトの作成

#### 3.1 Vercelにインポート

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. "Add New..." → "Project" をクリック
3. "Import Git Repository" セクションで、フォークしたリポジトリを探す
4. リポジトリが見つからない場合は、"Adjust GitHub App Permissions" をクリックしてアクセス権限を付与
5. リポジトリを選択して "Import" をクリック

#### 3.2 プロジェクト設定

**Configure Project** 画面で以下を設定:

- **Project Name**: プロジェクト名 (例: `bingify`)
- **Framework Preset**: Next.js (自動検出されます)
- **Root Directory**: `./` (変更不要)
- **Build Command**: `pnpm build` (自動設定されます)
- **Output Directory**: `.next` (自動設定されます)
- **Install Command**: `pnpm install` (自動設定されます)

**注意**: これらの設定は通常、自動検出されるため変更の必要はありません。

---

### 4. 環境変数の設定

Vercelプロジェクト設定画面で環境変数を追加します。

#### 4.1 環境変数の追加方法

**Configure Project** 画面または **Project Settings** → **Environment Variables** から追加:

1. "Add New" をクリック
2. **Key** と **Value** を入力
3. **Environments** を選択:
   - **Production**: 本番環境
   - **Preview**: プレビューデプロイ (PR)
   - **Development**: ローカル開発 (通常は不要)
4. "Save" をクリック

#### 4.2 必須の環境変数を設定

以下の環境変数は必須です:

```bash

# Supabase接続

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# サイトURL (VercelのデフォルトURLまたはカスタムドメイン)

NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app

# Cronジョブ認証用シークレット (必須)

CRON_SECRET=your-random-secret-string
```

**`CRON_SECRET` の生成**:

ターミナルで以下のコマンドを実行して安全なランダム文字列を生成:

```bash
openssl rand -base64 32
```

#### 4.3 推奨の環境変数を設定

本番環境では以下も設定することを推奨します:

```bash

# ベータ版バナーの非表示 (正式リリース時)

NEXT_PUBLIC_SHOW_BETA_BANNER=false

# SMTP設定 (お問い合わせフォーム用)

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=password
SMTP_SECURE=false
MAIL_FROM=noreply@example.com
```

完全な環境変数のリストは、[環境変数リファレンス](#環境変数リファレンス) を参照してください。

---

### 5. デプロイの実行

#### 5.1 初回デプロイ

環境変数の設定が完了したら、"Deploy" をクリックします。

デプロイプロセス:

1. **Installing Dependencies**: 依存関係のインストール (約1-2分)
2. **Building**: Next.jsアプリケーションのビルド (約2-3分)
3. **Deploying**: グローバルCDNへのデプロイ (約30秒)

#### 5.2 デプロイの確認

デプロイが完了すると、Vercel自動生成のURLが表示されます:

```
https://your-project.vercel.app
```

1. URLをクリックしてアプリケーションにアクセス
2. ログイン機能が動作するか確認
3. スペース作成が正常に動作するか確認

#### 5.3 デプロイログの確認

問題が発生した場合は、デプロイログを確認:

1. Vercel Dashboardの "Deployments" タブを開く
2. 該当するデプロイをクリック
3. "Building" または "Deploying" セクションでログを確認
4. エラーメッセージがある場合は、環境変数や設定を見直す

---

## 環境変数リファレンス

Bingifyの動作に必要な環境変数の完全なリストです。

### 必須の環境変数

これらの環境変数は必ず設定してください。

| 変数名                            | 説明                                    | 例                                  | 取得方法                                    |
| :-------------------------------- | :-------------------------------------- | :---------------------------------- | :------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | SupabaseプロジェクトURL                 | `https://xxx.supabase.co`         | Supabase Dashboard → Settings → API         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase匿名キー (公開用)               | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` | Supabase Dashboard → Settings → API         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabaseサービスロールキー (⚠️秘密情報) | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` | Supabase Dashboard → Settings → API         |
| `NEXT_PUBLIC_SITE_URL`          | サイトURL (OAuth リダイレクト用)        | `https://example.com`             | Vercel のデプロイURL またはカスタムドメイン |
| `CRON_SECRET`                   | Cronジョブ認証用シークレット            | `your-random-secret-string`       | `openssl rand -base64 32` で生成          |

**重要**:

- `NEXT_PUBLIC_*` プレフィックスがある変数はクライアント側で使用されます
- `SUPABASE_SERVICE_ROLE_KEY` は管理者権限を持つため、絶対に公開しないでください
- `CRON_SECRET` を設定しないと、不正なCronジョブの実行を防げません

### 推奨の環境変数

本番環境では以下の設定を推奨します。

| 変数名                           | 説明                       | デフォルト | 例                  |
| :------------------------------- | :------------------------- | :--------- | :------------------ |
| `NEXT_PUBLIC_SHOW_BETA_BANNER` | ベータ版バナーの表示制御   | `true`   | `false`           |
| `SEND_EMAIL_HOOK_SECRETS`      | Supabase Auth Hook署名検証 | -          | `v1,whsec_xxx...` |

**SMTP設定 (お問い合わせフォーム)**:

| 変数名          | 説明                 | 例                      |
| :-------------- | :------------------- | :---------------------- |
| `SMTP_HOST`   | SMTPサーバーホスト   | `smtp.example.com`    |
| `SMTP_PORT`   | SMTPポート           | `587`                 |
| `SMTP_USER`   | SMTPユーザー名       | `user`                |
| `SMTP_PASS`   | SMTPパスワード       | `password`            |
| `SMTP_SECURE` | TLS使用フラグ        | `false`               |
| `MAIL_FROM`   | 送信元メールアドレス | `noreply@example.com` |

送信先は `profiles` テーブルの `role = 'admin'` のユーザーに自動送信されます。

### オプションの環境変数

以下の環境変数はオプションです。機能を有効化する場合のみ設定してください。

**OAuth認証設定**:

| 変数名                                      | 説明                        | 取得方法                                                       |
| :------------------------------------------ | :-------------------------- | :------------------------------------------------------------- |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` | Google OAuth クライアントID | [Google Cloud Console](https://console.cloud.google.com/)      |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`    | Google OAuth シークレット   | Google Cloud Console                                           |
| `SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID` | Twitch OAuth クライアントID | [Twitch Developer Console](https://dev.twitch.tv/console/apps) |
| `SUPABASE_AUTH_EXTERNAL_TWITCH_SECRET`    | Twitch OAuth シークレット   | Twitch Developer Console                                       |

**アクセス制御**:

| 変数名                  | 説明                    | デフォルト | 例           |
| :---------------------- | :---------------------- | :--------- | :----------- |
| `ENABLE_BASIC_AUTH`   | Basic認証の有効化フラグ | `false`  | `true`     |
| `BASIC_AUTH_USER`     | Basic認証ユーザー名     | -          | `admin`    |
| `BASIC_AUTH_PASSWORD` | Basic認証パスワード     | -          | `password` |

Basic認証は公開前の制限やステージング環境の保護に使用できます。

**分析・セキュリティ機能**:

| 変数名                             | 説明                             | 取得方法                                             |
| :--------------------------------- | :------------------------------- | :--------------------------------------------------- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstileサイトキー   | [Cloudflare Dashboard](https://dash.cloudflare.com/) |
| `TURNSTILE_SECRET_KEY`           | Cloudflare Turnstileシークレット | Cloudflare Dashboard                                 |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`  | Google Analytics測定ID           | [Google Analytics](https://analytics.google.com/)    |

---

## Supabase連携

VercelとSupabaseの連携における詳細な設定方法です。

### データベースマイグレーション

#### 自動デプロイ (推奨)

`supabase/migrations` ディレクトリ配下の `.sql` マイグレーションファイルは、`main` ブランチへのマージ時に自動的にCloud Supabaseへデプロイされます。

**GitHub Actions による自動マイグレーション**:

1. PRを作成し、`supabase/migrations/\*.sql` に変更を含める
2. PRがレビュー・承認される
3. `main` ブランチへマージ
4. GitHub Actionsが自動的にマイグレーションをCloud Supabaseに適用
5. デプロイ前後の検証ステップで安全性を確保

**必要な GitHub Secrets**:

- `SUPABASE_ACCESS_TOKEN`: SupabaseのPersonal Access Token ([Settings > Access Tokens](https://supabase.com/dashboard/account/tokens) から取得)
- `SUPABASE_PROJECT_ID`: SupabaseプロジェクトのProject Reference ID (プロジェクト設定から確認可能)

#### 手動マイグレーション

緊急時や初回セットアップでは、手動でマイグレーションを実行できます:

```bash

# Supabaseにログイン

supabase login

# プロジェクトにリンク

supabase link --project-ref your-project-ref

# マイグレーションを適用

supabase db push
```

**⚠️ 重要な運用ルール**:

- **既に適用済みのマイグレーションファイル (mainブランチに存在するファイル) は絶対に編集しないでください**
- Supabaseは一度適用されたマイグレーションを再実行しないため、既存ファイルの編集は新規環境にのみ反映され、環境間の不整合を引き起こします
- 変更が必要な場合は、必ず新しいマイグレーションファイルを作成してください

詳細は [`docs/MIGRATIONS.md`](./MIGRATIONS.md) を参照してください。

### Row Level Security (RLS)

SupabaseのRow Level Security (RLS) は、データベースレベルでのアクセス制御を提供します。

**RLSポリシーの確認**:

1. Supabase Dashboardの "Authentication" → "Policies" にアクセス
2. 各テーブルのポリシーが正しく設定されているか確認

**主要なRLSポリシー**:

- `spaces`: ユーザーは自分が作成したスペースのみ編集可能
- `bingo_cards`: 認証済みユーザーはカードを作成・表示可能
- `called_numbers`: スペース所有者のみ番号を呼び出し可能

RLSポリシーはマイグレーションで自動的に設定されます (`supabase/migrations/\*.sql`)。

### Realtime機能の設定

ビンゴゲームのリアルタイム同期には、Supabase Realtimeが必要です。

**設定手順**:

1. Supabase Dashboardの "Database" → "Replication" にアクセス
2. 以下のテーブルでReplicationを有効化:
   - `spaces`
   - `bingo_cards`
   - `called_numbers`

**動作確認**:

1. Vercelにデプロイしたアプリケーションでスペースを作成
2. 別のブラウザーまたはシークレットモードで同じスペースを開く
3. 管理画面から番号を呼び出し、リアルタイムで反映されることを確認

### OAuth設定

GoogleおよびTwitchのOAuth認証を有効にする手順です。

#### Google OAuth

1. **Google Cloud Console でOAuthアプリケーションを作成**

   [Google Cloud Console](https://console.cloud.google.com/) にアクセス:
   - "APIs & Services" → "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID" を選択
   - Application type: "Web application"
   - Authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`

2. **クライアントIDとシークレットを取得**

   作成後に表示されるクライアントIDとシークレットをコピー

3. **Vercelに環境変数を設定**

   ```bash
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-secret
   ```

4. **Supabase Dashboard でプロバイダーを有効化**

   Supabase Dashboardの "Authentication" → "Providers" でGoogleを有効化し、クライアントIDとシークレットを設定

#### Twitch OAuth

1. **Twitch Developer Console でアプリケーションを作成**

   [Twitch Developer Console](https://dev.twitch.tv/console/apps) にアクセス:
   - "Register Your Application" をクリック
   - OAuth Redirect URL: `https://your-project.supabase.co/auth/v1/callback`
   - Category: "site Integration"

2. **クライアントIDとシークレットを取得**

   作成後に表示されるクライアントIDとシークレットをコピー

3. **Vercelに環境変数を設定**

   ```bash
   SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID=your-client-id
   SUPABASE_AUTH_EXTERNAL_TWITCH_SECRET=your-secret
   ```

4. **Supabase Dashboard でプロバイダーを有効化**

   Supabase Dashboardの "Authentication" → "Providers" でTwitchを有効化し、クライアントIDとシークレットを設定

**重要**: OAuthのリダイレクトURIは、Supabaseプロジェクトの認証コールバックURLを使用します。カスタムドメインを使用する場合は、Supabase Dashboardの "Authentication" → "URL Configuration" で "Site URL" を更新してください。

---

## カスタムドメインの設定

VercelのデフォルトURL (`your-project.vercel.app`) ではなく、独自ドメインを使用する手順です。

### ドメインの追加

#### 1. Vercel Dashboard でドメインを追加

1. Vercel Dashboardの該当プロジェクトを開く
2. "Settings" → "Domains" に移動
3. "Add" ボタンをクリック
4. ドメイン名を入力 (例: `Bingify.example.com` または `example.com`)
5. "Add" をクリック

#### 2. ドメインタイプの選択

Vercelは以下のドメインタイプをサポートします:

- **Apex Domain** (例: `example.com`): ルートドメイン
- **Subdomain** (例: `bingify.example.com`): サブドメイン
- **Wildcard** (例: `\*.example.com`): ワイルドカードドメイン (Proプラン以上)

**推奨**: サブドメインを使用すると、DNS設定が簡単です (CNAMEレコードのみ)。

### DNS設定

ドメインを追加すると、VercelがDNS設定手順を表示します。

#### サブドメインの場合 (推奨)

**CNAME レコードを追加**:

| Type  | Name        | Value                     |
| :---- | :---------- | :------------------------ |
| CNAME | `bingify` | `cname.vercel-dns.com.` |

ドメインレジストラー (例: Cloudflare, GoDaddy, Namecheap) のDNS管理画面で上記のレコードを追加します。

#### Apex ドメインの場合

**A レコードを追加**:

| Type | Name  | Value           |
| :--- | :---- | :-------------- |
| A    | `@` | `76.76.21.21` |

**注意**: 一部のDNSプロバイダーはCNAME FlatteningまたはANAME/ALIASレコードをサポートしています。詳細はVercelのドキュメントを参照してください。

#### DNS伝播の確認

DNS設定後、変更が伝播するまで数分から48時間かかる場合があります。

**伝播を確認**:

```bash

# サブドメインの場合

nslookup bingify.example.com

# Apexドメインの場合

nslookup example.com
```

VercelのIPアドレスが返ってくれば、DNS設定は正しく伝播しています。

### SSL証明書

VercelはLet's Encryptを使用して、自動的にSSL証明書を発行・更新します。

**SSL証明書の発行プロセス**:

1. DNS設定が完了し、伝播が確認される
2. Vercelが自動的にSSL証明書を発行 (約5-10分)
3. "Valid Configuration" と表示されたら完了

**トラブルシューティング**:

- DNS伝播が完了していない場合は待つ
- CAAレコードがある場合は、Let's Encryptを許可する設定を追加
- 問題が解決しない場合は、Vercelの "Remove" → "Re-add" でドメインを再追加

**環境変数の更新**:

カスタムドメインを追加したら、`NEXT_PUBLIC_SITE_URL` を更新:

```bash
NEXT_PUBLIC_SITE_URL=https://bingify.example.com
```

Vercel Dashboardの "Settings" → "Environment Variables" で更新し、再デプロイします。

---

## CI/CD統合 (GitHub連携)

VercelはGitHubと深く統合されており、自動デプロイとプレビュー環境を提供します。

### 自動デプロイの仕組み

**Vercel とGitHubの連携**:

1. GitHubリポジトリをVercelにインポートすると、自動的にGitHub Appがインストールされる
2. 以降、リポジトリへのプッシュやPR作成時にVercelが自動的にトリガーされる
3. ビルドとデプロイが自動実行される

**自動デプロイのトリガー**:

- **本番デプロイ**: `main` ブランチへのプッシュまたはマージ
- **プレビューデプロイ**: Pull Requestの作成または更新

### プレビューデプロイ

プレビューデプロイは、Pull Requestごとに独立した環境を提供します。

**プレビューデプロイの利点**:

- **変更の確認**: コードレビュー時に実際の動作を確認可能
- **独立した環境**: 本番環境に影響を与えずにテスト可能
- **自動更新**: PRが更新されるたびに自動で再デプロイ
- **共有可能**: チームメンバーや関係者と簡単に共有

**プレビューデプロイの使い方**:

1. Pull Requestを作成
2. Vercelが自動的にプレビューデプロイを作成
3. GitHubのPR画面にVercel Botがコメントを投稿し、プレビューURLを通知
4. URLをクリックして変更内容を確認

**環境変数の扱い**:

- プレビュー環境では、"Preview" にチェックを入れた環境変数が使用される
- 本番環境と異なる設定が必要な場合は、環境ごとに設定を分ける

**例**: プレビュー環境でベータ版バナーを表示する場合:

- Production: `NEXT_PUBLIC_SHOW_BETA_BANNER=false`
- Preview: `NEXT_PUBLIC_SHOW_BETA_BANNER=true`

### 本番デプロイ

`main` ブランチへのマージで自動的に本番デプロイが実行されます。

**本番デプロイのフロー**:

1. Pull Requestがレビュー・承認される
2. `main` ブランチへマージ
3. Vercelが自動的にビルドを開始
4. ビルドが成功すると、本番環境にデプロイ
5. Vercelが自動的に以前のデプロイからロールオーバー

**ロールバック**:

問題が発生した場合は、Vercel Dashboardからワンクリックでロールバック可能:

1. Vercel Dashboardの "Deployments" タブを開く
2. ロールバックしたいデプロイを見つける
3. "..." メニューから "Promote to Production" を選択

### デプロイフック

特定のイベントで手動デプロイをトリガーする場合は、デプロイフックを使用します。

**デプロイフックの作成**:

1. Vercel Dashboardの "Settings" → "Git" に移動
2. "Deploy Hooks" セクションで "Create Hook" をクリック
3. フック名とトリガーするブランチを設定
4. URLをコピー

**デプロイフックの使用例**:

```bash

# curl でデプロイをトリガー

curl -X POST https://api.vercel.com/v1/integrations/deploy/xxxxx/xxxxx
```

**用途**:

- CMS (コンテンツ管理システム) からのコンテンツ更新時
- 外部サービスとの連携
- 手動デプロイのトリガー

---

## パフォーマンス最適化

VercelでのBingifyのパフォーマンスを最大化するためのベストプラクティスです。

### Edge Network最適化

Vercelは世界中のエッジロケーションにアプリケーションをデプロイします。

**自動最適化**:

- **グローバルCDN**: 静的アセットは最寄りのエッジロケーションから配信
- **Edge Middleware**: MiddlewareはEdge Runtimeで実行され、低レイテンシーを実現
- **Smart Routing**: ユーザーの地理的位置に基づいて最適なルーティング

**追加の最適化**:

- **Supabaseリージョンの選択**: ユーザーベースに近いリージョンを選択
- **画像最適化の活用**: `next/image` を使用して画像を最適化
- **Static Generation**: 可能な限りStatic Generationを使用

### 画像最適化

Next.jsのImage OptimizationはVercelで自動的に有効化されます。

**Bingify での画像最適化**:

- **アバター画像**: OAuthプロバイダーから取得した画像を自動最適化
- **ビンゴカード画像**: ユーザーがアップロードした画像を最適化
- **OGP画像**: Open Graph画像を最適化

**Best practices**:

- `next/image` コンポーネントを常に使用
- 適切な `width` と `height` を指定
- `priority` 属性を重要な画像に使用 (LCP改善)
- WebP/AVIFフォーマットへの自動変換を活用 (Vercelが自動処理)

**設定の確認**:

`next.config.ts` で以下の設定が有効になっていることを確認:

```typescript
images: {
remotePatterns:[
{
hostname: "*.googleusercontent.com",
protocol: "https",
},
{
hostname: "*.supabase.co",
protocol: "https",
},
],
},
```

### キャッシング戦略

VercelはNext.jsの標準的なキャッシング戦略をサポートします。

**キャッシングレベル**:

1. **Browser Cache**: ブラウザーレベルのキャッシュ
2. **CDN Cache**: VercelのグローバルCDNキャッシュ
3. **ISR (Incremental Static Regeneration)**: サーバーサイドキャッシュ

**Bingify のキャッシング**:

- **静的ページ**: 利用規約、プライバシーポリシーなど
- **動的ページ**: ビンゴスペースはリアルタイム性が重要なため、キャッシュは最小限
- **API Routes**: 必要に応じて `revalidate` を設定

**キャッシュの無効化**:

Vercel Dashboardの "Deployments" → "..." → "Redeploy" でキャッシュをクリア可能。

### バンドルサイズの最適化

Vercelは自動的にバンドルサイズを最適化しますが、追加の最適化も可能です。

**自動最適化**:

- **Tree Shaking**: 未使用のコードを自動削除
- **Code Splitting**: ページごとに最適なバンドルを生成
- **Minification**: JavaScriptとCSSを自動で圧縮

**手動最適化**:

- **動的インポート**: 大きなコンポーネントは動的インポートを使用

  ```typescript
  const HeavyComponent = dynamic(() => import("./HeavyComponent"), {
  loading: () => <p>Loading...</p>,
  });
  ```

- **依存関係の見直し**: 不要な依存関係を削除
- **バンドルアナライザー**: バンドルサイズを分析して最適化

**バンドルサイズの確認**:

Vercel Dashboardの "Analytics" → "Web Vitals" でバンドルサイズとパフォーマンスメトリクスを確認できます。

---

## モニタリングとデバッグ

Vercelは強力なモニタリングとデバッグツールを提供します。

### リアルタイムログ

**ログの確認方法**:

1. Vercel Dashboardの該当プロジェクトを開く
2. "Logs" タブをクリック
3. リアルタイムでログが表示される

**ログのフィルタリング**:

- **Environment**: Production、Preview、Developmentでフィルター
- **Function**: 特定のServerless Functionのログのみ表示
- **Status Code**: HTTPステータスコードでフィルター
- **Search**: キーワード検索

**ログの保持期間**:

- **Hobby プラン**: 1日
- **Pro プラン**: 7日
- **Enterprise プラン**: カスタム設定可能

### Analytics

Vercel AnalyticsはWeb Vitalsとユーザー体験メトリクスを提供します。

**有効化方法**:

1. Vercel Dashboardの "Analytics" タブを開く
2. "Enable Analytics" をクリック
3. 課金プランに応じて有効化される (Proプラン以上で全機能利用可能)

**主要メトリクス**:

- **LCP (Largest Contentful Paint)**: ページの主要コンテンツが表示されるまでの時間
- **FID (First Input Delay)**: ユーザーの最初の操作に対する応答時間
- **CLS (Cumulative Layout Shift)**: レイアウトのずれ
- **TTFB (Time to First Byte)**: サーバーからの最初の応答時間

### Speed Insights

Vercel Speed Insightsは、実際のユーザーデータに基づくパフォーマンス分析を提供します。

**有効化方法**:

Speed InsightsはProプラン以上で自動的に有効化されます。

**確認方法**:

1. Vercel Dashboardの "Speed Insights" タブを開く
2. Web Vitalsスコアとページごとのパフォーマンスを確認
3. 改善が必要な箇所を特定

### エラートラッキング

**サーバーエラーの確認**:

1. Vercel Dashboardの "Logs" タブで500エラーをフィルター
2. エラースタックトレースを確認
3. 該当するコードを修正

**クライアントエラーの確認**:

クライアント側のエラーは、ブラウザーの開発者ツールで確認できます。より詳細なエラートラッキングが必要な場合は、Sentryなどの外部サービスを統合することを推奨します。

**Sentryの統合 (オプション)**:

1. [Sentry](https://sentry.io/) でプロジェクトを作成
2. `@sentry/Next.js` をインストール

   ```bash
   pnpm add @sentry/Next.js
   ```

3. `sentry.client.config.ts` と `sentry.server.config.ts` を設定
4. VercelにSentryの環境変数を追加

---

## Cronジョブの設定

Vercelは `vercel.json` で定義されたCronジョブを自動実行します。

### 設定内容の確認

Bingifyには以下のCronジョブが設定されています (`vercel.json`):

```json
{
"crons":[
{
"path": "/api/cron/cleanup",
"schedule": "0 18 * * *"
},
{
"path": "/api/cron/token-refresh",
"schedule": "*/5 * * * *"
}
]
}
```

**ジョブの詳細**:

- **cleanup**: 毎日18:00 UTCに実行され、古いデータをクリーンアップ
- **token-refresh**: 5分ごとに実行され、トークンをリフレッシュ

### Cronジョブの動作確認

**Vercel Dashboard での確認**:

1. Vercel Dashboardの該当プロジェクトを開く
2. "Cron Jobs" タブをクリック (Proプラン以上)
3. 実行履歴とステータスを確認

**手動実行によるテスト**:

```bash

# cleanup ジョブをテスト

curl -X POST https://your-domain.vercel.app/api/cron/cleanup \
 -H "Authorization: Bearer YOUR_CRON_SECRET"

# token-refresh ジョブをテスト

curl -X POST https://your-domain.vercel.app/api/cron/token-refresh \
 -H "Authorization: Bearer YOUR_CRON_SECRET"
```

`YOUR_CRON_SECRET` は環境変数の `CRON_SECRET` と同じ値を使用します。

### Cronジョブの制限事項

- **Hobby プラン**: Cronジョブは利用不可 (Proプラン以上が必要)
- **実行時間制限**: 最大10秒 (Proプラン)、60秒 (Enterpriseプラン)
- **タイムゾーン**: すべてのスケジュールはUTC

**Hobby プランの代替案**:

Hobbyプランを使用している場合は、以下の代替案を検討してください:

- **GitHub Actions**: GitHub ActionsでCronジョブを実行し、VercelのAPIを呼び出す
- **外部 Cron サービス**: [cron-job.org](https://cron-job.org/) などの外部サービスを使用
- **Supabase Edge Functions**: SupabaseのEdge Functionsで定期実行

---

## トラブルシューティング

よくある問題と解決方法です。

### デプロイエラー

#### **問題**: ビルドが失敗する

**症状**:

```
Error: Cannot find module 'next'
```

**解決方法**:

1. `package.json` が正しくコミットされているか確認
2. Vercelの "Settings" → "General" → "Build & Development Settings" で以下を確認:
   - **Build Command**: `pnpm build`
   - **Install Command**: `pnpm install`
3. Node.jsバージョンを確認 (24.xが必要):
   - `package.json` に `"engines": { "node": "24.x" }` を追加

#### **問題**: 環境変数が反映されない

**症状**: 設定した環境変数が使用されない

**解決方法**:

1. Vercel Dashboardの "Settings" → "Environment Variables" で設定を確認
2. 環境 (Production、Preview、Development) が正しく選択されているか確認
3. `NEXT_PUBLIC_` プレフィックスの有無を確認
   - クライアント側で使用する変数には `NEXT_PUBLIC_` が必要
   - サーバー側のみで使用する変数には不要
4. 環境変数を更新した後は、**必ず再デプロイ**を実行
   - Vercel Dashboardの "Deployments" → "..." → "Redeploy"

### データベース接続エラー

#### **問題**: データベース接続エラー

**症状**:

```
Error: connect ECONNREFUSED
```

**解決方法**:

1. Supabaseプロジェクトが起動しているか確認
2. 環境変数 `NEXT_PUBLIC_SUPABASE_URL` が正しく設定されているか確認
3. ネットワーク接続を確認:

   ```bash
   curl $NEXT_PUBLIC_SUPABASE_URL
   ```

4. Supabase Dashboardで "Paused" 状態になっていないか確認 (無料プランは非アクティブ時に自動停止)

#### **問題**: Realtime機能が動作しない

**症状**: リアルタイム更新が反映されない

**解決方法**:

1. Supabase Dashboardの "Database" → "Replication" で以下のテーブルがReplication対象か確認:
   - `spaces`
   - `bingo_cards`
   - `called_numbers`
2. ブラウザーのコンソールでWebSocket接続エラーを確認
3. Vercelのネットワーク設定を確認 (通常は設定不要)

### OAuth認証エラー

#### **問題**: OAuthログインが失敗する

**症状**: "OAuth callback error" が表示される

**解決方法**:

1. OAuthプロバイダーのリダイレクトURIを確認:
   - 正しいURL: `https://your-project.supabase.co/auth/v1/callback`
   - 誤ったURL: `http://your-project.supabase.co/auth/v1/callback` (HTTPは不可)
   - 誤ったURL: `https://your-domain.vercel.app/auth/callback` (Vercel URLは不可)
2. 環境変数を確認:
   - `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`
   - `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`
3. Supabase Dashboardの "Authentication" → "Providers" で設定を確認
4. OAuthプロバイダーのコンソールでアプリケーションが有効化されているか確認

### パフォーマンス問題

#### **問題**: ページの読み込みが遅い

**症状**: 初回アクセスに10秒以上かかる

**解決方法**:

1. Vercel Analyticsでボトルネックを特定
2. 画像最適化を確認:
   - `next/image` コンポーネントを使用しているか
   - 画像サイズが適切か (大きすぎる画像は避ける)
3. データベースクエリを最適化:
   - 不要なデータを取得していないか
   - インデックスが適切に設定されているか
4. キャッシング戦略を見直す

#### **問題**: Cronジョブが実行されない

**症状**: クリーンアップやトークン更新が動作しない

**解決方法**:

1. Vercelのプランを確認 (HobbyプランではCronジョブは利用不可)
2. `CRON_SECRET` が設定されているか確認
3. Vercel Dashboardの "Cron Jobs" で実行履歴を確認 (Proプラン以上)
4. 手動でCronエンドポイントを実行してテスト:

   ```bash
   curl -X POST https://your-domain.vercel.app/api/cron/cleanup \
    -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

---

## コスト管理

Vercelの料金プランとコスト管理のポイントです。

### 料金プラン

| プラン         | 月額料金 | 主な特徴                                                   |
| :------------- | :------- | :--------------------------------------------------------- |
| **Hobby**      | 無料     | 個人プロジェクト向け、Cron ジョブなし                      |
| **Pro**        | $20/月   | 商用プロジェクト向け、Cron ジョブ、Analytics、優先サポート |
| **Enterprise** | カスタム | 大規模プロジェクト向け、SLA、専任サポート                  |

**詳細**: [Vercel Pricing](https://vercel.com/pricing)

### Bingify に推奨されるプラン

- **開発・テスト**: Hobbyプラン (無料)
- **本番環境 (小規模)**: Proプラン ($20/月)
- **本番環境 (大規模)**: Enterpriseプラン

**Pro プランが必要な理由**:

- Cronジョブが必須 (cleanupとtoken-refresh)
- AnalyticsとSpeed Insightsでパフォーマンス監視
- 商用利用のライセンス要件

### コスト最適化のヒント

1. **画像最適化**: `next/image` を使用して帯域幅を削減
2. **キャッシング**: 静的コンテンツは積極的にキャッシュ
3. **Serverless Function 実行時間**: 不要な処理を削減
4. **Supabase 無料プラン**: 小規模プロジェクトではSupabaseの無料プランで開始
5. **帯域幅監視**: Vercel Dashboardで帯域幅使用量を定期的に確認

---

## サポートとリソース

### 公式ドキュメント

- **Vercel ドキュメント**: [https://vercel.com/docs](https://vercel.com/docs)
- **Next.js ドキュメント**: [https://nextjs.org/docs](https://nextjs.org/docs)
- **Supabase ドキュメント**: [https://supabase.com/docs](https://supabase.com/docs)

### Bingify のリソース

- **GitHub リポジトリ**: [https://github.com/ykzts/Bingify](https://github.com/ykzts/bingify)
- **Issue トラッカー**: [https://github.com/ykzts/bingify/issues](https://github.com/ykzts/bingify/issues)
- **Readme**: [README.md](../README.md)
- **コントリビューションガイド**: [CONTRIBUTING.md](../CONTRIBUTING.md)
- **セルフホスティングガイド**: [SELF_HOSTED.md](./SELF_HOSTED.md)

### コミュニティ

問題が解決しない場合は、以下のリソースを活用してください:

- **GitHub Discussions**: [https://github.com/ykzts/bingify/discussions](https://github.com/ykzts/bingify/discussions)
- **GitHub Issues**: バグ報告や機能リクエスト

---

## まとめ

このガイドでは、VercelでのBingifyのデプロイ方法を詳しく説明しました。

**主要なステップの要約**:

1. Supabaseプロジェクトを作成し、接続情報を取得
2. GitHubリポジトリをフォーク
3. Vercelにリポジトリをインポート
4. 環境変数を設定 (特に `CRON_SECRET` を忘れずに)
5. デプロイを実行
6. カスタムドメインを設定 (オプション)
7. OAuthを設定 (Google、Twitch)
8. モニタリングとパフォーマンス最適化

**次のステップ**:

- アプリケーションをカスタマイズ
- ユーザーを招待してテスト
- Analyticsでパフォーマンスを監視
- コミュニティにフィードバックを提供

Vercelでのデプロイにより、Bingifyは高速で信頼性の高いホスティング環境で動作します。何か問題が発生した場合は、[トラブルシューティング](#トラブルシューティング) セクションまたはGitHub Issuesを参照してください。

---

**ライセンス**: このドキュメントは [MIT License](../LICENSE) の下で配布されています。
