-- ============================================================================
-- NOTIFICATION CENTER ENHANCEMENT
-- Adds entity linking columns to notifications, composite indexes for
-- performant queries, redesigns notification_preferences to support
-- per-trigger in_app toggle matrix, and hardens RLS policies.
-- ============================================================================

-- ---------- 1. notifications: add entity linking columns ----------

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid;

COMMENT ON COLUMN public.notifications.entity_type IS 'Source entity kind, e.g. approval, decision, task, bug, signal';
COMMENT ON COLUMN public.notifications.entity_id   IS 'FK-less reference to the source entity row';

-- Composite index for workspace+user timeline queries
CREATE INDEX IF NOT EXISTS idx_notifications_ws_user_created
  ON public.notifications (workspace_id, user_id, created_at DESC);

-- Partial index for fast unread-count queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, read_at)
  WHERE read_at IS NULL;

-- ---------- 2. notification_preferences: in_app trigger matrix ----------

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS approval_created       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS approval_overdue        boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS decision_review_due     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS task_assigned           boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS mention_in_comment      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS signal_scan_detected    boolean NOT NULL DEFAULT true;

-- ---------- 3. RLS policies for notifications ----------

-- Drop existing policies so we can recreate them cleanly
DROP POLICY IF EXISTS "notifications select own"     ON public.notifications;
DROP POLICY IF EXISTS "notifications mark own read"  ON public.notifications;
DROP POLICY IF EXISTS "notifications delete own"     ON public.notifications;
DROP POLICY IF EXISTS "notifications insert service" ON public.notifications;

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: user can read own notifications within their workspace
CREATE POLICY "notifications select own"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));

-- INSERT: only service_role (edge functions / triggers create notifications)
-- No INSERT policy for authenticated means authenticated users cannot insert.
-- service_role bypasses RLS by default so no explicit policy needed,
-- but we add one for clarity and forward-compatibility.
CREATE POLICY "notifications insert service"
  ON public.notifications FOR INSERT TO service_role
  WITH CHECK (true);

-- UPDATE: user can mark own notifications as read (column grant restricts to read_at)
CREATE POLICY "notifications mark own read"
  ON public.notifications FOR UPDATE TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: service_role only (cleanup / retention jobs)
-- No DELETE policy for authenticated; revoke the privilege below.

-- ---------- 4. Grants for notifications ----------

-- Reset grants to exact required set
REVOKE ALL ON public.notifications FROM authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- ---------- 5. RLS policies for notification_preferences ----------

DROP POLICY IF EXISTS "Users can view own notification prefs"   ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert own notification prefs"  ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification prefs"  ON public.notification_preferences;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_prefs select own"
  ON public.notification_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notification_prefs insert own"
  ON public.notification_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_prefs update own"
  ON public.notification_preferences FOR UPDATE TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------- 6. Grants for notification_preferences ----------

REVOKE ALL ON public.notification_preferences FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
