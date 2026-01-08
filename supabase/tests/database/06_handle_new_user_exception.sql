-- handle_new_user関数の例外ハンドリングテスト
-- INSERT処理で例外が発生した場合でもapp.inserting_new_userフラグが適切にクリアされることを検証

BEGIN;

-- テストプランの設定
SELECT plan(3);

-- ========================================
-- handle_new_user関数の存在確認
-- ========================================

SELECT has_function(
  'public',
  'handle_new_user',
  'handle_new_user関数が存在すること'
);

-- ========================================
-- 関数の属性確認
-- ========================================

SELECT function_returns(
  'public',
  'handle_new_user',
  'trigger',
  'handle_new_user関数はTRIGGER型を返すこと'
);

-- ========================================
-- 例外ハンドリングの構造検証
-- ========================================

-- handle_new_user関数のソースコードに例外ハンドリングブロックが存在することを検証
SELECT matches(
  pg_get_functiondef('handle_new_user()'::regprocedure),
  'BEGIN[\s\S]*INSERT INTO public\.profiles[\s\S]*EXCEPTION[\s\S]*WHEN OTHERS THEN[\s\S]*set_config\(''app\.inserting_new_user''[\s\S]*RAISE',
  'handle_new_user関数にINSERT処理を囲む例外ハンドリングブロックが存在すること'
);

SELECT * FROM finish();

ROLLBACK;
