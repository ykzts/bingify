# Archive and Cleanup Implementation

このドキュメントは、アーカイブ機能と定期削除機能の実装について説明します。

## 概要

削除されたスペースのデータをアーカイブテーブルに保存し、一定期間後に自動的に削除する仕組みを実装しています。

## 実装内容

### 1. データベーステーブル

#### `spaces_archive` テーブル

削除されたスペースのデータを保存するアーカイブテーブル。

**カラム:**

- `id`: スペースID (PRIMARY KEY)
- `share_key`: 共有キー
- `settings`: 設定 (JSONB)
- `status`: ステータス
- `created_at`: 作成日時
- `updated_at`: 更新日時
- `deleted_at`: 削除日時
- `archived_at`: アーカイブ日時

### 2. データベーストリガー

#### `archive_deleted_space()` 関数

`spaces` テーブルから行が削除される前に、そのデータを `spaces_archive` テーブルにコピーします。

#### `trigger_archive_space` トリガー

`spaces` テーブルの `BEFORE DELETE` イベントで `archive_deleted_space()` 関数を実行します。

### 3. Cron API エンドポイント

#### `/api/cron/cleanup` (GET)

アーカイブされたデータのうち、保持期限を過ぎたものを削除します。

**保持期間:** 90日

**認証:**

- `Authorization` ヘッダーに `Bearer <CRON_SECRET>` を指定
- 本番環境では `CRON_SECRET` 環境変数を必ず設定し、すべてのリクエストでこのシークレットによる認証を行うこと
- 開発環境では `CRON_SECRET` が未設定の場合、認証がバイパスされます（警告ログが出力されます）

**レスポンス:**

```json
{
  "data": {
    "deletedCount": 5,
    "message": "Successfully deleted 5 archived record(s) older than 90 days",
    "retentionDays": 90
  }
}
```

### 4. Vercel Cron 設定

`vercel.json` で以下の設定を追加:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 18 * * *"
    }
  ]
}
```

**スケジュール:** 毎日 18:00 UTC (JST 3:00 AM) に実行

## セットアップ

### 1. マイグレーションの適用

```bash
pnpm supabase:start
```

マイグレーション `20251226000000_add_archive_tables.sql` が自動的に適用されます。

### 2. 環境変数の設定

`.env.local` に以下を追加:

```bash
# Cron ジョブの認証用シークレット
CRON_SECRET="your-secret-key-here"
```

**注意:** 本番環境では強力なランダム文字列を使用してください。

### 3. Vercel へのデプロイ

Vercel にデプロイすると、自動的に Cron ジョブが設定されます。

## テスト

### ローカル環境でのテスト

```bash
# CRON_SECRET を使用してエンドポイントにアクセス
curl -H "Authorization: Bearer your-secret-key-here" http://localhost:3000/api/cron/cleanup
```

### 動作確認

1. スペースを作成
2. スペースを削除
3. `spaces_archive` テーブルにデータが保存されていることを確認
4. Cron API を実行して、古いアーカイブデータが削除されることを確認

## 注意事項

- アーカイブデータは90日間保持されます
- Vercel の無料プランでは Cron ジョブに制限があります
- `CRON_SECRET` は必ず設定し、安全に管理してください
