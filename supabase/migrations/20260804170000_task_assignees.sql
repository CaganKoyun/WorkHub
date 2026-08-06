-- Multiple assignees per task. `tasks.assignee_id` stays as the primary
-- assignee (backwards compat for existing hooks/policies); this table adds
-- the rest.

CREATE TABLE IF NOT EXISTS public.task_assignees (
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON public.task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_workspace ON public.task_assignees(workspace_id);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_assignees_read ON public.task_assignees;
CREATE POLICY task_assignees_read ON public.task_assignees FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS task_assignees_write ON public.task_assignees;
CREATE POLICY task_assignees_write ON public.task_assignees FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.workspace_id = task_assignees.workspace_id)
  );

DROP POLICY IF EXISTS task_assignees_delete ON public.task_assignees;
CREATE POLICY task_assignees_delete ON public.task_assignees FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

GRANT SELECT, INSERT, DELETE ON public.task_assignees TO authenticated;
GRANT ALL ON public.task_assignees TO service_role;

-- Backfill: existing single-assignee rows also live as a task_assignees entry
-- so multi-assignee UIs see them consistently.
INSERT INTO public.task_assignees (task_id, user_id, workspace_id)
SELECT id, assignee_id, workspace_id
  FROM public.tasks
 WHERE assignee_id IS NOT NULL
ON CONFLICT DO NOTHING;
