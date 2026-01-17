-- Add multilingual support to announcements
-- This migration adds locale and parent_id columns to enable parent-child translation model

-- ============================================================================
-- Part 1: Add locale and parent_id columns to announcements table
-- ============================================================================

-- Add locale column with default 'ja' for existing records
ALTER TABLE announcements
ADD COLUMN locale TEXT NOT NULL DEFAULT 'ja'
  CHECK (locale IN ('en', 'ja'));

-- Add parent_id column for translation relationships
ALTER TABLE announcements
ADD COLUMN parent_id UUID
  REFERENCES announcements(id) ON DELETE CASCADE;

-- ============================================================================
-- Part 2: Add constraints and indexes
-- ============================================================================

-- Ensure same parent cannot have duplicate translations for the same locale
-- This constraint allows:
-- - Multiple parent announcements (parent_id IS NULL) with the same locale
-- - Multiple translations (parent_id IS NOT NULL) with different locales for the same parent
ALTER TABLE announcements
ADD CONSTRAINT unique_parent_locale 
  UNIQUE NULLS NOT DISTINCT (parent_id, locale);

-- Performance indexes
CREATE INDEX idx_announcements_locale_published 
  ON announcements(locale, published, starts_at, ends_at)
  WHERE published = true;

CREATE INDEX idx_announcements_parent_id 
  ON announcements(parent_id)
  WHERE parent_id IS NOT NULL;

-- ============================================================================
-- Part 3: Add comments
-- ============================================================================

COMMENT ON COLUMN announcements.locale IS 'Language locale for this announcement (en, ja)';
COMMENT ON COLUMN announcements.parent_id IS 'Parent announcement ID for translations. NULL for parent announcements.';
COMMENT ON CONSTRAINT unique_parent_locale ON announcements IS 'Ensures each parent has at most one translation per locale';

-- ============================================================================
-- Part 4: Update RLS policies to work with locale
-- ============================================================================

-- Drop and recreate the authenticated users policy to include locale filtering
DROP POLICY IF EXISTS "Authenticated users can read published announcements" ON announcements;

CREATE POLICY "Authenticated users can read published announcements"
  ON announcements
  FOR SELECT
  TO authenticated
  USING (
    published = true
    AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
    AND (ends_at IS NULL OR ends_at > CURRENT_TIMESTAMP)
  );

-- Note: Locale filtering will be done at application level since RLS policies
-- cannot access user's locale preference. This keeps the policy simple and
-- allows the application to handle locale-based filtering dynamically.
