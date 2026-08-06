-- Whiteboards: freeform diagram canvases, one row per board.
-- Elements are stored as a single JSONB array — the client renders + edits
-- it fully client-side and autosaves the whole array.

CREATE TABLE IF NOT EXISTS public.whiteboards (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name          text        NOT NULL DEFAULT 'Adsız pano',
  -- elements: [{ id, kind:'rect'|'ellipse'|'text'|'arrow', x, y, w?, h?, x2?, y2?, text?, color?, stroke? }]
  elements      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  archived_at   timestamptz,
  created_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whiteboards_workspace ON public.whiteboards(workspace_id);

DROP TRIGGER IF EXISTS trg_whiteboards_updated_at ON public.whiteboards;
CREATE TRIGGER trg_whiteboards_updated_at
  BEFORE UPDATE ON public.whiteboards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.whiteboards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whiteboards readable by workspace members"   ON public.whiteboards;
DROP POLICY IF EXISTS "whiteboards writable by workspace members"   ON public.whiteboards;
DROP POLICY IF EXISTS "whiteboards updatable by workspace members"  ON public.whiteboards;
DROP POLICY IF EXISTS "whiteboards deletable by workspace members"  ON public.whiteboards;

CREATE POLICY "whiteboards readable by workspace members"
  ON public.whiteboards FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "whiteboards writable by workspace members"
  ON public.whiteboards FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "whiteboards updatable by workspace members"
  ON public.whiteboards FOR UPDATE
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "whiteboards deletable by workspace members"
  ON public.whiteboards FOR DELETE
  USING (public.is_workspace_member(workspace_id, auth.uid()));
