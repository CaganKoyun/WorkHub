-- Portfolios / Programs: group projects for rollup reporting.

CREATE TABLE IF NOT EXISTS public.portfolios (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  description   text,
  color         text        NOT NULL DEFAULT '#5E6AD2',
  owner_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  archived_at   timestamptz,
  created_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolios_workspace ON public.portfolios(workspace_id);

DROP TRIGGER IF EXISTS trg_portfolios_updated_at ON public.portfolios;
CREATE TRIGGER trg_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.portfolio_projects (
  portfolio_id  uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES public.projects(id)   ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (portfolio_id, project_id)
);
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_project
  ON public.portfolio_projects(project_id);

ALTER TABLE public.portfolios          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_projects  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portfolios readable by workspace members"   ON public.portfolios;
DROP POLICY IF EXISTS "portfolios writable by workspace members"   ON public.portfolios;
DROP POLICY IF EXISTS "portfolios updatable by workspace members"  ON public.portfolios;
DROP POLICY IF EXISTS "portfolios deletable by workspace admins"   ON public.portfolios;
DROP POLICY IF EXISTS "portfolio_projects readable by workspace members" ON public.portfolio_projects;
DROP POLICY IF EXISTS "portfolio_projects writable by workspace members" ON public.portfolio_projects;
DROP POLICY IF EXISTS "portfolio_projects deletable by workspace members" ON public.portfolio_projects;

CREATE POLICY "portfolios readable by workspace members"
  ON public.portfolios FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "portfolios writable by workspace members"
  ON public.portfolios FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "portfolios updatable by workspace members"
  ON public.portfolios FOR UPDATE
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "portfolios deletable by workspace admins"
  ON public.portfolios FOR DELETE
  USING (public.is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "portfolio_projects readable by workspace members"
  ON public.portfolio_projects FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.portfolios p
                 WHERE p.id = portfolio_id
                   AND public.is_workspace_member(p.workspace_id, auth.uid())));
CREATE POLICY "portfolio_projects writable by workspace members"
  ON public.portfolio_projects FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.portfolios p
                      WHERE p.id = portfolio_id
                        AND public.is_workspace_member(p.workspace_id, auth.uid())));
CREATE POLICY "portfolio_projects deletable by workspace members"
  ON public.portfolio_projects FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.portfolios p
                 WHERE p.id = portfolio_id
                   AND public.is_workspace_member(p.workspace_id, auth.uid())));

-- Rollup: for a given portfolio, aggregate task counts + completion across
-- all its member projects. SECURITY DEFINER so a single call replaces N
-- client-side fetches; RLS on the portfolio row is checked first.
CREATE OR REPLACE FUNCTION public.portfolio_rollup(_portfolio_id uuid)
RETURNS TABLE (
  project_id       uuid,
  project_name     text,
  project_status   text,
  total_tasks      bigint,
  done_tasks       bigint,
  active_tasks     bigint,
  overdue_tasks    bigint,
  completion_pct   numeric
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH allowed AS (
    SELECT p.id FROM public.portfolios p
    WHERE p.id = _portfolio_id
      AND public.is_workspace_member(p.workspace_id, auth.uid())
  )
  SELECT
    pr.id                                                                  AS project_id,
    pr.name                                                                AS project_name,
    pr.status::text                                                        AS project_status,
    count(t.id)                                                            AS total_tasks,
    count(t.id) FILTER (WHERE t.status = 'done')                           AS done_tasks,
    count(t.id) FILTER (WHERE t.status IN ('todo','in_progress','review')) AS active_tasks,
    count(t.id) FILTER (WHERE t.status <> 'done' AND t.due_date IS NOT NULL AND t.due_date < now()) AS overdue_tasks,
    CASE WHEN count(t.id) > 0
         THEN round(100.0 * count(t.id) FILTER (WHERE t.status = 'done') / count(t.id), 1)
         ELSE 0 END                                                        AS completion_pct
  FROM public.portfolio_projects pp
  JOIN allowed a           ON a.id = pp.portfolio_id
  JOIN public.projects pr  ON pr.id = pp.project_id
  LEFT JOIN public.tasks t ON t.project_id = pr.id
  WHERE pp.portfolio_id = _portfolio_id
  GROUP BY pr.id, pr.name, pr.status
  ORDER BY pr.name;
$$;
