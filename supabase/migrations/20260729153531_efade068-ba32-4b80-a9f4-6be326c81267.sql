
CREATE TABLE IF NOT EXISTS public.project_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.current_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_messages TO authenticated;
GRANT ALL ON public.project_messages TO service_role;
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm ws select" ON public.project_messages FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "pm ws insert" ON public.project_messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "pm ws update" ON public.project_messages FOR UPDATE TO authenticated
  USING (author_id = auth.uid());
CREATE POLICY "pm ws delete" ON public.project_messages FOR DELETE TO authenticated
  USING (author_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_pm_project ON public.project_messages(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL DEFAULT public.current_workspace_id() REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  source text NOT NULL DEFAULT 'upload',
  external_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_files TO authenticated;
GRANT ALL ON public.project_files TO service_role;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pf ws select" ON public.project_files FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "pf ws insert" ON public.project_files FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "pf ws delete" ON public.project_files FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());
CREATE INDEX IF NOT EXISTS idx_pf_project ON public.project_files(project_id, created_at DESC);
