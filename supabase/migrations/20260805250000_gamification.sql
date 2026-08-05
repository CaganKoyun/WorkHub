-- Gamification: append-only XP event log + derived leaderboard/streak/level
-- RPCs. Trigger'lar tasks (done geçişi) ve task_comments (yorum ekleme) için
-- XP verir. Kullanıcı doğrudan xp_events'e yazamaz.

CREATE TABLE IF NOT EXISTS public.xp_events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind          text        NOT NULL,                 -- 'task.done', 'task.done.on_time', 'task.done.points', 'comment', 'streak.bonus'
  points        integer     NOT NULL,
  entity_type   text,                                 -- 'task' | 'comment' | …
  entity_id     uuid,
  detail        text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_ws_user_time
  ON public.xp_events(workspace_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_events_user_time
  ON public.xp_events(user_id, created_at DESC);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "xp_events readable by workspace members" ON public.xp_events;
-- No INSERT policy — yalnızca SECURITY DEFINER trigger'lar/RPC yazar.

CREATE POLICY "xp_events readable by workspace members"
  ON public.xp_events FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- Award RPC — application kodu da doğrudan çağırabilir (test/manual).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_xp(
  _workspace_id uuid,
  _user_id uuid,
  _kind text,
  _points integer,
  _entity_type text DEFAULT NULL,
  _entity_id uuid DEFAULT NULL,
  _detail text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF _points IS NULL OR _points = 0 THEN RAISE EXCEPTION 'points must be non-zero'; END IF;
  IF _user_id IS NULL OR coalesce(length(_kind), 0) = 0 THEN
    RAISE EXCEPTION 'user_id + kind required';
  END IF;
  INSERT INTO public.xp_events (workspace_id, user_id, kind, points, entity_type, entity_id, detail)
  VALUES (_workspace_id, _user_id, _kind, _points, _entity_type, _entity_id, _detail)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Task done → XP: baz 10 + on-time bonusu 5 + story points × 2.
-- Assignee alır (yoksa reporter). Aynı task için tekrar tekrar done olsa da
-- tekrar XP verilmez — kısa süreli status flap koruması olarak son 10 dk
-- içinde aynı task için 'task.done' varsa skip.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_task_done_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ws uuid;
  _uid uuid;
  _on_time boolean;
  _sp integer;
  _dup boolean;
BEGIN
  IF NEW.status <> 'done' OR OLD.status = 'done' THEN RETURN NEW; END IF;

  SELECT workspace_id INTO _ws FROM public.projects WHERE id = NEW.project_id;
  IF _ws IS NULL THEN RETURN NEW; END IF;

  _uid := coalesce(NEW.assignee_id, NEW.reporter_id);
  IF _uid IS NULL THEN RETURN NEW; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.xp_events
    WHERE user_id = _uid AND entity_type = 'task' AND entity_id = NEW.id
      AND kind = 'task.done' AND created_at > now() - interval '10 minutes'
  ) INTO _dup;
  IF _dup THEN RETURN NEW; END IF;

  INSERT INTO public.xp_events (workspace_id, user_id, kind, points, entity_type, entity_id, detail)
  VALUES (_ws, _uid, 'task.done', 10, 'task', NEW.id, NEW.tracking_id);

  _on_time := NEW.due_date IS NULL OR NEW.due_date >= current_date;
  IF _on_time AND NEW.due_date IS NOT NULL THEN
    INSERT INTO public.xp_events (workspace_id, user_id, kind, points, entity_type, entity_id, detail)
    VALUES (_ws, _uid, 'task.done.on_time', 5, 'task', NEW.id, NEW.tracking_id);
  END IF;

  _sp := coalesce(NEW.story_points, 0);
  IF _sp > 0 THEN
    INSERT INTO public.xp_events (workspace_id, user_id, kind, points, entity_type, entity_id, detail)
    VALUES (_ws, _uid, 'task.done.points', _sp * 2, 'task', NEW.id, format('%s sp', _sp));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_task_done_xp ON public.tasks;
CREATE TRIGGER trg_award_task_done_xp
  AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.award_task_done_xp();

-- Yorum eklendiğinde +2 XP (author'a). Kendi task'ına da olsa verir.
CREATE OR REPLACE FUNCTION public.award_comment_xp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ws uuid;
BEGIN
  IF NEW.author_id IS NULL THEN RETURN NEW; END IF;
  SELECT p.workspace_id INTO _ws
  FROM public.tasks t JOIN public.projects p ON p.id = t.project_id
  WHERE t.id = NEW.task_id;
  IF _ws IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.xp_events (workspace_id, user_id, kind, points, entity_type, entity_id, detail)
  VALUES (_ws, NEW.author_id, 'comment', 2, 'comment', NEW.id, NULL);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_comment_xp ON public.task_comments;
CREATE TRIGGER trg_award_comment_xp
  AFTER INSERT ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.award_comment_xp();

-- ---------------------------------------------------------------------------
-- Derived queries — SECURITY DEFINER so a single RPC replaces client-side
-- aggregation. Membership her sorguda auth.uid() üzerinden kontrol edilir.
-- ---------------------------------------------------------------------------

-- Workspace leaderboard: user_id, total_xp, event_count, level, level_progress
-- Level formula: level = floor(sqrt(total_xp/50)) + 1; next level threshold
-- level² × 50 XP. Level 1 = 0-49, Level 2 = 50-199, Level 3 = 200-449, …
CREATE OR REPLACE FUNCTION public.workspace_leaderboard(_workspace_id uuid, _limit integer DEFAULT 20)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  avatar_url text,
  total_xp bigint,
  event_count bigint,
  level integer,
  next_level_xp integer,
  in_level_xp integer
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH auth_check AS (
    SELECT 1 WHERE public.is_workspace_member(_workspace_id, auth.uid())
  ),
  agg AS (
    SELECT
      x.user_id,
      sum(x.points)::bigint AS total_xp,
      count(*)::bigint       AS event_count
    FROM public.xp_events x, auth_check
    WHERE x.workspace_id = _workspace_id
    GROUP BY x.user_id
  )
  SELECT
    a.user_id,
    p.full_name,
    p.avatar_url,
    a.total_xp,
    a.event_count,
    (floor(sqrt(greatest(a.total_xp, 0) / 50.0)) + 1)::int AS level,
    ((floor(sqrt(greatest(a.total_xp, 0) / 50.0)) + 1)^2 * 50)::int AS next_level_xp,
    (a.total_xp - (floor(sqrt(greatest(a.total_xp, 0) / 50.0))^2 * 50))::int AS in_level_xp
  FROM agg a
  LEFT JOIN public.profiles p ON p.user_id = a.user_id
  ORDER BY a.total_xp DESC
  LIMIT least(_limit, 100);
$$;

-- Kullanıcı aktivite streak — bugüne kadar aralıksız aktivite olan gün sayısı.
-- Herhangi bir xp_events kaydı olan gün = "aktif gün". Bugün veya dün ile
-- başlamalı, yoksa streak 0.
CREATE OR REPLACE FUNCTION public.user_streak(_workspace_id uuid, _user_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cur date := current_date;
  _streak integer := 0;
  _has boolean;
BEGIN
  IF NOT public.is_workspace_member(_workspace_id, auth.uid()) THEN RETURN 0; END IF;

  SELECT EXISTS (SELECT 1 FROM public.xp_events
                 WHERE workspace_id = _workspace_id AND user_id = _user_id
                   AND created_at::date = _cur) INTO _has;
  IF NOT _has THEN _cur := _cur - 1; END IF;

  LOOP
    SELECT EXISTS (SELECT 1 FROM public.xp_events
                   WHERE workspace_id = _workspace_id AND user_id = _user_id
                     AND created_at::date = _cur) INTO _has;
    EXIT WHEN NOT _has;
    _streak := _streak + 1;
    _cur := _cur - 1;
    EXIT WHEN _streak >= 365; -- safety
  END LOOP;

  RETURN _streak;
END;
$$;

-- Kullanıcı için son XP kayıtları (limit'li).
CREATE OR REPLACE FUNCTION public.user_xp_feed(_workspace_id uuid, _user_id uuid, _limit integer DEFAULT 25)
RETURNS SETOF public.xp_events
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.xp_events
  WHERE workspace_id = _workspace_id
    AND user_id = _user_id
    AND public.is_workspace_member(_workspace_id, auth.uid())
  ORDER BY created_at DESC
  LIMIT least(_limit, 200);
$$;
