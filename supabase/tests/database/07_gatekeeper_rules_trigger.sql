-- ゲートキーパールールトリガーのテスト
-- check_gatekeeper_rules_owner() 関数と enforce_gatekeeper_rules_owner トリガーが
-- 正しく動作し、オーナーのみがゲートキーパールールを変更できることを検証

BEGIN;

-- テストプランの設定
SELECT plan(9);

-- ========================================
-- トリガーとトリガー関数の存在確認
-- ========================================

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'enforce_gatekeeper_rules_owner'
      AND tgrelid = 'spaces'::regclass
  ),
  'enforce_gatekeeper_rules_owner トリガーが spaces テーブルに存在すること'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'check_gatekeeper_rules_owner'
  ),
  'check_gatekeeper_rules_owner 関数が存在すること'
);

-- ========================================
-- トリガー関数のセキュリティ設定確認
-- ========================================

-- check_gatekeeper_rules_owner 関数が SECURITY DEFINER ではないことを確認
-- SECURITY DEFINER が設定されていると auth.uid() が正しく動作しないため
SELECT ok(
  NOT COALESCE(
    (
      SELECT prosecdef FROM pg_proc
      WHERE proname = 'check_gatekeeper_rules_owner'
        AND pronamespace = 'public'::regnamespace
    ),
    TRUE  -- 関数が存在しない場合はテスト失敗（TRUE を NOT すると FALSE になる）
  ),
  'check_gatekeeper_rules_owner 関数が SECURITY DEFINER ではないこと（auth.uid() の正常動作のため）'
);

-- ========================================
-- テストデータの準備
-- ========================================

-- テスト用のユーザー ID とスペース ID を作成
DO $$
DECLARE
  test_owner_id UUID := '00000000-0000-0000-0000-000000000011';
  test_non_owner_id UUID := '00000000-0000-0000-0000-000000000012';
  test_space_id UUID := '00000000-0000-0000-0000-000000000110';
BEGIN
  -- テストデータのクリーンアップ（既存のテストデータを削除）
  DELETE FROM spaces WHERE id = test_space_id;
  DELETE FROM profiles WHERE id IN (test_owner_id, test_non_owner_id);
  DELETE FROM auth.users WHERE id IN (test_owner_id, test_non_owner_id);

  -- auth.users にテストユーザーを作成
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, is_sso_user, is_anonymous)
  VALUES 
    (test_owner_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@example.com', '', NOW(), NOW(), NOW(), FALSE, FALSE),
    (test_non_owner_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'non-owner@example.com', '', NOW(), NOW(), NOW(), FALSE, FALSE)
  ON CONFLICT (id) DO NOTHING;

  -- プロフィールを作成（handle_new_user トリガーで自動作成されるが、明示的に作成）
  INSERT INTO profiles (id, email, full_name)
  VALUES 
    (test_owner_id, 'owner@example.com', 'Test Owner'),
    (test_non_owner_id, 'non-owner@example.com', 'Test Non-Owner')
  ON CONFLICT (id) DO NOTHING;

  -- スペースを作成（test_owner_id が所有者）
  INSERT INTO spaces (id, share_key, owner_id, status, view_token)
  VALUES (test_space_id, 'test-gatekeeper-space', test_owner_id, 'active', 'test-view-token-gk');
END $$;

-- ========================================
-- 動作テスト1: gatekeeper_rules が変更されない場合は常に成功
-- ========================================

-- gatekeeper_rules 以外のフィールドを更新（owner_id を非オーナーに設定して更新を試みる）
-- この場合、gatekeeper_rules は変更されないため、トリガーは更新を許可する
DO $$
DECLARE
  test_space_id UUID := '00000000-0000-0000-0000-000000000110';
  test_non_owner_id UUID := '00000000-0000-0000-0000-000000000012';
  update_succeeded BOOLEAN := FALSE;
BEGIN
  -- status を更新（gatekeeper_rules は変更しない）
  UPDATE spaces
  SET status = 'paused'
  WHERE id = test_space_id;
  
  update_succeeded := TRUE;
  
  -- テスト結果を記録
  IF NOT update_succeeded THEN
    RAISE EXCEPTION 'gatekeeper_rules が変更されない場合の更新が失敗しました';
  END IF;
END $$;

SELECT ok(
  (SELECT status FROM spaces WHERE id = '00000000-0000-0000-0000-000000000110') = 'paused',
  'gatekeeper_rules が変更されない場合、他のフィールドの更新は成功すること'
);

-- ========================================
-- 動作テスト2: オーナーによる gatekeeper_rules 更新の成功
-- ========================================

-- オーナー（owner_id = test_owner_id）として gatekeeper_rules を更新
-- この操作は成功するはず
DO $$
DECLARE
  test_space_id UUID := '00000000-0000-0000-0000-000000000110';
  test_owner_id UUID := '00000000-0000-0000-0000-000000000011';
  update_succeeded BOOLEAN := FALSE;
BEGIN
  -- auth.uid() がオーナー ID を返すように設定
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_owner_id::text)::text, true);
  
  -- オーナーとして gatekeeper_rules を更新
  UPDATE spaces
  SET gatekeeper_rules = '{"enabled": true}'::jsonb
  WHERE id = test_space_id;
  
  update_succeeded := TRUE;
  
  -- JWT claims をクリア
  PERFORM set_config('request.jwt.claims', '', true);
  
  -- テスト結果を記録
  IF NOT update_succeeded THEN
    RAISE EXCEPTION 'オーナーによる gatekeeper_rules 更新が失敗しました';
  END IF;
END $$;

SELECT ok(
  (SELECT gatekeeper_rules FROM spaces WHERE id = '00000000-0000-0000-0000-000000000110') = '{"enabled": true}'::jsonb,
  'オーナーは gatekeeper_rules を更新できること（トリガーチェックが成功）'
);

-- ========================================
-- 動作テスト3: 非オーナーによる gatekeeper_rules 更新の失敗
-- ========================================

-- 非オーナー（owner_id != test_owner_id）として gatekeeper_rules を更新しようとする
-- この操作は例外を発生させるはず
DO $$
DECLARE
  test_space_id UUID := '00000000-0000-0000-0000-000000000110';
  test_non_owner_id UUID := '00000000-0000-0000-0000-000000000012';
  exception_raised BOOLEAN := FALSE;
  error_message TEXT;
BEGIN
  -- auth.uid() が非オーナー ID を返すように設定
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_non_owner_id::text)::text, true);
  
  BEGIN
    -- 非オーナーとして gatekeeper_rules を更新しようとする
    UPDATE spaces
    SET gatekeeper_rules = '{"enabled": false}'::jsonb
    WHERE id = test_space_id;
  EXCEPTION
    WHEN OTHERS THEN
      exception_raised := TRUE;
      error_message := SQLERRM;
  END;
  
  -- JWT claims をクリア
  PERFORM set_config('request.jwt.claims', '', true);
  
  -- テスト結果を記録
  IF NOT exception_raised THEN
    RAISE EXCEPTION '非オーナーによる gatekeeper_rules 更新で例外が発生しませんでした';
  END IF;
  
  -- エラーメッセージが期待通りかを確認
  IF error_message NOT LIKE '%Only the space owner can modify gatekeeper rules%' THEN
    RAISE EXCEPTION '予期しないエラーメッセージ: %', error_message;
  END IF;
END $$;

SELECT ok(
  TRUE,  -- DO ブロックで例外チェックが完了している
  '非オーナーが gatekeeper_rules を更新しようとすると例外が発生すること'
);

-- ========================================
-- 動作テスト4: gatekeeper_rules を NULL から値に変更（オーナー）
-- ========================================

-- 新しいスペースを作成し、NULL から値への変更をテスト
DO $$
DECLARE
  test_space_id_2 UUID := '00000000-0000-0000-0000-000000000111';
  test_owner_id UUID := '00000000-0000-0000-0000-000000000011';
BEGIN
  -- 新しいスペースを作成（gatekeeper_rules は NULL）
  DELETE FROM spaces WHERE id = test_space_id_2;
  INSERT INTO spaces (id, share_key, owner_id, status, view_token, gatekeeper_rules)
  VALUES (test_space_id_2, 'test-gatekeeper-space-2', test_owner_id, 'active', 'test-view-token-gk2', NULL);
  
  -- auth.uid() がオーナー ID を返すように設定
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_owner_id::text)::text, true);
  
  -- オーナーとして NULL から値に変更
  UPDATE spaces
  SET gatekeeper_rules = '{"rules": ["test"]}'::jsonb
  WHERE id = test_space_id_2;
  
  -- JWT claims をクリア
  PERFORM set_config('request.jwt.claims', '', true);
END $$;

SELECT ok(
  (SELECT gatekeeper_rules FROM spaces WHERE id = '00000000-0000-0000-0000-000000000111') = '{"rules": ["test"]}'::jsonb,
  'オーナーは gatekeeper_rules を NULL から値に変更できること'
);

-- ========================================
-- 動作テスト5: gatekeeper_rules を値から NULL に変更（オーナー）
-- ========================================

DO $$
DECLARE
  test_space_id_2 UUID := '00000000-0000-0000-0000-000000000111';
  test_owner_id UUID := '00000000-0000-0000-0000-000000000011';
BEGIN
  -- auth.uid() がオーナー ID を返すように設定
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_owner_id::text)::text, true);
  
  -- オーナーとして値から NULL に変更
  UPDATE spaces
  SET gatekeeper_rules = NULL
  WHERE id = test_space_id_2;
  
  -- JWT claims をクリア
  PERFORM set_config('request.jwt.claims', '', true);
END $$;

SELECT ok(
  (SELECT gatekeeper_rules FROM spaces WHERE id = '00000000-0000-0000-0000-000000000111') IS NULL,
  'オーナーは gatekeeper_rules を値から NULL に変更できること'
);

-- ========================================
-- 動作テスト6: 同じ値への更新は常に許可される
-- ========================================

-- gatekeeper_rules を同じ値に更新する場合、トリガーは更新を許可する
-- これは IS NOT DISTINCT FROM チェックによるもの
DO $$
DECLARE
  test_space_id UUID := '00000000-0000-0000-0000-000000000110';
  test_non_owner_id UUID := '00000000-0000-0000-0000-000000000012';
  current_rules JSONB;
BEGIN
  -- 現在の gatekeeper_rules を取得
  SELECT gatekeeper_rules INTO current_rules
  FROM spaces
  WHERE id = test_space_id;
  
  -- 非オーナーの ID に変更しつつ、gatekeeper_rules は同じ値を設定
  -- この場合、gatekeeper_rules は実質的に変更されていないため、トリガーは許可する
  UPDATE spaces
  SET 
    owner_id = test_non_owner_id,
    gatekeeper_rules = current_rules
  WHERE id = test_space_id;
END $$;

SELECT ok(
  (SELECT owner_id FROM spaces WHERE id = '00000000-0000-0000-0000-000000000110') = '00000000-0000-0000-0000-000000000012',
  'gatekeeper_rules が変更されない場合、オーナーシップに関係なく更新が成功すること'
);

-- ========================================
-- クリーンアップ
-- ========================================

DO $$
DECLARE
  test_owner_id UUID := '00000000-0000-0000-0000-000000000011';
  test_non_owner_id UUID := '00000000-0000-0000-0000-000000000012';
  test_space_id UUID := '00000000-0000-0000-0000-000000000110';
  test_space_id_2 UUID := '00000000-0000-0000-0000-000000000111';
BEGIN
  DELETE FROM spaces WHERE id IN (test_space_id, test_space_id_2);
  DELETE FROM profiles WHERE id IN (test_owner_id, test_non_owner_id);
  DELETE FROM auth.users WHERE id IN (test_owner_id, test_non_owner_id);
END $$;

-- テスト終了
SELECT * FROM finish();

ROLLBACK;
