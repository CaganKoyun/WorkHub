-- Task + Project templates. Both store the entire body as JSONB so the
-- template shape can evolve without another migration; the hydration into a
-- real task/project happens client-side.

CREATE TABLE IF NOT EXISTS public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL DEFAULT public.current_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  body JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_templates_ws ON public.task_templates(workspace_id);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_templates_ws_select ON public.task_templates;
CREATE POLICY task_templates_ws_select ON public.task_templates FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
DROP POLICY IF EXISTS task_templates_ws_insert ON public.task_templates;
CREATE POLICY task_templates_ws_insert ON public.task_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
DROP POLICY IF EXISTS task_templates_ws_update ON public.task_templates;
CREATE POLICY task_templates_ws_update ON public.task_templates FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
DROP POLICY IF EXISTS task_templates_ws_delete ON public.task_templates;
CREATE POLICY task_templates_ws_delete ON public.task_templates FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_templates TO authenticated;
GRANT ALL ON public.task_templates TO service_role;

DROP TRIGGER IF EXISTS task_templates_touch ON public.task_templates;
CREATE TRIGGER task_templates_touch BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL DEFAULT public.current_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  body JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_templates_ws ON public.project_templates(workspace_id);

ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_templates_ws_select ON public.project_templates;
CREATE POLICY project_templates_ws_select ON public.project_templates FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
DROP POLICY IF EXISTS project_templates_ws_insert ON public.project_templates;
CREATE POLICY project_templates_ws_insert ON public.project_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
DROP POLICY IF EXISTS project_templates_ws_update ON public.project_templates;
CREATE POLICY project_templates_ws_update ON public.project_templates FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
DROP POLICY IF EXISTS project_templates_ws_delete ON public.project_templates;
CREATE POLICY project_templates_ws_delete ON public.project_templates FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_templates TO authenticated;
GRANT ALL ON public.project_templates TO service_role;

DROP TRIGGER IF EXISTS project_templates_touch ON public.project_templates;
CREATE TRIGGER project_templates_touch BEFORE UPDATE ON public.project_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
