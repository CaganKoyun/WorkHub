-- Custom workflow states per workspace (and optionally per team). Every
-- workspace gets seeded with 5 defaults that mirror the built-in task_status
-- enum, so existing UI keeps working — customizations layer on top.
--
-- A task keeps its enum status (backwards compat with kanban columns and
-- policies) AND may point at a workflow_states row via workflow_state_id.
-- UIs that know about it show the custom name; others still render by the
-- enum.

-- 1) Category enum (Linear's five-way classification)
DO $$ BEGIN
  CREATE TYPE public.workflow_state_category AS ENUM (
    'backlog','unstarted','started','completed','canceled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2) Table
CREATE TABLE IF NOT EXISTS public.workflow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL DEFAULT public.current_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  category public.workflow_state_category NOT NULL,
  color TEXT NOT NULL DEFAULT '#8a8f98',
  position INT NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, team_id, key)
);

CREATE INDEX IF NOT EXISTS idx_workflow_states_ws ON public.workflow_states(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_states_team ON public.workflow_states(team_id);
CREATE INDEX IF NOT EXISTS idx_workflow_states_position ON public.workflow_states(workspace_id, position);

ALTER TABLE public.workflow_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflow_states_ws_select ON public.workflow_states;
CREATE POLICY workflow_states_ws_select ON public.workflow_states FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
DROP POLICY IF EXISTS workflow_states_ws_write ON public.workflow_states;
CREATE POLICY workflow_states_ws_write ON public.workflow_states FOR ALL TO authenticated
  USING (public.is_workspace_admin(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_states TO authenticated;
GRANT ALL ON public.workflow_states TO service_role;

DROP TRIGGER IF EXISTS workflow_states_touch ON public.workflow_states;
CREATE TRIGGER workflow_states_touch BEFORE UPDATE ON public.workflow_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Seed function — mirrors the built-in task_status enum so nothing
-- changes visually for existing tasks.
CREATE OR REPLACE FUNCTION public.seed_default_workflow_states(_workspace_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.workflow_states (workspace_id, key, name, category, color, position, is_default) VALUES
    (_workspace_id, 'backlog',     'Backlog',     'backlog',    '#8a8f98', 1, true),
    (_workspace_id, 'todo',        'Todo',        'unstarted',  '#a1a1aa', 2, true),
    (_workspace_id, 'in_progress', 'In Progress', 'started',    '#f5a524', 3, true),
    (_workspace_id, 'review',      'In Review',   'started',    '#8b5cf6', 4, true),
    (_workspace_id, 'done',        'Done',        'completed',  '#5e6ad2', 5, true),
    (_workspace_id, 'canceled',    'Canceled',    'canceled',   '#71717a', 6, true)
  ON CONFLICT (workspace_id, team_id, key) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_workflow_states(UUID) TO authenticated;

-- 4) Backfill existing workspaces
DO $$
DECLARE ws RECORD;
BEGIN
  FOR ws IN SELECT id FROM public.workspaces LOOP
    PERFORM public.seed_default_workflow_states(ws.id);
  END LOOP;
END $$;

-- 5) Auto-seed on new workspace
CREATE OR REPLACE FUNCTION public.workspaces_seed_workflow_states()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_workflow_states(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workspaces_seed_workflow_states ON public.workspaces;
CREATE TRIGGER workspaces_seed_workflow_states
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.workspaces_seed_workflow_states();

-- 6) tasks.workflow_state_id (opt-in override for the enum status)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS workflow_state_id UUID REFERENCES public.workflow_states(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_workflow_state ON public.tasks(workflow_state_id);
