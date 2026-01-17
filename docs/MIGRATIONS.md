# Supabaseマイグレーション運用ガイド

このドキュメントでは、Supabase Cloudへのデータベースマイグレーション運用について詳しく説明します。

## 概要

このプロジェクトでは、`supabase/migrations` ディレクトリに配置されたマイグレーションファイルを自動的にCloud Supabaseに適用するGitHub Actionsワークフローを使用しています。

**重要な注意事項:**

- ワークフローは `.sql` ファイルの追加・変更時に自動実行されます
- **⚠️ 既に適用済みのマイグレーションファイルは絶対に編集しないでください**
- Supabaseは一度適用されたマイグレーションを再実行しません
- 既存のマイグレーションファイルを編集すると、新規環境構築時のみ変更が反映され、既存環境との間で不整合が発生します
- 変更が必要な場合は、必ず新しいマイグレーションファイルを作成してください
- **マイグレーションファイルの削除はデータベースからのロールバックを行いません**
- リポジトリからファイルを削除しても、Cloud Supabaseに適用済みのマイグレーションは残ります
- マイグレーションを元に戻す必要がある場合は、新しいマイグレーションファイルで明示的にロールバックSQLを記述してください

## セットアップ

### 1. GitHub Secretsの設定

リポジトリのSettings > Secrets and variables > Actionsから以下のシークレットを設定してください。

#### Supabase_ACCESS_TOKEN

SupabaseのPersonal Access Tokenです。

**取得方法:**

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. 右上のアカウントメニューから **Account Settings** を開く
3. **Access Tokens** タブを選択
4. **Generate new token** をクリック
5. トークン名を入力 (例: `bingify-github-actions`)
6. 生成されたトークンをコピー (一度しか表示されません)
7. GitHubリポジトリのSecretsに `SUPABASE_ACCESS_TOKEN` として保存

**注意事項:**

- このトークンはプロジェクトの管理権限を持つため、厳重に管理してください
- トークンが漏洩した場合は、すぐにSupabase Dashboardから無効化してください

#### Supabase_PROJECT_ID

SupabaseプロジェクトのProject Reference IDです。

**取得方法:**

1. [Supabase Dashboard](https://supabase.com/dashboard) でプロジェクトを開く
2. Settings > Generalを選択
3. **Reference ID** をコピー (例: `abcdefghijklmnop`)
4. GitHubリポジトリのSecretsに `SUPABASE_PROJECT_ID` として保存

### 2. 環境の設定 (オプション)

本番環境とステージング環境を分けて管理する場合は、GitHub Environmentsを使用します。

**設定方法:**

1. リポジトリのSettings > Environmentsを開く
2. **New environment** をクリック
3. 環境名を入力 (`production` または `staging`)
4. 必要に応じてProtection rulesを設定

- Required reviewers: 本番環境へのデプロイ前に承認を必須にする
- Wait timer: デプロイ前に待機時間を設定する

5. Environment secretsに環境固有の `SUPABASE_PROJECT_ID` を設定

## 運用フロー

### 通常のマイグレーション適用

```
1. ローカルで開発
 ↓
2. マイグレーションファイル作成
 ↓
3. ローカルで動作確認
 ↓
4. PR 作成
 ↓
5. コードレビュー
 ↓
6. mainブランチへマージ
 ↓
7. 自動デプロイ (GitHub Actions)
 ↓
8. 完了通知の確認
```

### ⚠️ 重要なルール: 既存のマイグレーションファイルは編集しない

**既に mainブランチにマージされた (または Cloudに適用済みの) マイグレーションファイルは絶対に編集しないでください。**

#### なぜ編集してはいけないのか

Supabaseは、マイグレーションの適用状態を `supabase_migrations.schema_migrations` テーブルで管理しています。一度適用されたマイグレーションは、ファイル名 (タイムスタンプ) を基に「適用済み」として記録され、再度実行されることはありません。

既存のマイグレーションファイルを編集すると、以下の問題が発生します：

**❌ 問題のある例:**

```bash
# 既存のファイルを編集してしまった場合
git diff supabase/migrations/20251226000000_add_archive_tables.sql

# このような変更を含む PRをマージすると...
+ ALTER TABLE spaces_archive ADD COLUMN new_field TEXT;
```

**影響:**

- ✅ **新規環境 (ローカルやCI/CD)**: 変更後の内容でマイグレーションが実行される
- ❌ **既存環境 (Cloud Supabase)**: マイグレーションは既に適用済みとしてスキップされ、変更が反映されない
- 🚨 **結果**: 環境間でスキーマの不整合が発生し、アプリケーションが正しく動作しなくなる

#### 正しい対処方法

変更が必要な場合は、**必ず新しいマイグレーションファイルを作成**してください。

**✅ 正しい例:**

```bash
# 新しいマイグレーションファイルを作成
supabase migration new add_field_to_spaces_archive

# 生成されたファイル (例: 20251227120000_add_field_to_spaces_archive.sql) に変更を記述
ALTER TABLE spaces_archive ADD COLUMN IF NOT EXISTS new_field TEXT;
```

この方法であれば、既存環境にも新規環境にも同じ変更が確実に適用されます。

#### レビュー時の確認項目

PRレビュー時には、以下を確認してください：

- [ ] 既存のマイグレーションファイル (既にmainブランチに存在するファイル) が変更されていないか
- [ ] スキーマ変更は新しいマイグレーションファイルとして追加されているか
- [ ] 新しいマイグレーションファイルのタイムスタンプが最新のものより新しいか

#### 例外: クリティカルなバグの修正

**唯一の例外**は、マイグレーションに致命的なバグがあり、新規環境のセットアップが完全にブロックされている場合です。このような場合は:

1. マイグレーションファイルを修正してバグを修正する
2. 修正には `IF NOT EXISTS`/`IF EXISTS` を使用し、既に適用された環境でも安全に実行できるようにする
3. PRに明確な説明と、なぜ既存ファイルを編集する必要があるのかの理由を記載する

**例:** マイグレーションがSQL構文エラーで失敗し、どの環境も作成できない場合

```sql
-- バグのある状態
ALTER TABLE spaces ADD COLUMN owner_id UUID; -- 外部キー制約が欠けている

-- 修正
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users (id);
```

### 1. マイグレーションファイルの作成

```bash
# Supabase CLIでマイグレーションファイルを生成
supabase migration new add_user_profiles_table

# ファイルが supabase/migrations/ に作成される
# 例: supabase/migrations/20251227000000_add_user_profiles_table.sql
```

### 2. マイグレーションの記述

生成されたファイルにSQLを記述します。

**ベストプラクティス:**

```sql
-- 既存のテーブルや制約が存在する場合を考慮
CREATE TABLE IF NOT EXISTS user_profiles (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
 user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
 display_name TEXT,
 created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW (),
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW ()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);

-- Realtimeの有効化 (必要な場合)
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
```

**注意点:**

- `IF NOT EXISTS` や `IF EXISTS` を使用して、冪等性を確保する
- 削除操作は慎重に行い、必ずバックアップを取る
- 外部キー制約は必ず `ON DELETE` 句を指定する

### 3. ローカルで動作確認

```bash
# ローカルSupabaseインスタンスにマイグレーションを適用
pnpm local:setup

# アプリケーションで動作確認
pnpm dev
```

### 4. PR 作成とレビュー

```bash
# ブランチ作成
git checkout -b feat/add-user-profiles-table

# ファイル追加
git add supabase/migrations/20251227000000_add_user_profiles_table.sql

# コミット (Conventional Commitsに従う)
git commit -m "feat (db): add user_profiles table for user settings"

# プッシュ
git push origin feat/add-user-profiles-table
```

PRでは以下を明記してください：

- マイグレーションの目的
- 変更内容の概要
- 影響範囲
- ロールバック方法 (必要な場合)

### 5. 自動デプロイ

PRが `main` ブランチにマージされると、GitHub Actionsが自動的に実行されます。

**ワークフローの流れ:**

1. リポジトリのチェックアウト
2. Supabase CLIのセットアップ (バージョン固定)
3. マイグレーションファイルの検証 (存在確認・カウント)
4. Supabaseプロジェクトへのリンク
5. データベース接続性の確認
6. マイグレーションの適用 (`supabase db push`)
7. デプロイ結果の検証 (dry-runで再確認)

**セキュリティとロバスト性:**

- 同一環境への同時デプロイを防ぐ並行制御 (concurrency control)
- `.sql` ファイルのみをトリガー対象とする (不要な実行を防止)
- マイグレーションファイルが存在しない場合はエラー終了
- デプロイ前の接続確認とデプロイ後の検証ステップ

**確認方法:**

- GitHubリポジトリの **Actions** タブでワークフローの実行状況を確認
- 成功した場合: ✅ マークが表示される
- 失敗した場合: ❌ マークが表示され、エラー詳細がログに記録される

## 手動デプロイ

緊急時や特定の状況下では、手動でマイグレーションをデプロイできます。

### GitHub Actionsから手動実行

1. リポジトリの **Actions** タブを開く
2. **Deploy Migrations** ワークフローを選択
3. **Run workflow** ボタンをクリック
4. ブランチを選択 (通常は `main`)
5. デプロイ先の環境を選択 (`production` または `staging`)
6. **Run workflow** をクリックして実行

### ローカルから手動実行 (非推奨)

緊急時のみ、ローカルから直接マイグレーションを適用できます。

```bash
# Supabaseにログイン
supabase login

# プロジェクトにリンク
supabase link --project-ref <YOUR_PROJECT_ID>

# マイグレーションを適用
supabase db push --include-all
```

**注意:** この方法はGitHub Actionsの実行履歴に記録されないため、通常は使用しないでください。

## トラブルシューティング

### マイグレーションが失敗した場合

#### 1. ログの確認

GitHub Actionsのログで詳細なエラーメッセージを確認します。

```
Actionsタブ > Deploy Migrations > 失敗したワークフロー > Deploy migrationsステップ
```

#### 2. よくあるエラーと対処法

**エラー: `relation already exists`**

```
原因: テーブルやインデックスがすでに存在する
対処: IF NOT EXISTSを使用する
```

**エラー: `permission denied`**

```
原因: アクセストークンの権限が不足している
対処: Supabase Dashboardでトークンの権限を確認
```

**エラー: `syntax error at or near`**

```
原因: SQL 構文エラー
対処: マイグレーションファイルの SQLを修正し、再度 PRを作成
```

#### 3. ロールバック手順

マイグレーションの自動ロールバックは実装されていません。手動でロールバックする必要があります。

**手順:**

1. Supabase Dashboardを開く
2. SQL Editorタブを選択
3. ロールバック用のSQLを実行

```sql
-- 例: テーブル削除
DROP TABLE IF EXISTS user_profiles CASCADE;

-- 例: カラム削除
ALTER TABLE spaces DROP COLUMN IF EXISTS new_column;
```

4. ロールバックが完了したら、修正版のマイグレーションファイルを**新しい**マイグレーションファイルとして作成
5. 新しいマイグレーションファイルでPRを作成 (⚠️ 既存のマイグレーションファイルは編集しないこと)

### 接続エラーが発生した場合

#### `Error: Failed to link project`

**原因:**

- `SUPABASE_ACCESS_TOKEN` が無効または期限切れ
- `SUPABASE_PROJECT_ID` が間違っている

**対処:**

1. Supabase Dashboardでトークンを再生成
2. GitHub Secretsを更新
3. ワークフローを再実行

#### `Error: Database connection failed`

**原因:**

- Supabaseプロジェクトが一時停止している
- ネットワークの問題

**対処:**

1. Supabase Dashboardでプロジェクトの状態を確認
2. プロジェクトが停止している場合は再開
3. ワークフローを再実行

## セキュリティのベストプラクティス

### 1. アクセストークンの管理

- **絶対にコードにトークンを含めない**
- GitHub Secretsを使用してトークンを安全に保管
- トークンは定期的にローテーション (推奨: 3〜6ヶ月ごと)
- 不要になったトークンはすぐに削除

### 2. 本番環境の保護

- GitHub EnvironmentsのProtection rulesを有効化
- 本番環境へのデプロイには必ずレビューを必須にする
- デプロイ前に待機時間を設定 (誤操作防止)

### 3. マイグレーションのレビュー

マイグレーションファイルは以下の観点でレビューしてください：

- [ ] **⚠️ 既存のマイグレーションファイル (既に mainブランチに存在するファイル) が編集されていない**
- [ ] 変更は新しいマイグレーションファイルとして追加されている
- [ ] SQL構文が正しい
- [ ] 冪等性が確保されている (`IF EXISTS` / `IF NOT EXISTS`)
- [ ] データ損失のリスクがない
- [ ] インデックスが適切に設定されている
- [ ] Realtimeの設定が必要なテーブルに適用されている
- [ ] ロールバック方法が明確

### 4. バックアップ

重要なマイグレーションを適用する前に、手動でバックアップを取ることを推奨します。

**Supabase Dashboardでのバックアップ:**

1. Database > Backupsを開く
2. **Create backup** をクリック
3. バックアップが完了するまで待つ
4. マイグレーションを実行

## 運用チェックリスト

### マイグレーション適用前

- [ ] **既存のマイグレーションファイルを編集していない (新しいファイルとして作成している)**
- [ ] ローカル環境でマイグレーションをテスト
- [ ] マイグレーションファイルのレビュー完了
- [ ] ロールバック手順を確認
- [ ] バックアップの取得 (重要な変更の場合)

### マイグレーション適用後

- [ ] GitHub Actionsのログで成功を確認
- [ ] Supabase Dashboardでスキーマを確認
- [ ] アプリケーションの動作確認
- [ ] 監視ログでエラーがないことを確認

## 参考リンク

- [Supabase CLIドキュメント](https://supabase.com/docs/guides/cli)
- [Supabaseマイグレーションガイド](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [GitHub Actionsドキュメント](https://docs.github.com/actions)
