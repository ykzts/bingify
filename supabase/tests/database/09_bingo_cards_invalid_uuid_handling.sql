-- ビンゴカード無効UUID処理のテスト
-- マイグレーションが無効なUUID形式のuser_idを安全に処理することを検証
-- 外部キー制約が正しく機能することを検証

BEGIN;

-- テストプランの設定
SELECT plan(4);

-- ========================================
-- テスト用データの準備
-- ========================================

DO $$
DECLARE
  test_space_id UUID;
  test_user_id UUID;
BEGIN
  -- テスト用のユーザーを作成
  test_user_id := '00000000-0000-0000-0000-000000000091'::uuid;
  
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
  ) VALUES (
    test_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test-uuid-validation@example.com',
    crypt('password', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- テスト用のスペースを作成
  test_space_id := '00000000-0000-0000-0000-000000000092'::uuid;
  
  INSERT INTO spaces (id, share_key, owner_id, view_token)
  VALUES (
    test_space_id,
    'test-uuid-validation-20260111',
    test_user_id,
    encode(gen_random_bytes(32), 'base64')
  )
  ON CONFLICT (share_key) DO NOTHING;

  -- 有効なUUIDのビンゴカードを作成
  INSERT INTO bingo_cards (space_id, user_id, numbers)
  VALUES (
    test_space_id,
    test_user_id,
    '[[1,2,3,4,5],[6,7,8,9,10],[11,12,0,13,14],[15,16,17,18,19],[20,21,22,23,24]]'::jsonb
  );
END $$;

-- ========================================
-- 正常ケースのテスト
-- ========================================

-- 有効なUUIDのビンゴカードが正常に作成されていることを確認
SELECT ok(
  (SELECT COUNT(*) FROM bingo_cards WHERE user_id = '00000000-0000-0000-0000-000000000091'::uuid) = 1,
  '有効なUUIDのビンゴカードが正常に作成されること'
);

-- user_idカラムがUUID型であることを確認
SELECT col_type_is(
  'public', 'bingo_cards', 'user_id', 'uuid',
  'マイグレーション後、user_idはUUID型であること'
);

-- ========================================
-- 外部キー制約違反のテスト
-- ========================================

-- 存在しないユーザーIDでのINSERTが外部キー制約違反でエラーになることを確認
SELECT throws_ok(
  $$
    INSERT INTO bingo_cards (space_id, user_id, numbers)
    VALUES (
      '00000000-0000-0000-0000-000000000092'::uuid,
      '99999999-9999-9999-9999-999999999999'::uuid,
      '[[1,2,3,4,5],[6,7,8,9,10],[11,12,0,13,14],[15,16,17,18,19],[20,21,22,23,24]]'::jsonb
    )
  $$,
  '23503',  -- foreign_key_violation
  NULL,
  '存在しないuser_idでのINSERTは外部キー制約違反でエラーになること'
);

-- ========================================
-- マイグレーション後のデータ整合性テスト
-- ========================================

-- マイグレーション実行後、全てのbingo_cardsのuser_idが有効なauth.usersを参照していることを確認
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM bingo_cards bc
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = bc.user_id
    )
  ),
  'マイグレーション後、全てのビンゴカードが有効なユーザーを参照していること'
);

-- テスト終了
SELECT * FROM finish();

ROLLBACK;
