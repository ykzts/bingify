-- Add foreign key constraint to bingo_cards.user_id
-- This migration ensures data integrity by linking bingo_cards to auth.users with CASCADE deletion

-- Step 1: クリーンアップ - 孤立したビンゴカードレコードを削除
-- Delete orphaned bingo_cards where user_id doesn't exist in auth.users or participants
DELETE FROM bingo_cards
WHERE user_id::uuid NOT IN (SELECT id FROM auth.users);

-- Step 2: RLS ポリシーを一時的に削除（型変更のため）
DROP POLICY IF EXISTS "Users can read their own bingo cards" ON bingo_cards;
DROP POLICY IF EXISTS "Users can insert their own bingo cards" ON bingo_cards;
DROP POLICY IF EXISTS "Users can delete their own bingo cards" ON bingo_cards;

-- Step 3: user_id カラムの型を TEXT から UUID に変更
ALTER TABLE bingo_cards
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- Step 4: 外部キー制約を追加（CASCADE 削除付き）
-- When a user is deleted from auth.users, all their bingo_cards will be automatically deleted
ALTER TABLE bingo_cards
  ADD CONSTRAINT bingo_cards_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users (id)
  ON DELETE CASCADE;

-- Step 5: パフォーマンス向上のため user_id にインデックスを追加（まだ存在しない場合）
CREATE INDEX IF NOT EXISTS idx_bingo_cards_user_id ON bingo_cards (user_id);

-- Step 6: RLS ポリシーを再作成（UUID型に対応）
CREATE POLICY "Users can read their own bingo cards"
  ON bingo_cards
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can insert their own bingo cards"
  ON bingo_cards
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    -- User must be a participant in the space
    AND EXISTS (
      SELECT 1 FROM participants p
      WHERE p.space_id = bingo_cards.space_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own bingo cards"
  ON bingo_cards
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );
