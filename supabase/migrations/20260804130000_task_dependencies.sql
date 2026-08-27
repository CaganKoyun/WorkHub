-- Task dependencies (blocked_by / blocks).
-- A row (blocking_task_id, blocked_task_id) means blocking_task_id must be done
-- before blocked_task_id can start.

CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  blocking_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  blocked_task_id  UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT task_dependencies_no_self CHECK (blocking_task_id <> blocked_task_id),
  CONSTRAINT task_dependencies_uniq UNIQUE (blocking_task_id, blocked_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_blocked
  ON public.task_dependencies(blocked_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_blocking
  ON public.task_dependencies(blocking_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_workspace
  ON public.task_dependencies(workspace_id);

ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

-- Workspace members can read + write dependencies inside their workspace.
DROP POLICY IF EXISTS "task_dependencies workspace read" ON public.task_dependencies;
CREATE POLICY "task_dependencies workspace read"
  ON public.task_dependencies FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS "task_dependencies workspace write" ON public.task_dependencies;
CREATE POLICY "task_dependencies workspace write"
  ON public.task_dependencies FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = blocking_task_id AND t.workspace_id = task_dependencies.workspace_id
    )
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = blocked_task_id AND t.workspace_id = task_dependencies.workspace_id
    )
  );

DROP POLICY IF EXISTS "task_dependencies workspace delete" ON public.task_dependencies;
CREATE POLICY "task_dependencies workspace delete"
  ON public.task_dependencies FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

GRANT SELECT, INSERT, DELETE ON public.task_dependencies TO authenticated;
GRANT ALL ON public.task_dependencies TO service_role;
