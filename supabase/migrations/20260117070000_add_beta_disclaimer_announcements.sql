-- Add initial beta disclaimer announcements
-- This migration adds announcements to replace the PreReleaseBanner component

-- ============================================================================
-- Part 1: Insert Japanese beta disclaimer announcement (parent)
-- ============================================================================
INSERT INTO announcements (
  id,
  title,
  content,
  priority,
  published,
  dismissible,
  locale,
  parent_id,
  starts_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000100'::uuid,
  'ベータ版に関するお知らせ',
  'Bingifyは現在ベータ版です。予期しない動作やデータの損失が発生する可能性があります。詳細については[GitHubリポジトリ](https://github.com/ykzts/bingify)をご覧ください。',
  'warning',
  true,
  true,
  'ja',
  NULL,
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Part 2: Insert English beta disclaimer announcement (translation)
-- ============================================================================
INSERT INTO announcements (
  id,
  title,
  content,
  priority,
  published,
  dismissible,
  locale,
  parent_id,
  starts_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000101'::uuid,
  'Beta Version Notice',
  'Bingify is currently in beta. Unexpected behavior or data loss may occur. For more information, please visit our [GitHub repository](https://github.com/ykzts/bingify).',
  'warning',
  true,
  true,
  'en',
  '00000000-0000-0000-0000-000000000100'::uuid,
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Part 3: Add comments
-- ============================================================================
COMMENT ON TABLE announcements IS 'System-wide announcements displayed to users. Supports multilingual content via parent-child relationships.';
