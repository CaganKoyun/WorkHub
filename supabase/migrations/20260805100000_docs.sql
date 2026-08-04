-- Docs / Wiki (Notion-lite): workspace-scoped hierarchical pages with rich-text bodies.
-- Tree via parent_id; sibling order via position; soft-archive via archived_at.
-- Follows the same RLS + FTS patterns as tasks/projects/bugs.

CREATE TABLE IF NOT EXISTS public.docs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  parent_id       uuid        REFERENCES public.docs(id) ON DELETE CASCADE,
  title           text        NOT NULL DEFAULT 'Adsız sayfa',
  body            text        NOT NULL DEFAULT '',
  icon            text,
  position        integer     NOT NULL DEFAULT 0,
  archived_at     timestamptz,
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_docs_workspace     ON public.docs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_docs_parent        ON public.docs(parent_id);
CREATE INDEX IF NOT EXISTS idx_docs_ws_position   ON public.docs(workspace_id, parent_id, position);

DROP TRIGGER IF EXISTS trg_docs_updated_at ON public.docs;
CREATE TRIGGER trg_docs_updated_at
  BEFORE UPDATE ON public.docs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FTS via IMMUTABLE wrapper (same pattern as 20260804180000_fts_search.sql).
CREATE OR REPLACE FUNCTION public.fts_docs_expr(_title text, _body text)
RETURNS tsvector LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT
    setweight(to_tsvector('simple', coalesce(_title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(regexp_replace(_body, '<[^>]*>', ' ', 'g'), '')), 'B')
$$;

ALTER TABLE public.docs
  ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (public.fts_docs_expr(title, body)) STORED;

CREATE INDEX IF NOT EXISTS idx_docs_fts ON public.docs USING gin(fts);

-- RLS: workspace members read/write.
ALTER TABLE public.docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "docs readable by workspace members"     ON public.docs;
DROP POLICY IF EXISTS "docs insertable by workspace members"   ON public.docs;
DROP POLICY IF EXISTS "docs updatable by workspace members"    ON public.docs;
DROP POLICY IF EXISTS "docs deletable by workspace members"    ON public.docs;

CREATE POLICY "docs readable by workspace members"
  ON public.docs FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "docs insertable by workspace members"
  ON public.docs FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "docs updatable by workspace members"
  ON public.docs FOR UPDATE
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "docs deletable by workspace members"
  ON public.docs FOR DELETE
  USING (public.is_workspace_member(workspace_id, auth.uid()));
