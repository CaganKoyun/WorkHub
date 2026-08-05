-- Agent runs: her direktif için 1 satır. Plan (adım listesi) + adım
-- başına sonuç JSONB'de tutulur. Bu tablo audit-trail görevi görür —
-- LLM planner ekleyince başka değişiklik gerekmez.

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  prompt        text        NOT NULL,
  -- plan: [{ tool, params, description }]
  plan          jsonb       NOT NULL DEFAULT '[]'::jsonb,
  -- results: [{ step_index, ok, detail?, error? }]
  results       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  status        text        NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'running', 'succeeded', 'partial', 'failed', 'canceled')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  started_at    timestamptz,
  finished_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_ws_time
  ON public.agent_runs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_user
  ON public.agent_runs(user_id, created_at DESC);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_runs readable by workspace members"    ON public.agent_runs;
DROP POLICY IF EXISTS "agent_runs insertable by owner"              ON public.agent_runs;
DROP POLICY IF EXISTS "agent_runs updatable by owner"               ON public.agent_runs;
DROP POLICY IF EXISTS "agent_runs deletable by owner or admin"      ON public.agent_runs;

CREATE POLICY "agent_runs readable by workspace members"
  ON public.agent_runs FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "agent_runs insertable by owner"
  ON public.agent_runs FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND user_id = auth.uid());
CREATE POLICY "agent_runs updatable by owner"
  ON public.agent_runs FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "agent_runs deletable by owner or admin"
  ON public.agent_runs FOR DELETE
  USING (user_id = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid()));
