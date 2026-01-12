# Docker Compose デプロイガイド

このドキュメントでは、Docker Compose を使用した Bingify のデプロイ方法について説明します。

## 概要

`docker-compose.yml` ファイルは、以下のサービスを統合して管理します：

- **app**: Next.js アプリケーションコンテナ
- **postgres**: PostgreSQL データベースコンテナ (オプション)
- **nginx**: リバースプロキシコンテナ (オプション)

## クイックスタート

### 1. 環境変数の設定

```bash
# 本番環境用の環境変数ファイルを作成
cp .env.production.example .env.production

# ファイルを編集して実際の値を設定
nano .env.production
```

最低限必要な環境変数：

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase プロジェクトの URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase の匿名キー
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase のサービスロールキー
- `POSTGRES_PASSWORD`: PostgreSQL のパスワード (self-hosted の場合)

### 2. サービスの起動

```bash
# すべてのサービスをビルドして起動
docker compose up -d

# ログをリアルタイムで確認
docker compose logs -f
```

### 3. アプリケーションへのアクセス

- アプリケーション: http://localhost:3000
- nginx (有効な場合): http://localhost

### 4. サービスの停止

```bash
# サービスを停止
docker compose down

# ボリュームも削除する場合
docker compose down -v
```

## サービス詳細

### アプリケーションコンテナ (app)

Next.js アプリケーションを実行するメインコンテナです。

**ポート**: 3000

**環境変数**:

- Supabase 接続情報
- OAuth プロバイダー認証情報
- SMTP 設定
- その他のアプリケーション設定

**ヘルスチェック**:

- エンドポイント: `/api/health`
- 間隔: 30秒
- タイムアウト: 10秒
- 再試行回数: 3回
- 起動猶予期間: 40秒

### PostgreSQL コンテナ (postgres)

ローカルまたはセルフホスト環境用の PostgreSQL データベースです。

**ポート**: 5432

**環境変数**:

- `POSTGRES_DB`: データベース名 (デフォルト: `bingify`)
- `POSTGRES_USER`: データベースユーザー (デフォルト: `postgres`)
- `POSTGRES_PASSWORD`: データベースパスワード (必須)

**ボリューム**:

- `postgres-data`: データベースファイルを永続化

**注意事項**:

- **本番環境では Supabase Cloud の使用を推奨します**
- セルフホストの場合のみこのサービスを使用してください
- データの永続化のため、定期的なバックアップを実施してください

### Nginx コンテナ (nginx) - オプション

リバースプロキシとして動作します。デフォルトではコメントアウトされています。

**ポート**:

- 80 (HTTP)
- 443 (HTTPS、SSL設定時)

**ボリューム**:

- `nginx/nginx.conf`: メイン設定ファイル
- `nginx/conf.d/`: バーチャルホスト設定
- `nginx/ssl/`: SSL証明書 (オプション)

**有効化方法**:

`docker-compose.yml` の nginx セクションのコメントを解除してください。

```bash
# nginx を含めて起動
docker compose up -d
```

## 設定カスタマイズ

### Nginx 設定

#### HTTP のみで起動

デフォルトの設定で起動します。

#### HTTPS を有効化

1. SSL証明書を準備

```bash
# Let's Encrypt を使用する場合 (例)
sudo certbot certonly --standalone -d your-domain.com
```

2. 証明書を配置

```bash
mkdir -p nginx/ssl
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem
```

3. nginx 設定を更新

`nginx/conf.d/default.conf` を編集し、SSL 関連の行のコメントを解除してください。

```nginx
# Uncomment for HTTPS
listen 443 ssl http2;
listen [::]:443 ssl http2;
ssl_certificate /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;
```

4. サービスを再起動

```bash
docker compose restart nginx
```

### 環境変数の更新

環境変数を変更した場合、サービスを再起動する必要があります。

```bash
# 環境変数ファイルを編集
nano .env.production

# サービスを再起動
docker compose restart app
```

### ポートの変更

デフォルトのポートを変更する場合は、`docker-compose.yml` を編集してください。

```yaml
services:
  app:
    ports:
      - "8080:3000"  # ホストの8080ポートにマッピング
```

## 運用

### ログの確認

```bash
# すべてのサービスのログを表示
docker compose logs -f

# 特定のサービスのログを表示
docker compose logs -f app
docker compose logs -f postgres
docker compose logs -f nginx

# 最後の100行のみ表示
docker compose logs --tail=100 app
```

### サービスの状態確認

```bash
# 実行中のサービスを確認
docker compose ps

# 詳細な状態を確認
docker compose ps -a
```

### サービスの再起動

```bash
# すべてのサービスを再起動
docker compose restart

# 特定のサービスのみ再起動
docker compose restart app
```

### イメージの更新

```bash
# イメージを再ビルド
docker compose build

# 再ビルドして起動
docker compose up -d --build

# 特定のサービスのみ再ビルド
docker compose build app
```

### データのバックアップ

#### PostgreSQL データベースのバックアップ

```bash
# データベースをダンプ
docker compose exec postgres pg_dump -U postgres bingify > backup.sql

# バックアップから復元
docker compose exec -T postgres psql -U postgres bingify < backup.sql
```

#### ボリュームのバックアップ

```bash
# ボリュームのバックアップ (例)
docker run --rm -v bingify_postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-data-backup.tar.gz /data
```

### リソース使用量の確認

```bash
# コンテナのリソース使用状況を表示
docker stats
```

## トラブルシューティング

### コンテナが起動しない

```bash
# ログを確認
docker compose logs app

# 設定の検証
docker compose config

# サービスを再作成
docker compose up -d --force-recreate
```

### データベース接続エラー

1. PostgreSQL が起動しているか確認

```bash
docker compose ps postgres
```

2. データベースの接続情報を確認

```bash
docker compose exec postgres psql -U postgres -c "\l"
```

3. 環境変数が正しく設定されているか確認

```bash
docker compose exec app env | grep SUPABASE
```

### Nginx が起動しない

1. 設定ファイルの構文をチェック

```bash
docker compose exec nginx nginx -t
```

2. ポートの競合を確認

```bash
# ポート80が使用されているか確認
sudo lsof -i :80
```

### ディスク容量不足

```bash
# 未使用のイメージ、コンテナ、ボリュームを削除
docker system prune -a

# 未使用のボリュームを削除
docker volume prune
```

## セキュリティ考慮事項

### 本番環境での推奨事項

1. **HTTPS を必ず有効化する**
   - Let's Encrypt などの無料SSL証明書を使用
   - HTTP から HTTPS へのリダイレクトを設定

2. **環境変数を安全に管理する**
   - `.env.production` ファイルはバージョン管理に含めない
   - Docker Secrets や AWS Secrets Manager などの利用を検討

3. **ファイアウォールを設定する**
   - 必要なポートのみ開放 (80, 443)
   - データベースポート (5432) は外部からアクセス不可に設定

4. **定期的なアップデートを実施する**
   - イメージの定期的な更新
   - セキュリティパッチの適用

5. **ログ監視を設定する**
   - ログの集約と監視
   - 異常なアクセスパターンの検知

6. **バックアップの自動化**
   - データベースの定期的な自動バックアップ
   - バックアップの定期的なテスト

## パフォーマンス最適化

### リソース制限の設定

`docker-compose.yml` にリソース制限を追加できます。

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### キャッシュの活用

Nginx のキャッシュ設定は `nginx/conf.d/default.conf` で調整できます。

```nginx
# 静的ファイルのキャッシュ期間を延長
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 30d;
}
```

## 本番環境へのデプロイ

### 推奨構成

1. **アプリケーション**: Docker Compose で管理
2. **データベース**: Supabase Cloud (推奨) またはマネージドPostgreSQL
3. **リバースプロキシ**: nginx with SSL
4. **CDN**: Cloudflare など (オプション)

### デプロイフロー

1. サーバーに接続
2. リポジトリをクローン
3. 環境変数を設定
4. SSL証明書を設定
5. サービスを起動
6. ヘルスチェックを確認
7. ログを監視

```bash
# 例: 本番サーバーでの実行
cd /opt/bingify
git pull origin main
docker compose build
docker compose up -d
docker compose logs -f
```

## まとめ

Docker Compose を使用することで、Bingify のデプロイと運用を簡素化できます。本番環境では、Supabase Cloud の使用とHTTPSの有効化を強く推奨します。

詳細な設定については、以下のファイルを参照してください：

- `docker-compose.yml`: サービス定義
- `.env.production.example`: 環境変数のサンプル
- `nginx/nginx.conf`: Nginx メイン設定
- `nginx/conf.d/default.conf`: Nginx バーチャルホスト設定
