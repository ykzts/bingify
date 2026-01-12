# Docker Compose クイックスタートガイド

このファイルは、Docker Composeを使用してBingifyをすぐに起動するための最小限の手順を示します。

## 前提条件

- Docker と Docker Compose がインストールされていること
- Supabaseプロジェクト（Cloud または Self-hosted）が準備されていること

## 最小構成での起動（5分）

### 1. 環境変数の設定

```bash
# .env.production.exampleをコピー
cp .env.production.example .env.production

# 最低限必要な値を設定（エディタで開く）
nano .env.production
```

**必須の環境変数:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
POSTGRES_PASSWORD=your_secure_password_here
```

### 2. 起動

```bash
# アプリケーションとデータベースを起動
docker compose up -d

# ログを確認
docker compose logs -f app
```

### 3. アクセス

ブラウザで http://localhost:3000 を開く

### 4. 停止

```bash
docker compose down
```

## 各構成オプション

### オプション A: アプリケーションのみ (Supabase Cloud 使用)

```bash
# PostgreSQLコンテナを起動せずにアプリケーションのみ起動
docker compose up -d app
```

この場合、`POSTGRES_PASSWORD` は不要です。

### オプション B: アプリケーション + PostgreSQL

```bash
# デフォルト構成（両方起動）
docker compose up -d
```

### オプション C: アプリケーション + PostgreSQL + nginx

```bash
# docker-compose.yml のnginxセクションのコメントを解除してから
docker compose up -d
```

nginx経由で http://localhost でアクセス可能になります。

## トラブルシューティング

### コンテナが起動しない

```bash
# ログを確認
docker compose logs app

# 設定を検証
docker compose config
```

### ポートが既に使用されている

```bash
# docker-compose.yml を編集してポートを変更
# 例: ports: - "3001:3000"
```

### データベース接続エラー

```bash
# PostgreSQLが起動しているか確認
docker compose ps postgres

# PostgreSQLのログを確認
docker compose logs postgres
```

## 詳細情報

より詳しい情報は以下のドキュメントを参照してください：

- [README.md](../README.md) - プロジェクト全体の説明
- [DOCKER_COMPOSE.md](./DOCKER_COMPOSE.md) - 詳細なDocker Compose デプロイガイド
- [.env.production.example](../.env.production.example) - 環境変数の完全なリスト

## よくある質問

**Q: Supabase Cloud を使う場合、PostgreSQLコンテナは必要ですか？**

A: いいえ、必要ありません。`docker compose up -d app` でアプリケーションのみ起動してください。

**Q: nginxは必須ですか？**

A: いいえ、オプションです。開発環境やシンプルな構成では不要です。本番環境でSSLが必要な場合に使用します。

**Q: 環境変数を変更したらどうすればいいですか？**

A: `.env.production` を編集後、`docker compose restart app` でアプリケーションを再起動してください。

**Q: データをバックアップするには？**

A: `docker compose exec postgres pg_dump -U postgres bingify > backup.sql` でダンプできます。

**Q: HTTPSを有効にするには？**

A: nginx を有効化し、SSL証明書を `nginx/ssl/` に配置してから `nginx/conf.d/default.conf` のSSL設定のコメントを解除してください。
