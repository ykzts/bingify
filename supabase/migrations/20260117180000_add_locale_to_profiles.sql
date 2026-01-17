-- Add locale column to profiles table for multilingual support
-- This enables personalized email notifications based on admin preferences

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'ja'
  CHECK (locale IN ('en', 'ja'));

-- Create index for efficient locale-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_locale ON public.profiles(locale);

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.locale IS 'User language preference (en: English, ja: Japanese). Used for email notifications and UI localization.';
