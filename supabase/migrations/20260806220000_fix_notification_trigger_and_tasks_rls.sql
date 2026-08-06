-- Fix 1: enqueue_notification_email() references notification_preferences.kind
-- which does not exist. The table uses per-type boolean columns instead.
-- Rewrite to use the correct schema.

CREATE OR REPLACE FUNCTION public.enqueue_notification_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _email text;
  _send  boolean := true;
  _pref  record;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;
  IF _email IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO _pref FROM public.notification_preferences
    WHERE user_id = NEW.user_id;

  IF FOUND THEN
    _send := CASE NEW.kind
      WHEN 'task_assigned'        THEN coalesce(_pref.email_on_assignment, true)
      WHEN 'new_bug'              THEN coalesce(_pref.email_on_new_bug, true)
      WHEN 'status_changed'       THEN coalesce(_pref.email_on_status_change, true)
      WHEN 'new_comment'          THEN coalesce(_pref.email_on_comment, true)
      WHEN 'mention_in_comment'   THEN coalesce(_pref.mention_in_comment, true)
      WHEN 'sla_breach'           THEN coalesce(_pref.email_on_sla_breach, true)
      WHEN 'approval_created'     THEN coalesce(_pref.approval_created, true)
      WHEN 'approval_overdue'     THEN coalesce(_pref.approval_overdue, true)
      WHEN 'decision_review_due'  THEN coalesce(_pref.decision_review_due, true)
      WHEN 'review_reminder'      THEN coalesce(_pref.review_reminder, true)
      WHEN 'signal_scan_detected' THEN coalesce(_pref.signal_scan_detected, true)
      ELSE true
    END;
  END IF;

  IF NOT _send THEN RETURN NEW; END IF;

  INSERT INTO public.email_queue (user_id, to_email, subject, body, link, kind)
  VALUES (NEW.user_id, _email, NEW.title, coalesce(NEW.body, ''), NEW.link, NEW.kind);
  RETURN NEW;
END;
$$;

-- Fix 2: Revoke anon SELECT on sensitive tables.
-- Supabase default grants give anon SELECT on all tables; we must
-- explicitly revoke for tables that should never be publicly readable.

DO $$ BEGIN
  REVOKE SELECT, INSERT, UPDATE, DELETE ON public.tasks             FROM anon;
  REVOKE SELECT, INSERT, UPDATE, DELETE ON public.projects          FROM anon;
  REVOKE SELECT, INSERT, UPDATE, DELETE ON public.project_members   FROM anon;
  REVOKE SELECT, INSERT, UPDATE, DELETE ON public.workspaces        FROM anon;
  REVOKE SELECT, INSERT, UPDATE, DELETE ON public.workspace_members FROM anon;
  REVOKE SELECT, INSERT, UPDATE, DELETE ON public.chat_messages     FROM anon;
  REVOKE SELECT, INSERT, UPDATE, DELETE ON public.notifications     FROM anon;
END $$;

-- Fix 3: Tighten tasks INSERT policy — viewers should not be able to
-- create tasks. Replace the existing policy with one that checks the
-- workspace role.

DROP POLICY IF EXISTS tasks_ws_insert ON public.tasks;
CREATE POLICY tasks_ws_insert ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_member(workspace_id, auth.uid())
    AND public.workspace_role(workspace_id, auth.uid()) <> 'viewer'
  );
