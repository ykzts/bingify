-- クォータチェック関数の SECURITY DEFINER テスト
-- 非所有者がスペースに参加できることを検証

BEGIN;

-- テストプランの設定
SELECT plan(6);

-- ========================================
-- テストユーザーとスペースの準備
-- ========================================

DO $$
DECLARE
  owner_id UUID := '00000000-0000-0000-0000-000000000011';
  participant_id UUID := '00000000-0000-0000-0000-000000000012';
  test_space_id UUID := '00000000-0000-0000-0000-000000000110';
BEGIN
  -- テストデータのクリーンアップ
  DELETE FROM participants WHERE space_id = test_space_id;
  DELETE FROM bingo_cards WHERE space_id = test_space_id;
  DELETE FROM spaces WHERE id = test_space_id;
  DELETE FROM profiles WHERE id IN (owner_id, participant_id);

  -- プロフィールを作成
  INSERT INTO profiles (id, email, full_name)
  VALUES 
    (owner_id, 'owner@example.com', 'Space Owner'),
    (participant_id, 'participant@example.com', 'Participant User');

  -- スペースを作成（owner_id が所有者）
  INSERT INTO spaces (id, share_key, owner_id, status, view_token, max_participants)
  VALUES (test_space_id, 'test-quota-space', owner_id, 'active', 'test-quota-view-token', 10);
END $$;

-- ========================================
-- SECURITY DEFINER 関数の確認
-- ========================================

-- テスト: check_participant_quota が SECURITY DEFINER として定義されていること
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'check_participant_quota'
      AND n.nspname = 'public'
      AND p.prosecdef = true
  ),
  'check_participant_quota() 関数が SECURITY DEFINER として定義されていること'
);

-- テスト: check_bingo_card_quota が SECURITY DEFINER として定義されていること
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'check_bingo_card_quota'
      AND n.nspname = 'public'
      AND p.prosecdef = true
  ),
  'check_bingo_card_quota() 関数が SECURITY DEFINER として定義されていること'
);

-- ========================================
-- 非所有者による参加テスト
-- ========================================

-- テスト: 非所有者がスペースに参加できること（participants テーブル）
DO $$
DECLARE
  owner_id UUID := '00000000-0000-0000-0000-000000000011';
  participant_id UUID := '00000000-0000-0000-0000-000000000012';
  test_space_id UUID := '00000000-0000-0000-0000-000000000110';
  insert_success BOOLEAN := false;
BEGIN
  -- 非所有者として participants に INSERT
  BEGIN
    INSERT INTO participants (space_id, user_id, nickname, bingo_status)
    VALUES (test_space_id, participant_id, 'Test Participant', 'not_bingo');
    insert_success := true;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to insert participant: %', SQLERRM;
      insert_success := false;
  END;

  -- 挿入が成功したかを確認
  IF NOT insert_success THEN
    RAISE EXCEPTION 'Participant insertion failed';
  END IF;
END $$;

SELECT ok(
  EXISTS (
    SELECT 1 FROM participants
    WHERE space_id = '00000000-0000-0000-0000-000000000110'
      AND user_id = '00000000-0000-0000-0000-000000000012'
  ),
  '非所有者がスペースに参加できること（participants テーブル）'
);

-- テスト: 非所有者がビンゴカードを作成できること（bingo_cards テーブル）
DO $$
DECLARE
  participant_id UUID := '00000000-0000-0000-0000-000000000012';
  test_space_id UUID := '00000000-0000-0000-0000-000000000110';
  insert_success BOOLEAN := false;
BEGIN
  -- 非所有者として bingo_cards に INSERT
  BEGIN
    INSERT INTO bingo_cards (space_id, user_id, numbers)
    VALUES (test_space_id, participant_id::TEXT, '[[1,2,3,4,5],[6,7,8,9,10],[11,12,0,13,14],[15,16,17,18,19],[20,21,22,23,24]]'::JSONB);
    insert_success := true;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to insert bingo card: %', SQLERRM;
      insert_success := false;
  END;

  -- 挿入が成功したかを確認
  IF NOT insert_success THEN
    RAISE EXCEPTION 'Bingo card insertion failed';
  END IF;
END $$;

SELECT ok(
  EXISTS (
    SELECT 1 FROM bingo_cards
    WHERE space_id = '00000000-0000-0000-0000-000000000110'
      AND user_id = '00000000-0000-0000-0000-000000000012'
  ),
  '非所有者がビンゴカードを作成できること（bingo_cards テーブル）'
);

-- ========================================
-- クォータ制限のテスト
-- ========================================

-- テスト: クォータ制限が正しく機能すること
DO $$
DECLARE
  owner_id UUID := '00000000-0000-0000-0000-000000000011';
  test_space_id UUID := '00000000-0000-0000-0000-000000000110';
  test_user_id UUID;
  quota_enforced BOOLEAN := false;
BEGIN
  -- max_participants を 2 に変更（既に 1 人参加している）
  UPDATE spaces SET max_participants = 2 WHERE id = test_space_id;

  -- 2人目を追加（成功するはず）
  INSERT INTO participants (space_id, user_id, nickname, bingo_status)
  VALUES (test_space_id, '00000000-0000-0000-0000-000000000013', 'Second Participant', 'not_bingo');

  -- 3人目を追加しようとする（失敗するはず）
  BEGIN
    INSERT INTO participants (space_id, user_id, nickname, bingo_status)
    VALUES (test_space_id, '00000000-0000-0000-0000-000000000014', 'Third Participant', 'not_bingo');
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%participant limit reached%' THEN
        quota_enforced := true;
      END IF;
  END;

  -- クォータ制限が適用されたかを確認
  IF NOT quota_enforced THEN
    RAISE EXCEPTION 'Quota limit was not enforced';
  END IF;
END $$;

SELECT ok(
  (SELECT COUNT(*) FROM participants WHERE space_id = '00000000-0000-0000-0000-000000000110') = 2,
  'クォータ制限が正しく機能すること（2 人まで参加可能）'
);

-- ========================================
-- クリーンアップ
-- ========================================

DO $$
DECLARE
  owner_id UUID := '00000000-0000-0000-0000-000000000011';
  participant_id UUID := '00000000-0000-0000-0000-000000000012';
  test_space_id UUID := '00000000-0000-0000-0000-000000000110';
BEGIN
  DELETE FROM bingo_cards WHERE space_id = test_space_id;
  DELETE FROM participants WHERE space_id = test_space_id;
  DELETE FROM spaces WHERE id = test_space_id;
  DELETE FROM profiles WHERE id IN (owner_id, participant_id, '00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000014');
END $$;

-- テスト終了
SELECT * FROM finish();

ROLLBACK;
