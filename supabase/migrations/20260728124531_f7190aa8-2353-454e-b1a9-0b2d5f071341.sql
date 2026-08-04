
CREATE TABLE public.legal_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  legal_name text,
  country text,
  currency text DEFAULT 'USD',
  tax_id text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  description text,
  head_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  color text DEFAULT '#6366f1',
  icon text DEFAULT '🏢',
  position integer NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  lead_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  color text DEFAULT '#10b981',
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.job_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  name text NOT NULL,
  level text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

CREATE TABLE public.business_functions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, key)
);

CREATE TABLE public.module_ownership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module text NOT NULL,
  owner_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  system_admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, module)
);

CREATE TABLE public.permission_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  permission_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

CREATE TABLE public.user_permission_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_set_id uuid NOT NULL REFERENCES public.permission_sets(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE(workspace_id, user_id, permission_set_id)
);

ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_title_id uuid REFERENCES public.job_titles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS legal_entity_id uuid REFERENCES public.legal_entities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cost_center text,
  ADD COLUMN IF NOT EXISTS approval_limit numeric,
  ADD COLUMN IF NOT EXISTS approval_currency text DEFAULT 'USD';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_entities TO authenticated;
GRANT ALL ON public.legal_entities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_titles TO authenticated;
GRANT ALL ON public.job_titles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_functions TO authenticated;
GRANT ALL ON public.business_functions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_ownership TO authenticated;
GRANT ALL ON public.module_ownership TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permission_sets TO authenticated;
GRANT ALL ON public.permission_sets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permission_sets TO authenticated;
GRANT ALL ON public.user_permission_sets TO service_role;

ALTER TABLE public.legal_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_sets ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'legal_entities','departments','teams','job_titles',
    'business_functions','module_ownership','permission_sets','user_permission_sets'
  ]) LOOP
    EXECUTE format($f$
      CREATE POLICY "%1$s_ws_all" ON public.%1$s FOR ALL TO authenticated
        USING (public.is_workspace_member(workspace_id, auth.uid()))
        WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
    $f$, t);
  END LOOP;
END $$;

CREATE TRIGGER update_legal_entities_updated_at BEFORE UPDATE ON public.legal_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_job_titles_updated_at BEFORE UPDATE ON public.job_titles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_module_ownership_updated_at BEFORE UPDATE ON public.module_ownership
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_permission_sets_updated_at BEFORE UPDATE ON public.permission_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_departments_workspace ON public.departments(workspace_id);
CREATE INDEX idx_departments_parent ON public.departments(parent_id);
CREATE INDEX idx_teams_workspace ON public.teams(workspace_id);
CREATE INDEX idx_teams_department ON public.teams(department_id);
CREATE INDEX idx_job_titles_workspace ON public.job_titles(workspace_id);
CREATE INDEX idx_module_ownership_workspace ON public.module_ownership(workspace_id);
CREATE INDEX idx_permission_sets_workspace ON public.permission_sets(workspace_id);
CREATE INDEX idx_user_permission_sets_user ON public.user_permission_sets(workspace_id, user_id);
CREATE INDEX idx_workspace_members_department ON public.workspace_members(department_id);
CREATE INDEX idx_workspace_members_team ON public.workspace_members(team_id);
