-- Time tracking. One row per session-of-work on a task.
-- Rules:
--   - started_at is required; ended_at nullable (running timer).
--   - duration_seconds is a generated column so the client never has to
--     compute it and reports can group/sum it cheaply.
--   - Only one active (ended_at IS NULL) timer per user is allowed at once;
--     enforced with a partial UNIQUE index.
--   - RLS: read own + workspace members read visibility of shared rows.

CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL DEFAULT public.current_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at   TIMESTAMPTZ,
  note TEXT,
  billable BOOLEAN NOT NULL DEFAULT true,
  duration_seconds INT
    GENERATED ALWAYS AS (
      CASE
        WHEN ended_at IS NULL THEN NULL
        ELSE GREATEST(0, EXTRACT(EPOCH FROM (ended_at - started_at))::int)
      END
    ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT time_entries_range CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE INDEX IF NOT EXISTS idx_time_entries_task ON public.time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON public.time_entries(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_ws ON public.time_entries(workspace_id);
-- Only one active timer per user
CREATE UNIQUE INDEX IF NOT EXISTS uidx_time_entries_active
  ON public.time_entries(user_id) WHERE ended_at IS NULL;

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS time_entries_read ON public.time_entries;
CREATE POLICY time_entries_read ON public.time_entries FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

DROP POLICY IF EXISTS time_entries_insert ON public.time_entries;
CREATE POLICY time_entries_insert ON public.time_entries FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.is_workspace_member(workspace_id, auth.uid())
  );

-- Only the owner can update/delete their entries.
DROP POLICY IF EXISTS time_entries_update_own ON public.time_entries;
CREATE POLICY time_entries_update_own ON public.time_entries FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS time_entries_delete_own ON public.time_entries;
CREATE POLICY time_entries_delete_own ON public.time_entries FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;

-- Rollup: sum of finished seconds per task, per user. Useful for the timer
-- widget to show "You have 4h logged on this task".
CREATE OR REPLACE FUNCTION public.time_task_totals(_task_id UUID)
RETURNS TABLE (user_id UUID, total_seconds BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT user_id, COALESCE(SUM(duration_seconds), 0)::bigint
    FROM public.time_entries
   WHERE task_id = _task_id AND ended_at IS NOT NULL
   GROUP BY user_id;
$$;

GRANT EXECUTE ON FUNCTION public.time_task_totals(UUID) TO authenticated;
