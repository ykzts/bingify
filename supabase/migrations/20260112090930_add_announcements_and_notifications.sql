-- Add announcements and notifications feature
-- This migration includes:
-- 1. announcements table for global and space-specific announcements
-- 2. announcement_dismissals table for tracking user dismissals
-- 3. space_announcements table for linking announcements to spaces
-- 4. notifications table for user notifications with automatic expiration

-- ============================================================================
-- Part 1: Create announcements table
-- ============================================================================

-- Create announcements table for global announcements
-- This table stores announcements that can be displayed globally or per-space
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('info', 'warning', 'error')),
  dismissible BOOLEAN NOT NULL DEFAULT true,
  published BOOLEAN NOT NULL DEFAULT false,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_announcements_published ON announcements(published);
CREATE INDEX IF NOT EXISTS idx_announcements_starts_at ON announcements(starts_at);
CREATE INDEX IF NOT EXISTS idx_announcements_ends_at ON announcements(ends_at);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);

-- Add comments
COMMENT ON TABLE announcements IS 'Global and space-specific announcements with temporal control and priority settings';
COMMENT ON COLUMN announcements.priority IS 'Priority level: info (informational), warning (important), error (critical)';
COMMENT ON COLUMN announcements.dismissible IS 'Whether users can dismiss this announcement';
COMMENT ON COLUMN announcements.published IS 'Whether this announcement is currently published';
COMMENT ON COLUMN announcements.starts_at IS 'Optional start time for announcement visibility';
COMMENT ON COLUMN announcements.ends_at IS 'Optional end time for announcement visibility';

-- Enable RLS on announcements table
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read published announcements
-- within their display period (starts_at/ends_at)
CREATE POLICY "Authenticated users can read published announcements"
  ON announcements
  FOR SELECT
  TO authenticated
  USING (
    published = true
    AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
    AND (ends_at IS NULL OR ends_at > CURRENT_TIMESTAMP)
  );

-- Policy: Site admins can read all announcements
CREATE POLICY "Site admins can read all announcements"
  ON announcements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- Policy: Site admins can insert announcements
CREATE POLICY "Site admins can insert announcements"
  ON announcements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- Policy: Site admins can update announcements
CREATE POLICY "Site admins can update announcements"
  ON announcements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- Policy: Site admins can delete announcements
CREATE POLICY "Site admins can delete announcements"
  ON announcements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- ============================================================================
-- Part 2: Create announcement_dismissals table
-- ============================================================================

-- Create announcement_dismissals table for tracking user dismissals
-- This table stores which users have dismissed which announcements
CREATE TABLE IF NOT EXISTS announcement_dismissals (
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (announcement_id, user_id)
);

-- Add index for efficient querying by user
CREATE INDEX IF NOT EXISTS idx_announcement_dismissals_user_id ON announcement_dismissals(user_id);

-- Add comment
COMMENT ON TABLE announcement_dismissals IS 'Tracks which users have dismissed which announcements';

-- Enable RLS on announcement_dismissals table
ALTER TABLE announcement_dismissals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own dismissals
CREATE POLICY "Users can read their own dismissals"
  ON announcement_dismissals
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own dismissals
CREATE POLICY "Users can insert their own dismissals"
  ON announcement_dismissals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own dismissals (to re-show announcements)
CREATE POLICY "Users can delete their own dismissals"
  ON announcement_dismissals
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Part 3: Create space_announcements table
-- ============================================================================

-- Create space_announcements table for linking announcements to spaces
-- This table associates announcements with specific spaces
CREATE TABLE IF NOT EXISTS space_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (announcement_id, space_id)
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_space_announcements_announcement_id ON space_announcements(announcement_id);
CREATE INDEX IF NOT EXISTS idx_space_announcements_space_id ON space_announcements(space_id);
CREATE INDEX IF NOT EXISTS idx_space_announcements_pinned ON space_announcements(pinned);

-- Add comment
COMMENT ON TABLE space_announcements IS 'Links announcements to specific spaces with pinning capability';
COMMENT ON COLUMN space_announcements.pinned IS 'Whether this announcement is pinned to the top of the space';

-- Enable RLS on space_announcements table
ALTER TABLE space_announcements ENABLE ROW LEVEL SECURITY;

-- Policy: Space owners can read announcements for their spaces
CREATE POLICY "Space owners can read space announcements"
  ON space_announcements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = space_announcements.space_id
        AND s.owner_id = auth.uid()
    )
  );

-- Policy: Space admins can read announcements for their spaces
CREATE POLICY "Space admins can read space announcements"
  ON space_announcements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM space_roles sr
      WHERE sr.space_id = space_announcements.space_id
        AND sr.user_id = auth.uid()
        AND sr.role = 'admin'
    )
  );

-- Policy: Participants can read announcements for their spaces
CREATE POLICY "Participants can read space announcements"
  ON space_announcements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants p
      WHERE p.space_id = space_announcements.space_id
        AND p.user_id = auth.uid()
    )
  );

-- Policy: Space owners can insert announcements for their spaces
CREATE POLICY "Space owners can insert space announcements"
  ON space_announcements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = space_announcements.space_id
        AND s.owner_id = auth.uid()
    )
    -- Verify the announcement exists and is published
    AND EXISTS (
      SELECT 1 FROM announcements a
      WHERE a.id = space_announcements.announcement_id
        AND a.published = true
    )
  );

-- Policy: Space admins can insert announcements for their spaces
CREATE POLICY "Space admins can insert space announcements"
  ON space_announcements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM space_roles sr
      WHERE sr.space_id = space_announcements.space_id
        AND sr.user_id = auth.uid()
        AND sr.role = 'admin'
    )
    -- Verify the announcement exists and is published
    AND EXISTS (
      SELECT 1 FROM announcements a
      WHERE a.id = space_announcements.announcement_id
        AND a.published = true
    )
  );

-- Policy: Space owners can update space announcements
CREATE POLICY "Space owners can update space announcements"
  ON space_announcements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = space_announcements.space_id
        AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = space_announcements.space_id
        AND s.owner_id = auth.uid()
    )
  );

-- Policy: Space admins can update space announcements
CREATE POLICY "Space admins can update space announcements"
  ON space_announcements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM space_roles sr
      WHERE sr.space_id = space_announcements.space_id
        AND sr.user_id = auth.uid()
        AND sr.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM space_roles sr
      WHERE sr.space_id = space_announcements.space_id
        AND sr.user_id = auth.uid()
        AND sr.role = 'admin'
    )
  );

-- Policy: Space owners can delete space announcements
CREATE POLICY "Space owners can delete space announcements"
  ON space_announcements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM spaces s
      WHERE s.id = space_announcements.space_id
        AND s.owner_id = auth.uid()
    )
  );

-- Policy: Space admins can delete space announcements
CREATE POLICY "Space admins can delete space announcements"
  ON space_announcements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM space_roles sr
      WHERE sr.space_id = space_announcements.space_id
        AND sr.user_id = auth.uid()
        AND sr.role = 'admin'
    )
  );

-- ============================================================================
-- Part 4: Create notifications table
-- ============================================================================

-- Create notifications table for user notifications
-- This table stores user-specific notifications with automatic expiration
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'space_invitation',
    'space_updated',
    'bingo_achieved',
    'announcement_published',
    'system_update',
    'role_changed',
    'space_closed'
  )),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Add comments
COMMENT ON TABLE notifications IS 'User notifications with automatic 30-day expiration';
COMMENT ON COLUMN notifications.type IS 'Notification type: space_invitation, space_updated, bingo_achieved, announcement_published, system_update, role_changed, space_closed';
COMMENT ON COLUMN notifications.metadata IS 'Additional notification metadata stored as JSONB';
COMMENT ON COLUMN notifications.expires_at IS 'Expiration timestamp, defaults to 30 days from creation';

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own notifications
CREATE POLICY "Users can read their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: System (service role) can insert notifications for any user
-- Note: This policy is explicitly restricted to service_role to prevent
-- client-side code from creating notifications for arbitrary users.
-- Only server-side code using service_role can create notifications.
CREATE POLICY "Service role can insert notifications"
  ON notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Enable Realtime for notifications table (for live updates)
-- Note: Realtime respects RLS policies, so users will only receive updates
-- for notifications they have access to (their own notifications per the SELECT policy)
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================================
-- Part 5: Add updated_at trigger for announcements table
-- ============================================================================

-- Create or replace trigger to update updated_at column on announcements
CREATE TRIGGER announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
