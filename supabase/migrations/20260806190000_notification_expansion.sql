-- ============================================================================
-- SPRINT 1.2 — Notification center expansion
--
-- Fixes + new triggers:
--   1. Fix kind mismatch: dots → underscores to match notification_preferences
--   2. New trigger: approval_requested (assigned_to gets notified)
--   3. Auto-enqueue push on new notification insert
--   4. New trigger: decision_review verdict set → notify decided_by
-- ============================================================================

-- 1. Fix kind mismatch: replace dots with underscores
-- Re-declare the three existing trigger functions with corrected kind values.

CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ws uuid;
BEGIN
  IF NEW.assignee_id IS NULL OR NEW.assignee_id IS NOT DISTINCT FROM OLD.assignee_id THEN
    RETURN NEW;
  END IF;
  IF NEW.assignee_id = auth.uid() THEN RETURN NEW; END IF;
  SELECT workspace_id INTO _ws FROM public.projects WHERE id = NEW.project_id;
  IF _ws IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (workspace_id, user_id, kind, title, body, link)
  VALUES (
    _ws, NEW.assignee_id,
    'task_assigned',
    'Sana bir task atandı',
    coalesce(NEW.tracking_id, '') || ' · ' || left(NEW.title, 120),
    '/projects/' || NEW.project_id::text
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_task_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ws uuid;
  _assignee uuid;
  _tracking text;
  _title text;
  _project_id uuid;
BEGIN
  SELECT p.workspace_id, t.assignee_id, t.tracking_id, t.title, t.project_id
    INTO _ws, _assignee, _tracking, _title, _project_id
  FROM public.tasks t JOIN public.projects p ON p.id = t.project_id
  WHERE t.id = NEW.task_id;
  IF _ws IS NULL OR _assignee IS NULL OR _assignee = NEW.author_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (workspace_id, user_id, kind, title, body, link)
  VALUES (
    _ws, _assignee,
    'task_comment',
    'Task''ına yeni yorum',
    coalesce(_tracking, '') || ' · ' || left(_title, 80) || ': ' || left(NEW.body, 100),
    '/projects/' || _project_id::text
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_chat_mention()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid;
  _ch_name text;
BEGIN
  IF NEW.mentions IS NULL OR array_length(NEW.mentions, 1) IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT name INTO _ch_name FROM public.chat_channels WHERE id = NEW.channel_id;

  FOREACH _uid IN ARRAY NEW.mentions LOOP
    IF _uid IS NULL OR _uid = NEW.author_id THEN CONTINUE; END IF;
    INSERT INTO public.notifications (workspace_id, user_id, kind, title, body, link)
    VALUES (
      NEW.workspace_id, _uid,
      'chat_mention',
      '#' || coalesce(_ch_name, 'kanal') || ' kanalında sana bahsedildi',
      left(NEW.body, 140),
      '/chat/' || NEW.channel_id::text
    );
  END LOOP;
  RETURN NEW;
END;
$$;

-- Also fix any existing notification rows with dot-separated kinds
UPDATE public.notifications SET kind = 'task_assigned'  WHERE kind = 'task.assigned';
UPDATE public.notifications SET kind = 'task_comment'   WHERE kind = 'task.comment';
UPDATE public.notifications SET kind = 'chat_mention'   WHERE kind = 'chat.mention';

-- 2. New trigger: approval_requested
CREATE OR REPLACE FUNCTION public.notify_approval_requested()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ws uuid;
BEGIN
  IF NEW.assigned_to IS NULL THEN RETURN NEW; END IF;
  IF NEW.assigned_to = NEW.requested_by THEN RETURN NEW; END IF;

  SELECT workspace_id INTO _ws FROM public.workspace_members
    WHERE user_id = NEW.requested_by AND is_active = true LIMIT 1;
  IF _ws IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (workspace_id, user_id, kind, title, body, link)
  VALUES (
    _ws, NEW.assigned_to,
    'approval_requested',
    'Onayın bekleniyor',
    left(NEW.title, 120),
    '/approvals'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_approval_requested ON public.approvals;
CREATE TRIGGER trg_notify_approval_requested
  AFTER INSERT ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.notify_approval_requested();

-- 3. Auto-enqueue push on new notification insert
-- Piggybacks on the existing notifications INSERT; writes to push_queue
-- for every user who has a push_subscription registered.
CREATE OR REPLACE FUNCTION public.enqueue_notification_push()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.push_queue (user_id, title, body, url, data)
  SELECT
    ps.user_id,
    NEW.title,
    coalesce(NEW.body, ''),
    coalesce(NEW.link, '/'),
    jsonb_build_object('kind', NEW.kind, 'notification_id', NEW.id)
  FROM public.push_subscriptions ps
  WHERE ps.user_id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_notification_push ON public.notifications;
CREATE TRIGGER trg_enqueue_notification_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_notification_push();

-- 4. Decision verdict set → notify the decision creator
CREATE OR REPLACE FUNCTION public.notify_decision_verdict()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ws uuid;
BEGIN
  IF NEW.verdict IS NULL OR OLD.verdict IS NOT DISTINCT FROM NEW.verdict THEN
    RETURN NEW;
  END IF;
  IF NEW.created_by IS NULL OR NEW.created_by = auth.uid() THEN RETURN NEW; END IF;

  SELECT workspace_id INTO _ws FROM public.workspace_members
    WHERE user_id = NEW.created_by AND is_active = true LIMIT 1;
  IF _ws IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (workspace_id, user_id, kind, title, body, link)
  VALUES (
    _ws, NEW.created_by,
    'decision_review',
    'Kararın kapatıldı',
    left(NEW.title, 100) || ' → ' || NEW.verdict,
    '/decisions/' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_decision_verdict ON public.decisions;
CREATE TRIGGER trg_notify_decision_verdict
  AFTER UPDATE OF verdict ON public.decisions
  FOR EACH ROW EXECUTE FUNCTION public.notify_decision_verdict();

NOTIFY pgrst, 'reload schema';
