-- Public Dashboards: shareable read-only links to company pulse metrics.
-- Token-based access — no auth required for viewers.

CREATE TABLE IF NOT EXISTS public.public_dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Company Dashboard',
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_dashboards_workspace ON public.public_dashboards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_public_dashboards_token ON public.public_dashboards(token);

ALTER TABLE public.public_dashboards ENABLE ROW LEVEL SECURITY;

-- Workspace members can manage dashboards
CREATE POLICY "Members can view public_dashboards" ON public.public_dashboards
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can insert public_dashboards" ON public.public_dashboards
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can update public_dashboards" ON public.public_dashboards
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can delete public_dashboards" ON public.public_dashboards
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Public RPC for anonymous access via token — returns pulse data without auth
CREATE OR REPLACE FUNCTION public.get_public_dashboard(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dash public_dashboards;
  v_result jsonb;
BEGIN
  SELECT * INTO v_dash FROM public_dashboards
    WHERE token = p_token AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF v_dash IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  SELECT jsonb_build_object(
    'title', v_dash.title,
    'workspace_name', w.name,
    'active_projects', (SELECT count(*) FROM projects WHERE workspace_id = v_dash.workspace_id AND status = 'active'),
    'total_projects', (SELECT count(*) FROM projects WHERE workspace_id = v_dash.workspace_id),
    'open_tasks', (SELECT count(*) FROM tasks WHERE workspace_id = v_dash.workspace_id AND status != 'done'),
    'overdue_tasks', (SELECT count(*) FROM tasks WHERE workspace_id = v_dash.workspace_id AND status != 'done' AND due_date < CURRENT_DATE),
    'open_bugs', (SELECT count(*) FROM bugs WHERE workspace_id = v_dash.workspace_id AND status NOT IN ('closed', 'resolved')),
    'critical_bugs', (SELECT count(*) FROM bugs WHERE workspace_id = v_dash.workspace_id AND status NOT IN ('closed', 'resolved') AND severity IN ('critical', 'high')),
    'active_goals', (SELECT count(*) FROM goals WHERE workspace_id = v_dash.workspace_id AND status NOT IN ('archived', 'missed', 'achieved')),
    'on_track_goals', (SELECT count(*) FROM goals WHERE workspace_id = v_dash.workspace_id AND status = 'on_track'),
    'total_employees', (SELECT count(*) FROM employees WHERE workspace_id = v_dash.workspace_id),
    'config', v_dash.config,
    'generated_at', now()
  ) INTO v_result
  FROM workspaces w WHERE w.id = v_dash.workspace_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_dashboard(text) TO anon, authenticated;
