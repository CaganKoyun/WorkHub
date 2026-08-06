-- Saved views: named filter+sort presets over issues/tasks/bugs/projects.
-- Personal by default (owner_id); toggle is_shared to expose to workspace.
-- Favorites are per-user via saved_view_favorites junction.

CREATE TABLE IF NOT EXISTS public.saved_views (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target        text        NOT NULL CHECK (target IN ('issues', 'tasks', 'bugs', 'projects')),
  name          text        NOT NULL,
  description   text,
  -- filters: {status?: string[], priority?: string[], assignee_ids?: uuid[], project_ids?: uuid[], tags?: string[], search?: string}
  filters       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- sort: {field: string, dir: 'asc'|'desc'}
  sort          jsonb       NOT NULL DEFAULT '{}'::jsonb,
  group_by      text,
  is_shared     boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_views_workspace ON public.saved_views(workspace_id, target);
CREATE INDEX IF NOT EXISTS idx_saved_views_owner ON public.saved_views(owner_id);

DROP TRIGGER IF EXISTS trg_saved_views_updated_at ON public.saved_views;
CREATE TRIGGER trg_saved_views_updated_at
  BEFORE UPDATE ON public.saved_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.saved_view_favorites (
  view_id    uuid NOT NULL REFERENCES public.saved_views(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (view_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_view_favorites_user ON public.saved_view_favorites(user_id);

ALTER TABLE public.saved_views          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_view_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_views readable by owner or if shared"     ON public.saved_views;
DROP POLICY IF EXISTS "saved_views insertable by workspace members"    ON public.saved_views;
DROP POLICY IF EXISTS "saved_views updatable by owner"                 ON public.saved_views;
DROP POLICY IF EXISTS "saved_views deletable by owner or admin"        ON public.saved_views;
DROP POLICY IF EXISTS "saved_view_favorites readable by user"          ON public.saved_view_favorites;
DROP POLICY IF EXISTS "saved_view_favorites writable by user"          ON public.saved_view_favorites;
DROP POLICY IF EXISTS "saved_view_favorites deletable by user"         ON public.saved_view_favorites;

CREATE POLICY "saved_views readable by owner or if shared"
  ON public.saved_views FOR SELECT
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    AND (owner_id = auth.uid() OR is_shared = true)
  );
CREATE POLICY "saved_views insertable by workspace members"
  ON public.saved_views FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND owner_id = auth.uid());
CREATE POLICY "saved_views updatable by owner"
  ON public.saved_views FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "saved_views deletable by owner or admin"
  ON public.saved_views FOR DELETE
  USING (owner_id = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "saved_view_favorites readable by user"
  ON public.saved_view_favorites FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "saved_view_favorites writable by user"
  ON public.saved_view_favorites FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "saved_view_favorites deletable by user"
  ON public.saved_view_favorites FOR DELETE
  USING (user_id = auth.uid());
