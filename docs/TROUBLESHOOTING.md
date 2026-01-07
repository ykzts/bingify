# トラブルシューティング

## ユーザー作成エラー

### "Database error updating user" エラー

#### 症状
- 新規ユーザーが OAuth でサインアップする際にエラーが発生
- データベースの `handle_new_user()` トリガーが失敗
- エラーメッセージ: "Cannot set elevated role on insert"

#### 原因
`prevent_role_change()` トリガー関数内の NULL チェックに論理エラーがありました：

```sql
-- 問題のあるコード (修正前)
IF current_setting('app.inserting_new_user', true) = 'true' THEN
  RETURN NEW;
END IF;
```

PostgreSQL では `NULL = 'true'` が `NULL` を返すため、IF 条件が常に偽となり、`handle_new_user()` からの正当な INSERT が拒否されていました。

#### 解決策
マイグレーション `20260107060256_fix_prevent_role_change_null_check.sql` で修正済み：

```sql
-- 修正後
IF current_setting('app.inserting_new_user', true) IS NOT DISTINCT FROM 'true' THEN
  RETURN NEW;
END IF;
```

`IS NOT DISTINCT FROM` 演算子を使用することで：
- 設定が 'true' の場合: `TRUE` を返し、INSERT を許可
- 設定が NULL/存在しない場合: `FALSE` を返し、通常のチェックを実行

#### 参考
- マイグレーションファイル: `/supabase/migrations/20260107060256_fix_prevent_role_change_null_check.sql`
- テストドキュメント: `/supabase/migrations/20260107060256_fix_prevent_role_change_null_check.test.md`
- pgTAP テスト: `/supabase/tests/database/04_user_creation.sql`
