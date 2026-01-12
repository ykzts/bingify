-- 検証済みソーシャルチャンネルテーブル
-- ユーザーがOAuth経由で取得した自身のチャンネルID/ブロードキャスターIDを記録
-- スペース設定再表示時に所有権を検証するために使用

CREATE TABLE IF NOT EXISTS verified_social_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('youtube', 'twitch')),
  channel_id TEXT NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  -- 1ユーザーにつき各プロバイダー1レコードまで
  CONSTRAINT unique_user_provider UNIQUE (user_id, provider)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_verified_social_channels_user_id ON verified_social_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_verified_social_channels_user_provider ON verified_social_channels(user_id, provider);

-- コメントの追加
COMMENT ON TABLE verified_social_channels IS 'ユーザーが検証した（OAuth経由で取得した）自身のソーシャルチャンネルID/ブロードキャスターID。スペース設定でメンバーシップ/サブスクライバー要件を設定する際の所有権検証に使用。';
COMMENT ON COLUMN verified_social_channels.user_id IS '検証したユーザーID';
COMMENT ON COLUMN verified_social_channels.provider IS 'ソーシャルプラットフォーム (youtube または twitch)';
COMMENT ON COLUMN verified_social_channels.channel_id IS '検証済みチャンネルID（YouTube）またはブロードキャスターID（Twitch）';
COMMENT ON COLUMN verified_social_channels.verified_at IS 'チャンネルIDが最後に検証された日時';

-- Row Level Security (RLS) の有効化
ALTER TABLE verified_social_channels ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: ユーザーは自分のレコードのみ参照可能
CREATE POLICY "verified_social_channels_select_own" ON verified_social_channels
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLSポリシー: ユーザーは自分のレコードを挿入可能
CREATE POLICY "verified_social_channels_insert_own" ON verified_social_channels
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLSポリシー: ユーザーは自分のレコードを更新可能
CREATE POLICY "verified_social_channels_update_own" ON verified_social_channels
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLSポリシー: ユーザーは自分のレコードを削除可能
CREATE POLICY "verified_social_channels_delete_own" ON verified_social_channels
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- updated_at を自動更新するトリガー
CREATE TRIGGER verified_social_channels_updated_at
  BEFORE UPDATE ON verified_social_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
