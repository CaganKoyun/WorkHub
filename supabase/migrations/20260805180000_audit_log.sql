-- Audit log: append-only event trail per workspace. Populated by triggers on
-- high-value tables and callable directly via public.log_audit RPC.
--
-- Rows are never mutated after insert — an admin can DELETE for GDPR-style
-- erasure but there is no UPDATE policy. `before`/`after` are compact
-- snapshots (nulls trimmed) so table stays skinny.

CREATE TABLE IF NOT EXISTS public.audit_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  actor_id        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action          text        NOT NULL,                  -- eg 'task.created', 'project.updated', 'automation.deleted'
  entity_type     text        NOT NULL,
  entity_id       uuid,
  entity_label    text,                                  -- short display name for the row
  changed_keys    text[]      NOT NULL DEFAULT '{}',     -- fields that actually changed on updates
  before          jsonb,
  after           jsonb,
  metadata        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_ws_time
  ON public.audit_log(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON public.audit_log(entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON public.audit_log(actor_id, created_at DESC) WHERE actor_id IS NOT NULL;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log readable by workspace admins"     ON public.audit_log;
DROP POLICY IF EXISTS "audit_log deletable by workspace admins"    ON public.audit_log;
-- Note: no INSERT / UPDATE policies — only SECURITY DEFINER helpers below
-- can write, and no path can modify.

CREATE POLICY "audit_log readable by workspace admins"
  ON public.audit_log FOR SELECT
  USING (public.is_workspace_admin(workspace_id, auth.uid()));
CREATE POLICY "audit_log deletable by workspace admins"
  ON public.audit_log FOR DELETE
  USING (public.is_workspace_admin(workspace_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Which top-level keys actually differ between two jsonb objects.
CREATE OR REPLACE FUNCTION public.jsonb_changed_keys(_old jsonb, _new jsonb)
RETURNS text[] LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT coalesce(array_agg(k ORDER BY k), '{}'::text[])
  FROM (
    SELECT k FROM jsonb_object_keys(coalesce(_old, '{}'::jsonb)) k
    UNION
    SELECT k FROM jsonb_object_keys(coalesce(_new, '{}'::jsonb)) k
  ) u
  WHERE (_old -> k) IS DISTINCT FROM (_new -> k)
$$;

-- Application-callable RPC — always usable regardless of trigger coverage.
CREATE OR REPLACE FUNCTION public.log_audit(
  _workspace_id uuid,
  _action text,
  _entity_type text,
  _entity_id uuid DEFAULT NULL,
  _entity_label text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _id uuid;
BEGIN
  IF NOT public.is_workspace_member(_workspace_id, auth.uid()) THEN
    RAISE EXCEPTION 'not a workspace member';
  END IF;
  INSERT INTO public.audit_log (workspace_id, actor_id, action, entity_type, entity_id, entity_label, metadata)
  VALUES (_workspace_id, auth.uid(), _action, _entity_type, _entity_id, _entity_label, coalesce(_metadata, '{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Auto-triggers on high-value tables
-- ---------------------------------------------------------------------------

-- tasks: INSERT / UPDATE (status, priority, assignee, title, due) / DELETE.
-- tasks doesn't carry workspace_id directly, so resolve via project.
CREATE OR REPLACE FUNCTION public.audit_tasks_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ws uuid;
  _b jsonb;
  _a jsonb;
  _keys text[];
BEGIN
  SELECT workspace_id INTO _ws FROM public.projects
  WHERE id = coalesce(NEW.project_id, OLD.project_id);
  IF _ws IS NULL THEN RETURN coalesce(NEW, OLD); END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (workspace_id, actor_id, action, entity_type, entity_id, entity_label, after)
    VALUES (_ws, auth.uid(), 'task.created', 'task', NEW.id, NEW.title,
            jsonb_build_object('status', NEW.status, 'priority', NEW.priority, 'assignee_id', NEW.assignee_id));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    _b := jsonb_build_object('status', OLD.status, 'priority', OLD.priority, 'assignee_id', OLD.assignee_id, 'title', OLD.title, 'due_date', OLD.due_date);
    _a := jsonb_build_object('status', NEW.status, 'priority', NEW.priority, 'assignee_id', NEW.assignee_id, 'title', NEW.title, 'due_date', NEW.due_date);
    _keys := public.jsonb_changed_keys(_b, _a);
    IF array_length(_keys, 1) IS NULL THEN RETURN NEW; END IF;
    INSERT INTO public.audit_log (workspace_id, actor_id, action, entity_type, entity_id, entity_label, changed_keys, before, after)
    VALUES (_ws, auth.uid(), 'task.updated', 'task', NEW.id, NEW.title, _keys, _b, _a);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (workspace_id, actor_id, action, entity_type, entity_id, entity_label, before)
    VALUES (_ws, auth.uid(), 'task.deleted', 'task', OLD.id, OLD.title,
            jsonb_build_object('status', OLD.status, 'priority', OLD.priority));
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_tasks ON public.tasks;
CREATE TRIGGER trg_audit_tasks
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.audit_tasks_change();

-- projects
CREATE OR REPLACE FUNCTION public.audit_projects_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (workspace_id, actor_id, action, entity_type, entity_id, entity_label)
    VALUES (NEW.workspace_id, auth.uid(), 'project.created', 'project', NEW.id, NEW.name);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_log (workspace_id, actor_id, action, entity_type, entity_id, entity_label, changed_keys, before, after)
    VALUES (NEW.workspace_id, auth.uid(), 'project.status_changed', 'project', NEW.id, NEW.name,
            ARRAY['status'], jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (workspace_id, actor_id, action, entity_type, entity_id, entity_label)
    VALUES (OLD.workspace_id, auth.uid(), 'project.deleted', 'project', OLD.id, OLD.name);
  END IF;
  RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_projects ON public.projects;
CREATE TRIGGER trg_audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.audit_projects_change();

-- automations
CREATE OR REPLACE FUNCTION public.audit_automations_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (workspace_id, actor_id, action, entity_type, entity_id, entity_label)
    VALUES (NEW.workspace_id, auth.uid(), 'automation.created', 'automation', NEW.id, NEW.name);
  ELSIF TG_OP = 'UPDATE' AND OLD.enabled IS DISTINCT FROM NEW.enabled THEN
    INSERT INTO public.audit_log (workspace_id, actor_id, action, entity_type, entity_id, entity_label, changed_keys, before, after)
    VALUES (NEW.workspace_id, auth.uid(),
            CASE WHEN NEW.enabled THEN 'automation.enabled' ELSE 'automation.disabled' END,
            'automation', NEW.id, NEW.name,
            ARRAY['enabled'], jsonb_build_object('enabled', OLD.enabled), jsonb_build_object('enabled', NEW.enabled));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (workspace_id, actor_id, action, entity_type, entity_id, entity_label)
    VALUES (OLD.workspace_id, auth.uid(), 'automation.deleted', 'automation', OLD.id, OLD.name);
  END IF;
  RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_automations ON public.automations;
CREATE TRIGGER trg_audit_automations
  AFTER INSERT OR UPDATE OR DELETE ON public.automations
  FOR EACH ROW EXECUTE FUNCTION public.audit_automations_change();

-- custom_field_defs
CREATE OR REPLACE FUNCTION public.audit_custom_field_defs_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (workspace_id, actor_id, action, entity_type, entity_id, entity_label, metadata)
    VALUES (NEW.workspace_id, auth.uid(), 'custom_field.created', 'custom_field', NEW.id, NEW.name,
            jsonb_build_object('entity_type', NEW.entity_type, 'kind', NEW.kind));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (workspace_id, actor_id, action, entity_type, entity_id, entity_label)
    VALUES (OLD.workspace_id, auth.uid(), 'custom_field.deleted', 'custom_field', OLD.id, OLD.name);
  END IF;
  RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_custom_field_defs ON public.custom_field_defs;
CREATE TRIGGER trg_audit_custom_field_defs
  AFTER INSERT OR DELETE ON public.custom_field_defs
  FOR EACH ROW EXECUTE FUNCTION public.audit_custom_field_defs_change();

-- Faceted query RPC: returns a page of audit rows with optional filters.
CREATE OR REPLACE FUNCTION public.audit_log_page(
  _workspace_id uuid,
  _entity_type text DEFAULT NULL,
  _actor_id uuid DEFAULT NULL,
  _action_prefix text DEFAULT NULL,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0
) RETURNS SETOF public.audit_log
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.audit_log
  WHERE workspace_id = _workspace_id
    AND public.is_workspace_admin(_workspace_id, auth.uid())
    AND (_entity_type IS NULL OR entity_type = _entity_type)
    AND (_actor_id IS NULL OR actor_id = _actor_id)
    AND (_action_prefix IS NULL OR action LIKE _action_prefix || '%')
  ORDER BY created_at DESC
  LIMIT least(_limit, 200) OFFSET greatest(_offset, 0);
$$;
