# Test Case: prevent_role_change() NULL Check Fix

## 問題の再現

### Before (バグあり)
```sql
IF current_setting('app.inserting_new_user', true) = 'true' THEN
  RETURN NEW;
END IF;
```

**動作:**
- 設定が存在しない場合: `NULL = 'true'` → `NULL` (falsy)
- 結果: チェックが失敗し、handle_new_user() からの INSERT が拒否される ❌

### After (修正後)
```sql
IF current_setting('app.inserting_new_user', true) IS NOT DISTINCT FROM 'true' THEN
  RETURN NEW;
END IF;
```

**動作:**
- 設定が存在しない場合: `NULL IS NOT DISTINCT FROM 'true'` → `FALSE` (falsy)
- 設定が 'true' の場合: `'true' IS NOT DISTINCT FROM 'true'` → `TRUE` (truthy)
- 結果: handle_new_user() がフラグを設定した場合のみ INSERT を許可 ✓

## テストシナリオ

### シナリオ 1: 通常のユーザー作成（OAuth経由）
1. 新規ユーザーが OAuth でサインアップ
2. auth.users に INSERT される
3. handle_new_user() トリガーが発火
4. `set_config('app.inserting_new_user', 'true', true)` が実行される
5. profiles テーブルに INSERT（role = default_user_role）
6. prevent_role_change() が実行される
7. フラグが 'true' なので、INSERT が許可される ✓
8. ユーザープロフィールが正常に作成される ✓

### シナリオ 2: 手動での role 変更試行（セキュリティチェック）
1. 既存ユーザーが自分の role を変更しようとする
2. profiles テーブルに UPDATE
3. prevent_role_change() が実行される
4. フラグが設定されていない（NULL）
5. `NULL IS NOT DISTINCT FROM 'true'` → FALSE
6. role 変更チェックが実行される
7. `OLD.role IS DISTINCT FROM NEW.role` → TRUE
8. 例外が発生: "Cannot change role" ✓

### シナリオ 3: service_role による変更（管理操作）
1. 管理者が service_role で role を変更
2. profiles テーブルに UPDATE
3. prevent_role_change() が実行される
4. `current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'` → TRUE
5. 即座に RETURN NEW（チェックをバイパス）✓

## PostgreSQL の IS NOT DISTINCT FROM 演算子

| 式 | 結果 |
|---|---|
| `NULL IS NOT DISTINCT FROM NULL` | TRUE |
| `NULL IS NOT DISTINCT FROM 'true'` | FALSE |
| `'true' IS NOT DISTINCT FROM 'true'` | TRUE |
| `'false' IS NOT DISTINCT FROM 'true'` | FALSE |

## 関連ファイル
- `/supabase/migrations/20260101000000_add_role_based_permissions.sql` - オリジナルの実装
- `/supabase/migrations/20260107060256_fix_prevent_role_change_null_check.sql` - この修正
