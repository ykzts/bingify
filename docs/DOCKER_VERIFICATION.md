# Docker デプロイメント検証ガイド

このドキュメントは、Dockerfile の動作確認手順を説明します。

## ビルド検証

### 1. Docker イメージのビルド

```bash
docker build -t bingify:latest .
```

期待される動作:
- 3つのビルドステージ（deps, builder, runner）が正常に完了
- 最終イメージサイズは約 150-200MB（Alpine ベース + Next.js standalone）
- ビルド時間は約 5-10分（初回、依存関係のキャッシュがない場合）

### 2. イメージ情報の確認

```bash
docker images bingify:latest
docker inspect bingify:latest
```

確認項目:
- イメージサイズが適切であること
- USER が `nextjs` であること（非root）
- EXPOSE 3000 が設定されていること
- HEALTHCHECK が設定されていること

## 実行検証

### 1. 環境変数の準備

`.env.production` ファイルを作成：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2. コンテナの起動

```bash
docker run -d \
  --name bingify-test \
  -p 3000:3000 \
  --env-file .env.production \
  bingify:latest
```

### 3. 動作確認

#### ヘルスチェック確認
```bash
curl http://localhost:3000/api/health
```

期待される応答:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### アプリケーション確認
```bash
curl -I http://localhost:3000
```

期待される応答:
- HTTP 200 または 302（認証リダイレクト）
- Next.js のヘッダーが含まれること

#### ログ確認
```bash
docker logs bingify-test
```

確認項目:
- エラーがないこと
- Next.js が正常に起動していること
- ポート 3000 でリッスンしていること

#### コンテナ統計
```bash
docker stats bingify-test
```

期待される動作:
- メモリ使用量: 約 150-300MB（アクセス負荷に応じて変動）
- CPU 使用率: アイドル時 0-5%

## Docker Compose 検証

### 1. Docker Compose での起動

```bash
docker compose up -d
```

### 2. ログ確認

```bash
docker compose logs -f bingify
```

### 3. ヘルスチェック確認

Docker Compose のヘルスチェック状態を確認：

```bash
docker compose ps
```

`healthy` ステータスになることを確認。

### 4. クリーンアップ

```bash
docker compose down
docker rmi bingify:latest
```

## トラブルシューティング

### ビルドエラー: pnpm インストール失敗

**症状:**
```
Error: Cannot find module 'pnpm'
```

**対策:**
Dockerfile で pnpm のインストール方法を確認してください。
- corepack が有効になっているか
- pnpm のバージョンが package.json の `packageManager` と一致しているか

### 実行エラー: 環境変数未設定

**症状:**
```
Error: Missing environment variable NEXT_PUBLIC_SUPABASE_URL
```

**対策:**
必須の環境変数が設定されているか確認：
```bash
docker exec bingify-test env | grep SUPABASE
```

### ヘルスチェック失敗

**症状:**
Docker のヘルスチェックが `unhealthy` になる

**対策:**
1. ヘルスチェックエンドポイントが正しく動作しているか確認
   ```bash
   docker exec bingify-test node -e "require('http').get('http://localhost:3000/api/health', (r) => console.log(r.statusCode))"
   ```

2. Next.js が正常に起動しているか確認
   ```bash
   docker logs bingify-test | grep "ready"
   ```

### ポートバインドエラー

**症状:**
```
Error: port is already allocated
```

**対策:**
ポート 3000 が他のプロセスで使用されていないか確認：
```bash
lsof -i :3000
# または
netstat -tulpn | grep 3000
```

## セキュリティチェックリスト

- [ ] 非 root ユーザーで実行されていること（nextjs:nodejs）
- [ ] 環境変数にシークレットが含まれていないこと
- [ ] .dockerignore でnode_modules が除外されていること
- [ ] マルチステージビルドで不要なファイルが最終イメージに含まれていないこと
- [ ] ヘルスチェックが設定されていること
- [ ] リソース制限（メモリ、CPU）が適切に設定されていること

## パフォーマンスチェック

### レスポンス時間

```bash
time curl http://localhost:3000/api/health
```

期待値: < 100ms

### 負荷テスト（オプション）

```bash
# Apache Bench を使用した簡易負荷テスト
ab -n 1000 -c 10 http://localhost:3000/api/health
```

期待される動作:
- 95%のリクエストが 500ms 以内に完了
- エラー率 0%

## 本番環境デプロイ前チェックリスト

- [ ] ビルドが正常に完了すること
- [ ] ヘルスチェックが正常に動作すること
- [ ] 環境変数が正しく設定されていること
- [ ] ログが適切に出力されていること
- [ ] リソース制限が適切に設定されていること
- [ ] セキュリティチェックをすべてパスしていること
- [ ] Supabase への接続が正常に動作すること
- [ ] OAuth 認証が正常に動作すること
- [ ] 静的アセット（画像、CSS）が正しく配信されていること
