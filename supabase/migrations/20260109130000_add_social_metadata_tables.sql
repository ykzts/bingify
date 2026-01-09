-- YouTube Channels テーブル: チャンネルメタデータのマスターテーブル
CREATE TABLE IF NOT EXISTS youtube_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id TEXT NOT NULL UNIQUE,
  handle TEXT,
  channel_title TEXT,
  custom_url TEXT,
  thumbnail_url TEXT,
  description TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  fetch_error TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  -- Note: YouTube チャンネルIDは現在 'UC' で始まる24文字の形式ですが、
  -- 将来的にYouTubeがこの形式を変更する可能性があります。
  -- その場合、このConstraintの更新が必要になります。
  CONSTRAINT valid_channel_id CHECK (char_length(channel_id) = 24 AND channel_id LIKE 'UC%')
);

-- Twitch Broadcasters テーブル: ブロードキャスターメタデータのマスターテーブル
CREATE TABLE IF NOT EXISTS twitch_broadcasters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcaster_id TEXT NOT NULL UNIQUE,
  username TEXT,
  display_name TEXT,
  profile_image_url TEXT,
  description TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  fetch_error TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  -- Note: Twitch ブロードキャスターIDは現在数字のみの形式ですが、
  -- 将来的にTwitchがこの形式を変更する可能性があります。
  -- その場合、このConstraintの更新が必要になります。
  CONSTRAINT valid_broadcaster_id CHECK (broadcaster_id ~ '^\d+$')
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_youtube_channels_channel_id ON youtube_channels(channel_id);
CREATE INDEX IF NOT EXISTS idx_youtube_channels_fetched_at ON youtube_channels(fetched_at);
CREATE INDEX IF NOT EXISTS idx_twitch_broadcasters_broadcaster_id ON twitch_broadcasters(broadcaster_id);
CREATE INDEX IF NOT EXISTS idx_twitch_broadcasters_fetched_at ON twitch_broadcasters(fetched_at);

-- コメントの追加
COMMENT ON TABLE youtube_channels IS 'YouTubeチャンネルのメタデータマスターテーブル。複数のスペース間で共有され、キャッシングに使用される。';
COMMENT ON COLUMN youtube_channels.channel_id IS 'YouTubeチャンネルID（UCで始まる24文字）';
COMMENT ON COLUMN youtube_channels.handle IS 'YouTubeハンドル（@username形式）';
COMMENT ON COLUMN youtube_channels.channel_title IS 'チャンネル名';
COMMENT ON COLUMN youtube_channels.custom_url IS 'カスタムURL（youtube.com/c/xxx形式）';
COMMENT ON COLUMN youtube_channels.thumbnail_url IS 'チャンネルのサムネイルURL';
COMMENT ON COLUMN youtube_channels.fetched_at IS 'メタデータが最後に取得された日時';
COMMENT ON COLUMN youtube_channels.fetch_error IS '最後のAPI呼び出しで発生したエラーメッセージ';
COMMENT ON COLUMN youtube_channels.created_by IS 'このレコードを最初に作成したユーザー';

COMMENT ON TABLE twitch_broadcasters IS 'Twitchブロードキャスターのメタデータマスターテーブル。複数のスペース間で共有され、キャッシングに使用される。';
COMMENT ON COLUMN twitch_broadcasters.broadcaster_id IS 'Twitchブロードキャスター ID（数字のみ）';
COMMENT ON COLUMN twitch_broadcasters.username IS 'Twitchユーザー名（小文字）';
COMMENT ON COLUMN twitch_broadcasters.display_name IS 'Twitch表示名（大文字小文字混在可）';
COMMENT ON COLUMN twitch_broadcasters.profile_image_url IS 'プロフィール画像のURL';
COMMENT ON COLUMN twitch_broadcasters.fetched_at IS 'メタデータが最後に取得された日時';
COMMENT ON COLUMN twitch_broadcasters.fetch_error IS '最後のAPI呼び出しで発生したエラーメッセージ';
COMMENT ON COLUMN twitch_broadcasters.created_by IS 'このレコードを最初に作成したユーザー';

-- Row Level Security (RLS) の有効化
ALTER TABLE youtube_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitch_broadcasters ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 全員読み取り可能
CREATE POLICY "youtube_channels_select_all" ON youtube_channels
  FOR SELECT
  USING (true);

CREATE POLICY "twitch_broadcasters_select_all" ON twitch_broadcasters
  FOR SELECT
  USING (true);

-- RLSポリシー: 認証済みユーザーのみ挿入・更新可能
CREATE POLICY "youtube_channels_insert_authenticated" ON youtube_channels
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "youtube_channels_update_authenticated" ON youtube_channels
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "twitch_broadcasters_insert_authenticated" ON twitch_broadcasters
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "twitch_broadcasters_update_authenticated" ON twitch_broadcasters
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- updated_at を自動更新するトリガー関数（既存のものがあればそれを使用）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at トリガーの設定
CREATE TRIGGER youtube_channels_updated_at
  BEFORE UPDATE ON youtube_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER twitch_broadcasters_updated_at
  BEFORE UPDATE ON twitch_broadcasters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
