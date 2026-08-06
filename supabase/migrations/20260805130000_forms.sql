-- Forms: dynamic form defs + public submission URL + optional task auto-create.
-- A form belongs to a workspace but can be exposed publicly via a random slug.
-- Anonymous callers can INSERT into form_submissions when the form is public
-- and open. Admins read/manage forms and submissions.

CREATE TABLE IF NOT EXISTS public.forms (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slug              text        NOT NULL UNIQUE,
  name              text        NOT NULL,
  description       text,
  -- fields: [{ key, label, kind: 'text'|'textarea'|'number'|'email'|'select'|'checkbox',
  --            required, options?: string[], placeholder? }]
  fields            jsonb       NOT NULL DEFAULT '[]'::jsonb,
  is_public         boolean     NOT NULL DEFAULT true,
  is_open           boolean     NOT NULL DEFAULT true,
  submit_message    text        NOT NULL DEFAULT 'Teşekkürler — cevabınız alındı.',
  target_kind       text        NOT NULL DEFAULT 'none', -- 'none' | 'task'
  target_project_id uuid        REFERENCES public.projects(id) ON DELETE SET NULL,
  submission_count  integer     NOT NULL DEFAULT 0,
  created_by        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forms_workspace ON public.forms(workspace_id);

DROP TRIGGER IF EXISTS trg_forms_updated_at ON public.forms;
CREATE TRIGGER trg_forms_updated_at
  BEFORE UPDATE ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.form_submissions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id           uuid        NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  workspace_id      uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  values            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  submitter_email   text,
  task_id           uuid        REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form ON public.form_submissions(form_id, created_at DESC);

ALTER TABLE public.forms            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forms readable by workspace members"    ON public.forms;
DROP POLICY IF EXISTS "forms readable by anon when public"     ON public.forms;
DROP POLICY IF EXISTS "forms writable by workspace admins"     ON public.forms;
DROP POLICY IF EXISTS "forms updatable by workspace admins"    ON public.forms;
DROP POLICY IF EXISTS "forms deletable by workspace admins"    ON public.forms;
DROP POLICY IF EXISTS "form_submissions readable by workspace members" ON public.form_submissions;
DROP POLICY IF EXISTS "form_submissions insertable by anyone when open" ON public.form_submissions;
DROP POLICY IF EXISTS "form_submissions deletable by workspace admins" ON public.form_submissions;

CREATE POLICY "forms readable by workspace members"
  ON public.forms FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "forms readable by anon when public"
  ON public.forms FOR SELECT
  TO anon
  USING (is_public = true);
CREATE POLICY "forms writable by workspace admins"
  ON public.forms FOR INSERT
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));
CREATE POLICY "forms updatable by workspace admins"
  ON public.forms FOR UPDATE
  USING (public.is_workspace_admin(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_admin(workspace_id, auth.uid()));
CREATE POLICY "forms deletable by workspace admins"
  ON public.forms FOR DELETE
  USING (public.is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "form_submissions readable by workspace members"
  ON public.form_submissions FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
-- Public form submission: any caller (anon or authed) may insert IF the parent
-- form is public+open. The row's workspace_id must match the form's.
CREATE POLICY "form_submissions insertable by anyone when open"
  ON public.form_submissions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.forms f
    WHERE f.id = form_id
      AND f.workspace_id = form_submissions.workspace_id
      AND f.is_public = true
      AND f.is_open = true
  ));
CREATE POLICY "form_submissions deletable by workspace admins"
  ON public.form_submissions FOR DELETE
  USING (public.is_workspace_admin(workspace_id, auth.uid()));

-- Auto-task creation: when a submission arrives and the form targets 'task',
-- create a task in the target project and back-fill submission.task_id.
CREATE OR REPLACE FUNCTION public.forms_apply_submission_target()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _form public.forms%ROWTYPE;
  _title text;
  _desc text;
  _new_task_id uuid;
  _reporter uuid;
BEGIN
  SELECT * INTO _form FROM public.forms WHERE id = NEW.form_id;
  IF NOT FOUND OR _form.target_kind <> 'task' OR _form.target_project_id IS NULL THEN
    UPDATE public.forms SET submission_count = submission_count + 1 WHERE id = NEW.form_id;
    RETURN NEW;
  END IF;

  -- Title from the first "title-ish" field or fallback to form name + timestamp.
  _title := coalesce(
    NEW.values->>'title',
    NEW.values->>'name',
    NEW.values->>'subject',
    _form.name || ' — ' || to_char(NEW.created_at, 'YYYY-MM-DD HH24:MI')
  );
  _desc := coalesce(
    NEW.values->>'description',
    NEW.values->>'message',
    NEW.values::text
  );

  -- Use the form creator as reporter; fall back to project owner-ish nulls fail.
  _reporter := _form.created_by;
  IF _reporter IS NULL THEN
    UPDATE public.forms SET submission_count = submission_count + 1 WHERE id = NEW.form_id;
    RETURN NEW;
  END IF;

  INSERT INTO public.tasks (project_id, title, description, status, priority, reporter_id)
  VALUES (_form.target_project_id, _title, _desc, 'todo', 'medium', _reporter)
  RETURNING id INTO _new_task_id;

  NEW.task_id := _new_task_id;
  UPDATE public.forms SET submission_count = submission_count + 1 WHERE id = NEW.form_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_forms_apply_submission_target ON public.form_submissions;
CREATE TRIGGER trg_forms_apply_submission_target
  BEFORE INSERT ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.forms_apply_submission_target();
