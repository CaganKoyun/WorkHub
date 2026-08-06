-- Client portal: token'lı public erişim. Bir portal = bir dış paydaş için
-- (email + isim) belirli projelere read-only pencere; opsiyonel guest yorum.

CREATE TABLE IF NOT EXISTS public.client_portals (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name           text        NOT NULL,
  client_email   text        NOT NULL,
  token          text        NOT NULL UNIQUE,
  project_ids    uuid[]      NOT NULL DEFAULT '{}'::uuid[],
  can_comment    boolean     NOT NULL DEFAULT true,
  expires_at     timestamptz,
  revoked_at     timestamptz,
  created_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_portals_workspace ON public.client_portals(workspace_id);

DROP TRIGGER IF EXISTS trg_client_portals_updated_at ON public.client_portals;
CREATE TRIGGER trg_client_portals_updated_at
  BEFORE UPDATE ON public.client_portals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Guest yorumlar internal task_comments'ten ayrı tutulur — attribution ile
-- karışmasın, ayrı silme/moderasyon.
CREATE TABLE IF NOT EXISTS public.client_portal_comments (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id      uuid        NOT NULL REFERENCES public.client_portals(id) ON DELETE CASCADE,
  workspace_id   uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  task_id        uuid        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  guest_email    text        NOT NULL,
  guest_name     text,
  body           text        NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_portal_comments_task
  ON public.client_portal_comments(task_id, created_at);

ALTER TABLE public.client_portals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_portal_comments  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_portals readable by workspace members"   ON public.client_portals;
DROP POLICY IF EXISTS "client_portals writable by workspace admins"    ON public.client_portals;
DROP POLICY IF EXISTS "client_portals updatable by workspace admins"   ON public.client_portals;
DROP POLICY IF EXISTS "client_portals deletable by workspace admins"   ON public.client_portals;
DROP POLICY IF EXISTS "client_portal_comments readable by workspace members" ON public.client_portal_comments;
DROP POLICY IF EXISTS "client_portal_comments deletable by admins"     ON public.client_portal_comments;

CREATE POLICY "client_portals readable by workspace members"
  ON public.client_portals FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "client_portals writable by workspace admins"
  ON public.client_portals FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));
CREATE POLICY "client_portals updatable by workspace admins"
  ON public.client_portals FOR UPDATE
  USING (public.is_workspace_admin(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));
CREATE POLICY "client_portals deletable by workspace admins"
  ON public.client_portals FOR DELETE
  USING (public.is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "client_portal_comments readable by workspace members"
  ON public.client_portal_comments FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "client_portal_comments deletable by admins"
  ON public.client_portal_comments FOR DELETE
  USING (public.is_workspace_admin(workspace_id, auth.uid()));
-- Insert yalnızca RPC üzerinden — anon direkt INSERT edemez.

-- ---------------------------------------------------------------------------
-- Public RPC'ler — anon çağrılabilir. Portal token'ı doğrulayarak veri döner.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.portal_get(_token text)
RETURNS TABLE (
  id uuid,
  name text,
  client_email text,
  project_ids uuid[],
  can_comment boolean,
  workspace_id uuid
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, client_email, project_ids, can_comment, workspace_id
  FROM public.client_portals
  WHERE token = _token
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());
$$;

CREATE OR REPLACE FUNCTION public.portal_projects(_token text)
RETURNS TABLE (
  id uuid,
  name text,
  status text,
  description text
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.status::text, p.description
  FROM public.projects p
  JOIN public.client_portals cp
    ON cp.token = _token
   AND cp.revoked_at IS NULL
   AND (cp.expires_at IS NULL OR cp.expires_at > now())
   AND p.id = ANY(cp.project_ids);
$$;

CREATE OR REPLACE FUNCTION public.portal_tasks(_token text, _project_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  tracking_id text,
  title text,
  description text,
  status text,
  priority text,
  due_date date,
  project_id uuid,
  project_name text
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.tracking_id, t.title, t.description, t.status::text, t.priority::text,
         t.due_date, t.project_id, p.name AS project_name
  FROM public.tasks t
  JOIN public.projects p ON p.id = t.project_id
  JOIN public.client_portals cp
    ON cp.token = _token
   AND cp.revoked_at IS NULL
   AND (cp.expires_at IS NULL OR cp.expires_at > now())
   AND t.project_id = ANY(cp.project_ids)
  WHERE (_project_id IS NULL OR t.project_id = _project_id)
  ORDER BY t.created_at DESC
  LIMIT 200;
$$;

CREATE OR REPLACE FUNCTION public.portal_task_comments(_token text, _task_id uuid)
RETURNS TABLE (
  id uuid,
  guest_email text,
  guest_name text,
  body text,
  created_at timestamptz
) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.guest_email, c.guest_name, c.body, c.created_at
  FROM public.client_portal_comments c
  JOIN public.client_portals cp
    ON cp.token = _token
   AND cp.revoked_at IS NULL
   AND (cp.expires_at IS NULL OR cp.expires_at > now())
   AND c.portal_id = cp.id
   AND c.task_id = _task_id
   AND EXISTS (SELECT 1 FROM public.tasks t
               WHERE t.id = _task_id AND t.project_id = ANY(cp.project_ids))
  ORDER BY c.created_at;
$$;

CREATE OR REPLACE FUNCTION public.portal_post_comment(
  _token text,
  _task_id uuid,
  _body text,
  _guest_name text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cp public.client_portals%ROWTYPE;
  _task_project uuid;
  _new_id uuid;
BEGIN
  IF coalesce(length(trim(_body)), 0) = 0 THEN RAISE EXCEPTION 'body required'; END IF;

  SELECT * INTO _cp FROM public.client_portals
  WHERE token = _token AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now());
  IF NOT FOUND THEN RAISE EXCEPTION 'portal not found or expired'; END IF;
  IF NOT _cp.can_comment THEN RAISE EXCEPTION 'comments disabled for this portal'; END IF;

  SELECT project_id INTO _task_project FROM public.tasks WHERE id = _task_id;
  IF _task_project IS NULL OR NOT (_task_project = ANY(_cp.project_ids)) THEN
    RAISE EXCEPTION 'task not accessible from this portal';
  END IF;

  INSERT INTO public.client_portal_comments
    (portal_id, workspace_id, task_id, guest_email, guest_name, body)
  VALUES (_cp.id, _cp.workspace_id, _task_id, _cp.client_email, _guest_name, trim(_body))
  RETURNING id INTO _new_id;
  RETURN _new_id;
END;
$$;
