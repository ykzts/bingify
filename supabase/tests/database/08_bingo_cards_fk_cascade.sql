-- ビンゴカード外部キー制約とCASCADE削除のテスト
-- bingo_cards.user_id が auth.users への外部キー制約を持ち、CASCADE 削除が動作することを検証

BEGIN;

-- テストプランの設定
SELECT plan(7);

-- ========================================
-- 外部キー制約の存在確認
-- ========================================

-- bingo_cards.user_id -> auth.users.id の外部キー制約が存在すること
SELECT fk_ok(
  'public', 'bingo_cards', 'user_id',
  'auth', 'users', 'id',
  'bingo_cards.user_id は auth.users.id への外部キー制約があること'
);

-- ========================================
-- データ型の検証
-- ========================================

-- bingo_cards.user_id は UUID 型であること
SELECT col_type_is(
  'public', 'bingo_cards', 'user_id', 'uuid',
  'bingo_cards.user_id は uuid 型であること'
);

-- ========================================
-- インデックスの存在確認
-- ========================================

-- bingo_cards.user_id にインデックスが存在すること
SELECT has_index(
  'public', 'bingo_cards', 'idx_bingo_cards_user_id',
  'bingo_cards.user_id にインデックスが存在すること'
);

-- ========================================
-- CASCADE削除の動作テスト
-- ========================================

-- テスト用のユーザーとデータを準備
DO $$
DECLARE
  test_user_id UUID;
  test_space_id UUID;
BEGIN
  -- テスト用のユーザーを作成（auth.users テーブルに直接挿入）
  test_user_id := '00000000-0000-0000-0000-000000000099'::uuid;
  
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
    'test-cascade@example.com',
    crypt('password', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- テスト用のスペースを作成
  INSERT INTO spaces (id, share_key, owner_id, view_token)
  VALUES (
    '00000000-0000-0000-0000-000000000098'::uuid,
    'test-cascade-space-20260111',
    test_user_id,
    encode(gen_random_bytes(32), 'base64')
  )
  ON CONFLICT (share_key) DO NOTHING;
  
  test_space_id := '00000000-0000-0000-0000-000000000098'::uuid;

  -- テスト用の参加者を作成
  INSERT INTO participants (space_id, user_id)
  VALUES (test_space_id, test_user_id)
  ON CONFLICT (space_id, user_id) DO NOTHING;

  -- テスト用のビンゴカードを作成
  INSERT INTO bingo_cards (space_id, user_id, numbers)
  VALUES (
    test_space_id,
    test_user_id,
    '[[1,2,3,4,5],[6,7,8,9,10],[11,12,0,13,14],[15,16,17,18,19],[20,21,22,23,24]]'::jsonb
  );
END $$;

-- ビンゴカードが正常に作成されたことを確認
SELECT ok(
  (SELECT COUNT(*) FROM bingo_cards WHERE user_id = '00000000-0000-0000-0000-000000000099'::uuid) = 1,
  'テスト用ビンゴカードが作成されていること'
);

-- 参加者が正常に作成されたことを確認
SELECT ok(
  (SELECT COUNT(*) FROM participants WHERE user_id = '00000000-0000-0000-0000-000000000099'::uuid) = 1,
  'テスト用参加者が作成されていること'
);

-- ========================================
-- CASCADE削除テスト: ユーザー削除時
-- ========================================

-- ユーザーを削除
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000099'::uuid;

-- CASCADE削除により、ビンゴカードも自動的に削除されること
SELECT ok(
  (SELECT COUNT(*) FROM bingo_cards WHERE user_id = '00000000-0000-0000-0000-000000000099'::uuid) = 0,
  'ユーザー削除時にビンゴカードがCASCADE削除されること'
);

-- CASCADE削除により、参加者も自動的に削除されること
SELECT ok(
  (SELECT COUNT(*) FROM participants WHERE user_id = '00000000-0000-0000-0000-000000000099'::uuid) = 0,
  'ユーザー削除時に参加者レコードがCASCADE削除されること'
);

-- テスト終了
SELECT * FROM finish();

ROLLBACK;
