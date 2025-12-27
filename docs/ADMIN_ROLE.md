# 管理者権限の実装

このドキュメントでは、管理者権限の機能とその使用方法について説明します。

## 概要

管理者権限は、サイト管理者にアプリケーション全体のスペースとユーザーを管理する特別な権限を提供します。

## 機能

### 1. 管理者ロール管理
- ユーザーは`profiles`テーブルに'user'または'admin'のいずれかの`role`フィールドを持ちます
- すべての新規ユーザーのデフォルトロールは'user'です
- ロールの変更はサービスロールキーを使用してのみ可能です（UIからは変更不可）

### 2. アクセス制御
- 管理者ルートは`/admin/*`でミドルウェアにより保護されています
- `role='admin'`を持つユーザーのみが管理者ページにアクセスできます
- 管理者以外のユーザーはホームページにリダイレクトされます

### 3. 管理ダッシュボード
管理ダッシュボードへのアクセス: `/admin`

機能:
- **概要**: 警告と情報を含むダッシュボード
- **スペース管理**: すべてのスペースの閲覧と削除
- **ユーザー管理**: ユーザーの閲覧とBAN

## 管理者ユーザーの設定

ユーザーを管理者にするには、サービスロールキーを使用してロールを更新する必要があります。

### 方法1: SQLを使用（ローカル開発）

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres << 'EOF'
BEGIN;
SET LOCAL request.jwt.claims = '{"role": "service_role"}';
UPDATE profiles SET role = 'admin' WHERE email = 'user@example.com';
COMMIT;
EOF
```

### 方法2: Supabaseダッシュボードを使用

1. Supabase Studioを開く（ローカルは http://127.0.0.1:54323）
2. テーブルエディタ → profiles に移動
3. メールアドレスでユーザーを検索
4. 行を編集をクリック
5. `role`を'user'から'admin'に変更
6. 保存

### 方法3: APIを使用（本番環境）

サービスロールキーを使用する安全な管理者エンドポイントまたはスクリプトを作成:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey);

async function makeAdmin(userId: string) {
  const { data, error } = await adminClient
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId);
  
  return { data, error };
}
```

## セキュリティに関する考慮事項

1. **サービスロールキーの保護**
   - サービスロールキーはすべてのRLSポリシーをバイパスします
   - クライアントに公開しないでください
   - サーバーサイドのコードでのみ使用してください
   - 環境変数に安全に保管してください

2. **ロール変更の保護**
   - データベーストリガーがユーザー自身によるロール変更を防ぎます
   - `service_role` JWTクレームを持つ操作のみがロールを変更できます
   - これにより権限昇格攻撃を防ぎます

3. **管理者アクション検証**
   - すべての管理者アクションは実行前にユーザーのロールを検証します
   - ロールチェックはリクエストごとにサーバーサイドで実行されます
   - パフォーマンス向上のためJWTにロールをキャッシュすることを検討してください

4. **データのクリーンアップ**
   - スペースの削除は`spaces_archive`テーブルに移動されます
   - ユーザーのBANは認証アカウントとプロフィールを削除します
   - ビンゴカードは孤立レコードとして残ります（クリーンアップを検討）

## データベーススキーマ

### profilesテーブル
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  role TEXT NOT NULL DEFAULT 'user',
  CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'))
);
```

### トリガー
```sql
CREATE TRIGGER trigger_prevent_role_change
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_change();
```

## 管理者機能のテスト

### 管理者アクセステスト
1. テストユーザーアカウントを作成
2. 上記のいずれかの方法で管理者にする
3. そのアカウントでログイン
4. `/admin`に移動
5. 管理ダッシュボードにアクセスできることを確認

### スペース削除のテスト
1. テストスペースを作成
2. `/admin/spaces`に移動
3. テストスペースの「削除」をクリック
4. 削除を確認
5. リストからスペースが削除されたことを確認
6. `spaces_archive`テーブルでアーカイブされたことを確認

### ユーザーBANのテスト
1. テストユーザーアカウントを作成
2. `/admin/users`に移動
3. テストユーザーの「BAN」をクリック
4. アクションを確認
5. リストからユーザーが削除されたことを確認
6. ユーザーがログインできなくなったことを確認

## トラブルシューティング

### 管理者ルートにアクセスできない
- profilesテーブルでユーザーが`role='admin'`を持っていることを確認
- ブラウザのCookieをクリアして再度ログイン
- ブラウザコンソールでエラーを確認

### ロール更新が失敗する
- サービスロールキーを使用していることを確認
- JWTクレームが正しく設定されていることを確認
- データベースにトリガー関数が存在することを確認

### 削除/BAN アクションが失敗する
- サーバーログでエラーメッセージを確認
- 環境変数にSUPABASE_SERVICE_ROLE_KEYが設定されていることを確認
- 管理クライアントが使用されていることを確認（通常のクライアントではない）

## 今後の改善

以下の実装を検討してください:
- [ ] 管理者アクションのアクティビティログ
- [ ] ソフトBAN（アカウント削除ではなく無効化）
- [ ] バッチ操作（複数のスペース/ユーザーの削除）
- [ ] 検索とフィルター機能
- [ ] 大規模データセットのページネーション
- [ ] alert()の代わりにトースト通知
- [ ] パフォーマンス向上のためJWTクレームにロールをキャッシュ
- [ ] ユーザーBAN時の孤立ビンゴカードのクリーンアップ
