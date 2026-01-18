-- Add language column to profiles table for multilingual support
-- This syncs with the language preference stored in auth.users.raw_user_meta_data

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'ja'
  CHECK (language IN ('en', 'ja'));

-- Create index for efficient language-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_language ON public.profiles(language);

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.language IS 'User language preference (en: English, ja: Japanese). Synced from auth.users.raw_user_meta_data->''language''. Used for email notifications and UI localization.';

-- Update handle_new_user function to sync language from user metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, language)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'language', 'ja')
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        avatar_url = EXCLUDED.avatar_url,
        language = COALESCE(EXCLUDED.language, profiles.language),
        updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
