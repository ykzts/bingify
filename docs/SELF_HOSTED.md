# セルフホスティングガイド (Self-Hosting Guide)

このドキュメントは、Bingifyを自身のインフラストラクチャでホストするための包括的なガイドです。

## 目次

- [システム要件](#システム要件)
- [デプロイ方法](#デプロイ方法)
  - [Vercelでのデプロイ (推奨)](#vercelでのデプロイ-推奨)
  - [Dockerでのデプロイ](#dockerでのデプロイ)
  - [手動インストール](#手動インストール)
- [環境変数の設定](#環境変数の設定)
- [データベースの設定](#データベースの設定)
  - [Supabase Cloud (推奨)](#supabase-cloud-推奨)
  - [Supabase OSS版](#supabase-oss版)
  - [PostgreSQL互換データベース](#postgresql互換データベース)
- [セキュリティに関する推奨事項](#セキュリティに関する推奨事項)
- [トラブルシューティング](#トラブルシューティング)

---

## システム要件

### 最小要件

- **Node.js**: 24.x以上 (LTS推奨)
- **pnpm**: 10.27.0以上
- **メモリ**: 最小512MB RAM (推奨1GB以上)
- **ストレージ**: 最小500MB (依存関係とビルド成果物用)
- **データベース**: PostgreSQL 15以上 (Supabase推奨)

### 推奨要件

- **Node.js**: 24.x (最新LTS)
- **pnpm**: 最新版
- **メモリ**: 2GB RAM以上
- **ストレージ**: 1GB以上
- **データベース**: Supabase CloudまたはSupabase OSS版

### 対応プラットフォーム

- **ホスティングプラットフォーム**: Vercel (推奨)、Docker対応環境、VPS、クラウドサーバー
- **OS**: Linux (Ubuntu 24.04推奨)、macOS、Windows (WSL2推奨)
- **データベース**: Supabase、PostgreSQL 15+

---

## デプロイ方法

### Vercelでのデプロイ (推奨)

BingifyはVercelでのホストを強く推奨します。VercelはNext.jsアプリケーションの最適なパフォーマンスとシームレスな統合を提供します。

**詳細なVercelデプロイガイド**: [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)

Vercelデプロイガイドには、以下の詳細情報が含まれています:

- クイックスタートガイド
- 詳細なセットアップ手順 (Supabase連携、環境変数設定)
- カスタムドメインの設定
- CI/CD統合 (GitHub連携、プレビューデプロイ)
- パフォーマンス最適化
- モニタリングとデバッグ
- Cronジョブの設定
- トラブルシューティング
- コスト管理

**クイックスタート** (詳細は [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) を参照):

1. [Bingify GitHubリポジトリ](https://github.com/ykzts/bingify) をフォーク
2. [Vercel Dashboard](https://vercel.com/dashboard) でリポジトリをインポート
3. 環境変数を設定 (最低限: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`)
4. デプロイを実行

---

### Dockerでのデプロイ

Docker環境でBingifyをホストする手順です。

#### 前提条件

- Docker 20.10以上
- Docker Compose 2.0以上 (オプション)
- 2GB以上のRAM
- PostgreSQLデータベース (Supabase Cloud推奨)

#### デプロイ手順

1. **リポジトリをクローン**

   ```bash
   git clone https://github.com/ykzts/bingify.git
   cd bingify
   ```

2. **環境変数ファイルを作成**

   `.env.local.example` をコピーして `.env.production` を作成：

   ```bash
   cp .env.local.example .env.production
   ```

   `.env.production` を編集して本番環境の値を設定：

   ```bash
   # Supabase接続 (必須)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # サイトURL (必須)
   NEXT_PUBLIC_SITE_URL=https://your-domain.com

   # その他の設定
   NEXT_PUBLIC_SHOW_BETA_BANNER=false
   ```

3. **Dockerイメージをビルド**

   ```bash
   docker build -t bingify:latest .
   ```

   マルチステージビルドにより、最適化された軽量イメージが生成されます。

4. **コンテナを実行**

   環境変数ファイルを使用して実行：

   ```bash
   docker run -d \
     --name bingify \
     -p 3000:3000 \
     --env-file .env.production \
     --restart unless-stopped \
     bingify:latest
   ```

   または、個別に環境変数を指定：

   ```bash
   docker run -d \
     --name bingify \
     -p 3000:3000 \
     -e NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
     -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
     -e SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
     -e NEXT_PUBLIC_SITE_URL=https://your-domain.com \
     --restart unless-stopped \
     bingify:latest
   ```

5. **動作確認**

   ブラウザーで `http://localhost:3000` にアクセスして動作を確認します。

   ヘルスチェックエンドポイント：

   ```bash
   curl http://localhost:3000/api/health
   # 期待される応答: {"status":"ok","timestamp":"..."}
   ```

6. **リバースプロキシの設定 (推奨)**

   本番環境では、NginxやCaddyなどのリバースプロキシを使用してHTTPS終端を行うことを推奨します。

   **Nginx設定例**:

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name your-domain.com;

       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

#### Docker Composeを使用した構成

より複雑な構成の場合、Docker Composeの使用を推奨します。

**docker-compose.yml の例**:

```yaml
services:
  bingify:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    healthcheck:
      test:
        [
          "CMD",
          "node",
          "-e",
          "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})",
        ]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s
```

実行:

```bash
docker-compose up -d
```

#### Dockerイメージの特徴

- **マルチステージビルド**: 最適化された小さなイメージサイズ (約200MB)
- **Node.js 24 Alpine**: 軽量なベースイメージ
- **非rootユーザー**: セキュリティのための専用ユーザー (UID: 1001)
- **ヘルスチェック**: コンテナの健全性を自動監視
- **Standalone出力**: 依存関係を含む自己完結型ビルド

#### 定期ジョブ (Cron) の設定

Dockerデプロイでは、Cronジョブを手動で設定する必要があります。

**システムCronを使用する場合**:

```bash
# crontabを編集
crontab -e

# クリーンアップジョブ (毎日18:00 UTC)
0 18 * * * curl -X POST http://localhost:3000/api/cron/cleanup -H "Authorization: Bearer YOUR_CRON_SECRET"

# トークン更新ジョブ (5分ごと)
*/5 * * * * curl -X POST http://localhost:3000/api/cron/token-refresh -H "Authorization: Bearer YOUR_CRON_SECRET"
```

`YOUR_CRON_SECRET` は `.env.production` の `CRON_SECRET` と同じ値を使用してください。

---

### 手動インストール

VPSやクラウドサーバーで直接Bingifyを実行する手順です。

#### 前提条件

- Node.js 24.x以上
- pnpm 10.27.0以上
- PostgreSQLデータベース (Supabase Cloud推奨)
- systemdまたは類似のプロセス管理ツール

#### インストール手順

1. **リポジトリをクローン**

   ```bash
   git clone https://github.com/ykzts/bingify.git
   cd bingify
   ```

2. **依存関係をインストール**

   ```bash
   pnpm install --frozen-lockfile
   ```

3. **環境変数を設定**

   `.env.local.example` をコピーして `.env.production.local` を作成：

   ```bash
   cp .env.local.example .env.production.local
   ```

   `.env.production.local` を編集して本番環境の値を設定します。

4. **本番ビルドを実行**

   ```bash
   pnpm build
   ```

   ビルド成果物は `.next` ディレクトリに生成されます。

5. **本番サーバーを起動**

   ```bash
   NODE_ENV=production pnpm start
   ```

   サーバーは `http://localhost:3000` で起動します。

#### systemdサービスの設定 (推奨)

systemdを使用してBingifyをバックグラウンドサービスとして実行します。

1. **サービスファイルを作成**

   `/etc/systemd/system/bingify.service` を作成：

   ```ini
   [Unit]
   Description=Bingify Application
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/bingify
   Environment="NODE_ENV=production"
   Environment="PORT=3000"
   EnvironmentFile=/var/www/bingify/.env.production.local
   ExecStart=/usr/local/bin/pnpm start
   Restart=on-failure
   RestartSec=10
   StandardOutput=syslog
   StandardError=syslog
   SyslogIdentifier=bingify

   [Install]
   WantedBy=multi-user.target
   ```

2. **サービスを有効化して起動**

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable bingify
   sudo systemctl start bingify
   ```

3. **サービス状態を確認**

   ```bash
   sudo systemctl status bingify
   ```

4. **ログを確認**

   ```bash
   sudo journalctl -u bingify -f
   ```

#### PM2を使用したプロセス管理 (代替案)

systemdの代わりにPM2を使用できます。

1. **PM2をインストール**

   ```bash
   npm install -g pm2
   ```

2. **PM2でアプリケーションを起動**

   ```bash
   pm2 start pnpm --name bingify -- start
   pm2 save
   pm2 startup
   ```

3. **プロセス状態を確認**

   ```bash
   pm2 status
   pm2 logs bingify
   ```

#### 定期ジョブ (Cron) の設定

手動インストールの場合も、Cronジョブを設定する必要があります。

```bash
# crontabを編集
crontab -e

# クリーンアップジョブ (毎日18:00 UTC)
0 18 * * * curl -X POST http://localhost:3000/api/cron/cleanup -H "Authorization: Bearer YOUR_CRON_SECRET"

# トークン更新ジョブ (5分ごと)
*/5 * * * * curl -X POST http://localhost:3000/api/cron/token-refresh -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 環境変数の設定

Bingifyの動作に必要な環境変数の詳細です。`.env.local.example` を参照して設定してください。

### 必須の環境変数

| 変数名                          | 説明                                    | 例                                |
| :------------------------------ | :-------------------------------------- | :-------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | SupabaseプロジェクトURL                 | `https://xxx.supabase.co`         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase匿名キー                        | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabaseサービスロールキー (管理者権限) | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| `NEXT_PUBLIC_SITE_URL`          | サイトURL (OAuth リダイレクト用)        | `https://your-domain.com`         |
| `CRON_SECRET`                   | Cronジョブ認証用シークレット (必須)     | `your-random-secret-string`       |

**重要**: `CRON_SECRET` は必ず設定してください。設定しない場合、不正なCronジョブの実行を防げません。

### 推奨の環境変数

| 変数名                         | 説明                       | デフォルト | 例                |
| :----------------------------- | :------------------------- | :--------- | :---------------- |
| `NEXT_PUBLIC_SHOW_BETA_BANNER` | ベータ版バナーの表示制御   | `true`     | `false`           |
| `SEND_EMAIL_HOOK_SECRETS`      | Supabase Auth Hook署名検証 | -          | `v1,whsec_xxx...` |

### SMTP設定 (お問い合わせフォーム)

| 変数名        | 説明                 | 例                        |
| :------------ | :------------------- | :------------------------ |
| `SMTP_HOST`   | SMTPサーバーホスト   | `smtp.example.com`        |
| `SMTP_PORT`   | SMTPポート           | `587`                     |
| `SMTP_USER`   | SMTPユーザー名       | `user`                    |
| `SMTP_PASS`   | SMTPパスワード       | `password`                |
| `SMTP_SECURE` | TLS使用フラグ        | `false`                   |
| `MAIL_FROM`   | 送信元メールアドレス | `noreply@your-domain.com` |

送信先は `profiles` テーブルの `role = 'admin'` のユーザーに自動送信されます。

### OAuth認証設定 (オプション)

GoogleとTwitchのOAuth認証を有効にする場合に設定します。

| 変数名                                    | 説明                        | 取得方法                                                       |
| :---------------------------------------- | :-------------------------- | :------------------------------------------------------------- |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` | Google OAuth クライアントID | [Google Cloud Console](https://console.cloud.google.com/)      |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`    | Google OAuth シークレット   | Google Cloud Console                                           |
| `SUPABASE_AUTH_EXTERNAL_TWITCH_CLIENT_ID` | Twitch OAuth クライアントID | [Twitch Developer Console](https://dev.twitch.tv/console/apps) |
| `SUPABASE_AUTH_EXTERNAL_TWITCH_SECRET`    | Twitch OAuth シークレット   | Twitch Developer Console                                       |

**OAuth設定手順**:

1. 各プロバイダーのコンソールでOAuthアプリケーションを作成
2. リダイレクトURIを設定: `https://your-domain.com/auth/callback`
3. クライアントIDとシークレットを取得
4. 環境変数に設定
5. Supabase DashboardのAuthentication > Providersで各プロバイダーを有効化

### アクセス制御 (オプション)

| 変数名                | 説明                    | デフォルト | 例         |
| :-------------------- | :---------------------- | :--------- | :--------- |
| `ENABLE_BASIC_AUTH`   | Basic認証の有効化フラグ | `false`    | `true`     |
| `BASIC_AUTH_USER`     | Basic認証ユーザー名     | -          | `admin`    |
| `BASIC_AUTH_PASSWORD` | Basic認証パスワード     | -          | `password` |

Basic認証は公開前の制限やステージング環境の保護に使用できます。

### オプション機能

| 変数名                           | 説明                             | 取得方法                                             |
| :------------------------------- | :------------------------------- | :--------------------------------------------------- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstileサイトキー   | [Cloudflare Dashboard](https://dash.cloudflare.com/) |
| `TURNSTILE_SECRET_KEY`           | Cloudflare Turnstileシークレット | Cloudflare Dashboard                                 |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`  | Google Analytics測定ID           | [Google Analytics](https://analytics.google.com/)    |

---

## データベースの設定

BingifyはSupabaseを使用します。Supabase Cloud (推奨) またはSupabase OSS版を使用してください。

### Supabase Cloud (推奨)

Supabase Cloudは最も簡単で推奨される方法です。

#### セットアップ手順

1. **Supabaseプロジェクトを作成**

   [Supabase Dashboard](https://supabase.com/dashboard) にアクセスし、新しいプロジェクトを作成します。

2. **接続情報を取得**
   - Dashboardの "Settings" → "API" で以下の情報を取得：
     - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
     - anon/public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
     - service_role key (`SUPABASE_SERVICE_ROLE_KEY`)

3. **マイグレーションを実行**

   ローカル環境でSupabase CLIを使用してマイグレーションを適用：

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

   または、Supabase Dashboardの "SQL Editor" から `supabase/migrations/*.sql` ファイルの内容を手動で実行します。

4. **Row Level Security (RLS) を確認**

   マイグレーションによりRLSポリシーが自動的に設定されます。Dashboardの "Authentication" → "Policies" で確認してください。

5. **Realtime機能を有効化**

   Dashboardの "Database" → "Replication" で以下のテーブルのRealtimeを有効化：
   - `spaces`
   - `bingo_cards`
   - `called_numbers`

6. **OAuth プロバイダーを設定 (オプション)**

   Dashboardの "Authentication" → "Providers" でGoogleとTwitchを有効化し、各プロバイダーのクライアントIDとシークレットを設定します。

#### Supabase Cloudの利点

- **フルマネージド**: インフラ管理不要
- **自動バックアップ**: 毎日自動バックアップ
- **スケーラビリティ**: 自動スケーリング
- **Realtime機能**: 組み込みのリアルタイムサブスクリプション
- **認証機能**: OAuth統合
- **無料プラン**: 小規模プロジェクトには無料プランで十分

---

### Supabase OSS版

Supabaseのオープンソース版を自分でホスト可能です。

詳細なセットアップ手順については、[Supabase公式ドキュメント](https://supabase.com/docs/guides/self-hosting) を参照してください。

**重要なポイント**:

- Bingifyリポジトリの `supabase/migrations` ディレクトリにあるマイグレーションファイルを適用する必要があります
- `supabase/config.toml` の設定を本番環境に合わせて調整してください
- 定期的なバックアップとアップデートの運用計画を立ててください

---

## セキュリティに関する推奨事項

セルフホスティング時のセキュリティベストプラクティスです。

### 1. 環境変数の管理

- **機密情報の保護**: `.env.production.local` や `.env.production` はGit管理に含めない
- **強力なシークレット**: すべてのシークレットキーは強力なランダム文字列を使用
  ```bash
  # 安全なランダム文字列の生成
  openssl rand -base64 32
  ```
- **環境変数の暗号化**: VaultやAWS Secrets Managerなどを使用した機密情報の暗号化

### 2. データベースセキュリティ

- **Row Level Security (RLS)**: Supabaseでは必ずRLSを有効化 (マイグレーションで自動設定)
- **最小権限の原則**: アプリケーションユーザーには必要最小限の権限のみ付与
- **パスワード強度**: データベースパスワードは20文字以上の複雑な文字列を使用
- **ネットワーク制限**: データベースへのアクセスはアプリケーションサーバーからのみ許可
- **SSL/TLS接続**: データベース接続は必ずSSL/TLSを使用

### 3. HTTPS/TLS

- **必須**: 本番環境では必ずHTTPSを使用
- **証明書**: Let's Encryptなどの信頼できるCAから証明書を取得
- **HSTS**: HTTPSのみを強制するHTTP Strict Transport Security (HSTS) を有効化
- **リダイレクト**: HTTPからHTTPSへの自動リダイレクトを設定

**Nginx HSTS設定例**:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### 4. ファイアウォールとネットワーク

- **最小限のポート公開**: 必要なポート (80, 443) のみを公開
- **内部通信**: データベースとアプリケーション間の通信は内部ネットワークを使用
- **DDoS保護**: Cloudflareなどを使用したDDoS保護
- **レート制限**: APIエンドポイントへのレート制限を設定

### 5. アプリケーションセキュリティ

- **依存関係の更新**: 定期的に依存関係を更新してセキュリティパッチを適用
  ```bash
  pnpm update
  ```
- **脆弱性スキャン**: `pnpm audit` で依存関係の脆弱性をチェック
  ```bash
  pnpm audit
  ```
- **CSP (Content Security Policy)**: コンテンツセキュリティポリシーを設定
- **CORS設定**: 適切なCORS設定で不正なアクセスを防止

### 6. OAuth認証

- **リダイレクトURI検証**: 厳格なリダイレクトURI検証を設定
- **スコープの最小化**: 必要最小限のOAuthスコープのみを要求
- **トークン管理**: アクセストークンとリフレッシュトークンを適切に管理

### 7. ログとモニタリング

- **アクセスログ**: すべてのアクセスをログに記録
- **エラーログ**: エラーを詳細に記録し、定期的に確認
- **異常検知**: 異常なトラフィックやアクセスパターンを検知
- **ログローテーション**: ログファイルを定期的にローテーション

**systemdのログを確認**:

```bash
sudo journalctl -u bingify -f
```

### 8. バックアップ

- **定期バックアップ**: データベースを毎日バックアップ
- **バックアップテスト**: バックアップからの復元を定期的にテスト
- **オフサイトバックアップ**: バックアップを別の場所に保存

**PostgreSQLバックアップスクリプト例**:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="bingify"

pg_dump -U postgres $DB_NAME | gzip > $BACKUP_DIR/bingify_$DATE.sql.gz

# 7日以上古いバックアップを削除
find $BACKUP_DIR -name "bingify_*.sql.gz" -mtime +7 -delete
```

### 9. セキュリティヘッダー

Next.jsの `next.config.ts` にセキュリティヘッダーを追加：

```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};
```

### 10. 定期的なセキュリティ監査

- **コードレビュー**: すべての変更をレビュー
- **ペネトレーションテスト**: 定期的なセキュリティテスト
- **セキュリティアップデート**: OSとソフトウェアを最新状態に保つ

---

## トラブルシューティング

よくある問題と解決方法です。

### デプロイ関連

#### **問題**: ビルドが失敗する

**症状**:

```
Error: Cannot find module 'next'
```

**解決方法**:

1. 依存関係を再インストール：

   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install --frozen-lockfile
   ```

2. Node.jsのバージョンを確認：

   ```bash
   node --version  # 24.x以上が必要
   ```

3. pnpmのバージョンを確認：

   ```bash
   pnpm --version  # 10.27.0以上が必要
   ```

#### **問題**: Dockerビルドが遅い

**症状**: Dockerビルドに10分以上かかる

**解決方法**:

1. Dockerのビルドキャッシュを活用：

   ```bash
   docker build --cache-from bingify:latest -t bingify:latest .
   ```

2. `.dockerignore` を確認して不要なファイルを除外

3. マルチステージビルドを最適化 (Dockerfileは既に最適化済み)

---

### データベース関連

#### **問題**: データベース接続エラー

**症状**:

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解決方法**:

1. Supabaseが起動していることを確認：

   ```bash
   supabase status
   ```

2. 環境変数を確認：

   ```bash
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

3. ネットワーク接続を確認：

   ```bash
   curl $NEXT_PUBLIC_SUPABASE_URL
   ```

4. ファイアウォール設定を確認

#### **問題**: マイグレーションが失敗する

**症状**:

```
Error: relation "spaces" already exists
```

**解決方法**:

1. データベースの状態を確認：

   ```bash
   supabase db diff
   ```

2. 既存のマイグレーションをロールバック (慎重に)：

   ```bash
   supabase db reset
   ```

3. マイグレーションファイルを手動で適用：

   ```bash
   psql -U postgres -d bingify -f supabase/migrations/xxx.sql
   ```

#### **問題**: Realtime機能が動作しない

**症状**: リアルタイム更新が反映されない

**解決方法**:

1. Supabase DashboardでReplicationが有効か確認
2. 該当テーブル (`spaces`, `bingo_cards`, `called_numbers`) がReplication対象に含まれているか確認
3. ブラウザーのコンソールでWebSocket接続エラーを確認
4. ネットワークがWebSocketをブロックしていないか確認

---

### 認証関連

#### **問題**: OAuthログインが失敗する

**症状**: "OAuth callback error" が表示される

**解決方法**:

1. OAuthプロバイダーのリダイレクトURIを確認：
   - 正しいURL: `https://your-domain.com/auth/callback`
   - 誤ったURL: `http://your-domain.com/auth/callback` (HTTPは不可)

2. 環境変数を確認：

   ```bash
   echo $SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID
   echo $SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET
   ```

3. Supabase DashboardのAuthentication > Providers設定を確認

4. OAuthプロバイダーのコンソールでアプリケーションが有効化されているか確認

#### **問題**: セッションが維持されない

**症状**: ページをリロードするとログアウトされる

**解決方法**:

1. クッキー設定を確認 (HTTPS環境でのみSecure Cookieが有効)
2. `NEXT_PUBLIC_SITE_URL` が正しいドメインを指しているか確認
3. ブラウザーのクッキー設定を確認 (サードパーティクッキーがブロックされていないか)

---

### パフォーマンス関連

#### **問題**: ページの読み込みが遅い

**症状**: 初回アクセスに10秒以上かかる

**解決方法**:

1. Next.jsのビルドキャッシュを確認：

   ```bash
   pnpm build
   ```

2. CDNを使用 (Vercelでは自動)

3. 画像最適化を確認 (`next/image` を使用)

4. データベースクエリを最適化 (インデックス、RLSポリシー)

5. サーバーリソース (CPU、メモリ) を確認：

   ```bash
   htop
   free -h
   ```

#### **問題**: メモリ不足エラー

**症状**:

```
FATAL ERROR: Reached heap limit Allocation failed
```

**解決方法**:

1. Node.jsのヒープサイズを増やす：

   ```bash
   NODE_OPTIONS="--max-old-space-size=2048" pnpm start
   ```

2. サーバーのメモリを増やす (最低1GB、推奨2GB以上)

3. Dockerのメモリ制限を確認：

   ```bash
   docker stats
   ```

---

### Cron ジョブ関連

#### **問題**: Cronジョブが実行されない

**症状**: クリーンアップやトークン更新が動作しない

**解決方法**:

1. `CRON_SECRET` が設定されているか確認：

   ```bash
   echo $CRON_SECRET
   ```

2. Cronジョブのログを確認：

   ```bash
   # systemd cron
   sudo journalctl -u cron -f

   # crontab
   sudo tail -f /var/log/syslog
   ```

3. 手動でCronエンドポイントを実行してテスト：

   ```bash
   curl -X POST http://localhost:3000/api/cron/cleanup \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

4. Vercelの場合、Dashboardの "Cron Jobs" で実行履歴を確認

---

### その他

#### **問題**: 環境変数が反映されない

**症状**: 設定した環境変数が使用されない

**解決方法**:

1. `.env.production.local` ファイルの配置場所を確認 (プロジェクトルート)

2. Next.jsサーバーを再起動：

   ```bash
   # systemdの場合
   sudo systemctl restart bingify

   # PM2の場合
   pm2 restart bingify

   # Dockerの場合
   docker restart bingify
   ```

3. `NEXT_PUBLIC_` プレフィックスの有無を確認 (クライアント側で使用する変数には必須)

4. ビルド時に環境変数が必要な場合は再ビルド：

   ```bash
   pnpm build
   ```

#### **問題**: デプロイ後に404エラー

**症状**: すべてのページで404が表示される

**解決方法**:

1. Next.jsのビルドが成功しているか確認：

   ```bash
   ls -la .next/
   ```

2. `output: "standalone"` が設定されているか確認 (Docker使用時)

3. リバースプロキシの設定を確認 (Nginx、Caddyなど)

4. ポート設定を確認 (デフォルト: 3000)

---

## サポートとコミュニティ

問題が解決しない場合は、以下のリソースを参照してください：

- **GitHub Issues**: [https://github.com/ykzts/bingify/issues](https://github.com/ykzts/bingify/issues)
- **Readme**: [https://github.com/ykzts/bingify/blob/main/README.md](https://github.com/ykzts/bingify/blob/main/README.md)
- **CONTRIBUTING**: [https://github.com/ykzts/bingify/blob/main/CONTRIBUTING.md](https://github.com/ykzts/bingify/blob/main/CONTRIBUTING.md)

---

## ライセンス

Bingifyは [MIT License](https://github.com/ykzts/bingify/blob/main/LICENSE) の下で配布されています。
