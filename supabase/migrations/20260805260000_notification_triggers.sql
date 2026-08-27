-- Notification triggers — task assignment / comment / chat mention olayları
-- notifications tablosuna satır atar. Kullanıcının kendi eylemi için sessiz
-- kalır (kendine bildirim yok).

-- Task assignee_id değişince: yeni assignee'ye "sana atandı" bildirimi.
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
    'task.assigned',
    'Sana bir task atandı',
    coalesce(NEW.tracking_id, '') || ' · ' || left(NEW.title, 120),
    '/projects/' || NEW.project_id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_assigned ON public.tasks;
CREATE TRIGGER trg_notify_task_assigned
  AFTER INSERT OR UPDATE OF assignee_id ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assigned();

-- Task yorumu: yorum atılan task'ın assignee'sine bildir (yazar hariç).
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
    'task.comment',
    'Task''ına yeni yorum',
    coalesce(_tracking, '') || ' · ' || left(_title, 80) || ': ' || left(NEW.body, 100),
    '/projects/' || _project_id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_comment ON public.task_comments;
CREATE TRIGGER trg_notify_task_comment
  AFTER INSERT ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_comment();

-- Chat mention: chat_messages.mentions içinde geçen her user_id'ye bildir
-- (yazar hariç). Aynı mesaj için tekrar aynı kullanıcıya insert olmaz —
-- chat_messages'a INSERT trigger'ı olduğu için idempotent.
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
      'chat.mention',
      '#' || coalesce(_ch_name, 'kanal') || ' kanalında sana bahsedildi',
      left(NEW.body, 140),
      '/chat/' || NEW.channel_id::text
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_chat_mention ON public.chat_messages;
CREATE TRIGGER trg_notify_chat_mention
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_chat_mention();
