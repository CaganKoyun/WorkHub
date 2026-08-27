-- Cycles (a.k.a. Sprints). Linear-style time-boxed work chunks that group
-- tasks. Independent of projects — a cycle usually lives at the team level
-- and pulls tasks from many projects.

-- 1) Status enum
DO $$ BEGIN
  CREATE TYPE public.cycle_status AS ENUM ('planned','active','completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Table
CREATE TABLE IF NOT EXISTS public.cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL DEFAULT public.current_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  number INT NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status public.cycle_status NOT NULL DEFAULT 'planned',
  goal TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cycles_dates_ok CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_cycles_workspace ON public.cycles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cycles_team ON public.cycles(team_id);
CREATE INDEX IF NOT EXISTS idx_cycles_status ON public.cycles(status);

ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cycles_ws_select ON public.cycles;
CREATE POLICY cycles_ws_select ON public.cycles FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
DROP POLICY IF EXISTS cycles_ws_insert ON public.cycles;
CREATE POLICY cycles_ws_insert ON public.cycles FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
DROP POLICY IF EXISTS cycles_ws_update ON public.cycles;
CREATE POLICY cycles_ws_update ON public.cycles FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
DROP POLICY IF EXISTS cycles_ws_delete ON public.cycles;
CREATE POLICY cycles_ws_delete ON public.cycles FOR DELETE TO authenticated
  USING (public.is_workspace_admin(workspace_id, auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cycles TO authenticated;
GRANT ALL ON public.cycles TO service_role;

DROP TRIGGER IF EXISTS cycles_touch ON public.cycles;
CREATE TRIGGER cycles_touch BEFORE UPDATE ON public.cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Extend tasks with cycle + story points
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES public.cycles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS story_points NUMERIC(5,1);

CREATE INDEX IF NOT EXISTS idx_tasks_cycle ON public.tasks(cycle_id);

-- 4) Extend task_status enum with 'backlog' (Linear pattern)
DO $$ BEGIN
  ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'backlog' BEFORE 'todo';
EXCEPTION WHEN others THEN NULL;
END $$;

-- 5) Helper: cycle progress (done / total counts)
CREATE OR REPLACE FUNCTION public.cycle_progress(_cycle_id UUID)
RETURNS TABLE (
  total_tasks INT,
  done_tasks INT,
  total_points NUMERIC,
  done_points NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    COUNT(*)::int AS total_tasks,
    COUNT(*) FILTER (WHERE status = 'done')::int AS done_tasks,
    COALESCE(SUM(story_points), 0) AS total_points,
    COALESCE(SUM(story_points) FILTER (WHERE status = 'done'), 0) AS done_points
  FROM public.tasks
  WHERE cycle_id = _cycle_id;
$$;

GRANT EXECUTE ON FUNCTION public.cycle_progress(UUID) TO authenticated;
