-- Add locale and theme columns to screen_settings
ALTER TABLE screen_settings
ADD COLUMN locale TEXT DEFAULT 'en' CHECK (locale IN ('en', 'ja')),
ADD COLUMN theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('light', 'dark'));

-- Update the comment
COMMENT ON TABLE screen_settings IS 'Real-time screen display settings for each space including locale and theme preferences.';
