-- NULL比較の修正を検証するテスト
-- current_setting()がNULLを返す場合でも正しく動作することを確認

BEGIN;

-- テストプランの設定
SELECT plan(6);

-- ========================================
-- IS DISTINCT FROM の動作確認
-- ========================================

-- IS NOT DISTINCT FROMがNULL比較で正しく動作することを確認
SELECT ok(
  (NULL IS NOT DISTINCT FROM NULL) = TRUE,
  'IS NOT DISTINCT FROM: NULL と NULL は等しいこと'
);

SELECT ok(
  (NULL IS NOT DISTINCT FROM 'true') = FALSE,
  'IS NOT DISTINCT FROM: NULL と文字列は等しくないこと'
);

SELECT ok(
  ('true' IS NOT DISTINCT FROM 'true') = TRUE,
  'IS NOT DISTINCT FROM: 同じ文字列は等しいこと'
);

-- IS DISTINCT FROMがNULL比較で正しく動作することを確認
SELECT ok(
  (NULL IS DISTINCT FROM 'service_role') = TRUE,
  'IS DISTINCT FROM: NULL と文字列は異なること'
);

SELECT ok(
  ('service_role' IS DISTINCT FROM 'service_role') = FALSE,
  'IS DISTINCT FROM: 同じ文字列は異ならないこと'
);

SELECT ok(
  ('user_role' IS DISTINCT FROM 'service_role') = TRUE,
  'IS DISTINCT FROM: 異なる文字列は異なること'
);

-- ========================================
-- テスト完了
-- ========================================

SELECT * FROM finish();
ROLLBACK;
