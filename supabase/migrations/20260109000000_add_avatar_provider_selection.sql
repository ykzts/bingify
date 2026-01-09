-- user_provider_avatars テーブルの作成
-- プロバイダー固有のアバター情報を管理
CREATE TABLE IF NOT EXISTS user_provider_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'twitch', 'github', 'discord')),
  avatar_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- インデックスの作成
CREATE INDEX idx_user_provider_avatars_user_id ON user_provider_avatars(user_id);

-- RLS の有効化
ALTER TABLE user_provider_avatars ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のプロバイダーアバター情報を読み取れる
CREATE POLICY "Users can read their own provider avatars"
  ON user_provider_avatars
  FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分のプロバイダーアバター情報を挿入できる
CREATE POLICY "Users can insert their own provider avatars"
  ON user_provider_avatars
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のプロバイダーアバター情報を更新できる
CREATE POLICY "Users can update their own provider avatars"
  ON user_provider_avatars
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- profiles テーブルに avatar_source カラムを追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_source TEXT 
  CHECK (avatar_source IN ('google', 'twitch', 'github', 'discord', 'upload', 'default')) 
  DEFAULT 'default';

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_source ON profiles(avatar_source);

-- updated_at トリガーを user_provider_avatars テーブルにも適用
CREATE OR REPLACE FUNCTION update_user_provider_avatars_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_provider_avatars_updated_at_trigger ON user_provider_avatars;
CREATE TRIGGER update_user_provider_avatars_updated_at_trigger
  BEFORE UPDATE ON user_provider_avatars
  FOR EACH ROW
  EXECUTE FUNCTION update_user_provider_avatars_updated_at();
