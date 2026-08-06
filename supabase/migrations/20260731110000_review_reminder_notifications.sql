-- PRD Görev 2 — Review bildirim altyapısı.
-- In-app bildirim tablosu + notification_preferences'a review_reminder tercihi.
-- Bildirimi yalnızca review-reminder edge fonksiyonu (service_role) üretir;
-- client sadece kendi bildirimlerini okur/okundu işaretler/siler.

-- NOTE: this migration is idempotent. An earlier migration (20260731074317)
-- created public.notifications with the same shape; a clean-DB replay
-- (Supabase Preview) needs IF NOT EXISTS / DROP IF EXISTS to not blow up.
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.current_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, created_at DESC);
-- Günde-1 idempotensi sorgusu için: (user, workspace, kind, gün)
CREATE INDEX IF NOT EXISTS idx_notifications_dedup ON public.notifications (user_id, workspace_id, kind, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Kural 1 gereği workspace damgası (client insert yolu yok ama kalıp korunur)
-- workspace_id DEFAULT public.current_workspace_id() ile damgalanir

DROP POLICY IF EXISTS "notifications select own" ON public.notifications;
CREATE POLICY "notifications select own"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "notifications mark own read" ON public.notifications;
CREATE POLICY "notifications mark own read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications delete own" ON public.notifications;
CREATE POLICY "notifications delete own"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Okundu işaretleme dışında kolon değiştirilmesin
REVOKE UPDATE ON public.notifications FROM authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

-- Tercih: karar review hatırlatması (varsayılan açık)
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS review_reminder boolean NOT NULL DEFAULT true;
