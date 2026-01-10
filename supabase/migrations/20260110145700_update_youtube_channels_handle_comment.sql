-- YouTubeチャンネルのhandleカラムのコメントを更新
-- handleは@プレフィックスなしで保存される（表示時に@を付与）
COMMENT ON COLUMN youtube_channels.handle IS 'YouTubeハンドル（@なし、例: username）。表示時には@を付与する。';

-- 既存データの修正: @プレフィックスが付いているhandleがあれば@を削除
-- Note: 現在のコードは既に@なしで保存しているため、影響を受けるデータは少ないはず
UPDATE youtube_channels
SET handle = regexp_replace(handle, '^@+', '')
WHERE handle LIKE '@%';
