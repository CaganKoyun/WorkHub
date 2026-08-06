-- Automations: trigger→condition→action rules attached to tasks.
-- The definition is JSON so new trigger/action kinds can ship without a migration.
-- The Postgres trigger below fires on task INSERT/UPDATE and evaluates matching rules
-- for the workspace, executing built-in actions (assign, tag, add comment).

CREATE TABLE IF NOT EXISTS public.automations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name          text        NOT NULL,
  description   text,
  enabled       boolean     NOT NULL DEFAULT true,
  -- trigger: { kind: 'task_created' | 'task_status_changed' | 'task_priority_changed' }
  trigger       jsonb       NOT NULL,
  -- conditions: [{ field: 'status'|'priority'|'assignee_id'|'project_id', op: 'eq'|'in'|'neq', value: any }, ...]
  conditions    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  -- actions: [{ kind: 'assign_to'|'set_status'|'set_priority'|'add_tag'|'add_comment', value: any }, ...]
  actions       jsonb       NOT NULL DEFAULT '[]'::jsonb,
  run_count     integer     NOT NULL DEFAULT 0,
  last_run_at   timestamptz,
  created_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automations_workspace ON public.automations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_automations_enabled
  ON public.automations(workspace_id, enabled) WHERE enabled = true;

DROP TRIGGER IF EXISTS trg_automations_updated_at ON public.automations;
CREATE TRIGGER trg_automations_updated_at
  BEFORE UPDATE ON public.automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Simple audit log (last 200 fires per workspace, older rows can be pruned later).
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid        NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  workspace_id  uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  task_id       uuid        REFERENCES public.tasks(id) ON DELETE SET NULL,
  outcome       text        NOT NULL, -- 'ok' | 'skipped' | 'error'
  detail        text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_runs_ws_time
  ON public.automation_runs(workspace_id, created_at DESC);

ALTER TABLE public.automations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automations readable by workspace members"  ON public.automations;
DROP POLICY IF EXISTS "automations writable by workspace admins"   ON public.automations;
DROP POLICY IF EXISTS "automations updatable by workspace admins"  ON public.automations;
DROP POLICY IF EXISTS "automations deletable by workspace admins"  ON public.automations;
DROP POLICY IF EXISTS "automation_runs readable by workspace members" ON public.automation_runs;

CREATE POLICY "automations readable by workspace members"
  ON public.automations FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "automations writable by workspace admins"
  ON public.automations FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));
CREATE POLICY "automations updatable by workspace admins"
  ON public.automations FOR UPDATE
  USING (public.is_workspace_admin(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));
CREATE POLICY "automations deletable by workspace admins"
  ON public.automations FOR DELETE
  USING (public.is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "automation_runs readable by workspace members"
  ON public.automation_runs FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
-- Only the SECURITY DEFINER trigger below inserts into automation_runs, so no
-- INSERT/UPDATE/DELETE policies are exposed to end-users.

-- ---------------------------------------------------------------------------
-- Trigger runner
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_task_automations()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _rule       public.automations%ROWTYPE;
  _cond       jsonb;
  _action     jsonb;
  _match      boolean;
  _fired      boolean := false;
  _err        text;
BEGIN
  FOR _rule IN
    SELECT * FROM public.automations
     WHERE workspace_id = NEW.workspace_id AND enabled = true
  LOOP
    -- Trigger kind match.
    IF _rule.trigger->>'kind' = 'task_created' AND TG_OP <> 'INSERT' THEN CONTINUE; END IF;
    IF _rule.trigger->>'kind' = 'task_status_changed' AND
       (TG_OP <> 'UPDATE' OR OLD.status IS NOT DISTINCT FROM NEW.status) THEN CONTINUE; END IF;
    IF _rule.trigger->>'kind' = 'task_priority_changed' AND
       (TG_OP <> 'UPDATE' OR OLD.priority IS NOT DISTINCT FROM NEW.priority) THEN CONTINUE; END IF;

    -- Conditions (AND). Only a small set of fields supported.
    _match := true;
    FOR _cond IN SELECT * FROM jsonb_array_elements(coalesce(_rule.conditions, '[]'::jsonb))
    LOOP
      DECLARE
        _f text := _cond->>'field';
        _op text := coalesce(_cond->>'op', 'eq');
        _v jsonb := _cond->'value';
        _actual text;
      BEGIN
        _actual := CASE _f
          WHEN 'status'      THEN NEW.status::text
          WHEN 'priority'    THEN NEW.priority::text
          WHEN 'assignee_id' THEN NEW.assignee_id::text
          WHEN 'project_id'  THEN NEW.project_id::text
          ELSE NULL END;

        IF _op = 'eq' AND _actual IS DISTINCT FROM (_v#>>'{}') THEN _match := false; EXIT; END IF;
        IF _op = 'neq' AND _actual IS NOT DISTINCT FROM (_v#>>'{}') THEN _match := false; EXIT; END IF;
        IF _op = 'in' THEN
          IF _actual IS NULL OR NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(_v) x WHERE x.value = _actual
          ) THEN _match := false; EXIT; END IF;
        END IF;
      END;
    END LOOP;
    IF NOT _match THEN CONTINUE; END IF;

    -- Actions.
    BEGIN
      FOR _action IN SELECT * FROM jsonb_array_elements(coalesce(_rule.actions, '[]'::jsonb))
      LOOP
        CASE _action->>'kind'
          WHEN 'assign_to' THEN
            NEW.assignee_id := (_action->>'value')::uuid;
          WHEN 'set_status' THEN
            NEW.status := (_action->>'value')::task_status;
          WHEN 'set_priority' THEN
            NEW.priority := (_action->>'value')::task_priority;
          WHEN 'add_tag' THEN
            NEW.tags := array_append(coalesce(NEW.tags, '{}'::text[]), _action->>'value');
          WHEN 'add_comment' THEN
            IF _rule.created_by IS NOT NULL THEN
              INSERT INTO public.task_comments (task_id, author_id, body)
              VALUES (NEW.id, _rule.created_by, _action->>'value');
            END IF;
          ELSE
            NULL;
        END CASE;
      END LOOP;
      _fired := true;
      INSERT INTO public.automation_runs (automation_id, workspace_id, task_id, outcome)
      VALUES (_rule.id, _rule.workspace_id, NEW.id, 'ok');
      UPDATE public.automations
         SET run_count = run_count + 1, last_run_at = now()
       WHERE id = _rule.id;
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS _err = MESSAGE_TEXT;
      INSERT INTO public.automation_runs (automation_id, workspace_id, task_id, outcome, detail)
      VALUES (_rule.id, _rule.workspace_id, NEW.id, 'error', _err);
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_run_task_automations ON public.tasks;
CREATE TRIGGER trg_run_task_automations
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.run_task_automations();
