-- Recurring tasks. A task with a `recurrence` JSONB rule spawns the next
-- instance the moment it is marked done. The template task is the one the
-- user edited (interval, byday, until, count); each generated instance keeps
-- a pointer back at that template via `recurrence_source_id` so we can wind
-- the chain forward/backward if needed.

-- 1) Columns
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence JSONB,
  ADD COLUMN IF NOT EXISTS recurrence_source_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence_count_completed INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_source ON public.tasks(recurrence_source_id);
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_active ON public.tasks((recurrence IS NOT NULL));

-- 2) Helper: compute the next due_date based on recurrence rule.
--    rule = { freq: 'daily'|'weekly'|'monthly'|'yearly', interval: int }
CREATE OR REPLACE FUNCTION public.tasks_next_due(_current DATE, _rule JSONB)
RETURNS DATE
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  freq TEXT := lower(coalesce(_rule->>'freq', 'daily'));
  step INT := greatest(1, coalesce((_rule->>'interval')::int, 1));
BEGIN
  IF _current IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN CASE freq
    WHEN 'daily'   THEN _current + (step || ' day')::interval
    WHEN 'weekly'  THEN _current + (step * 7 || ' day')::interval
    WHEN 'monthly' THEN _current + (step || ' month')::interval
    WHEN 'yearly'  THEN _current + (step || ' year')::interval
    ELSE                _current + (step || ' day')::interval
  END;
END;
$$;

-- 3) Trigger: on completion of a task with recurrence, spawn the next instance
CREATE OR REPLACE FUNCTION public.tasks_spawn_next_recurrence()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rule      JSONB;
  next_due  DATE;
  until_at  DATE;
  cnt_limit INT;
  cnt_done  INT;
  base_id   UUID;
BEGIN
  -- Only act on transitions into 'done'
  IF NEW.status <> 'done' OR OLD.status = 'done' THEN
    RETURN NEW;
  END IF;

  rule := NEW.recurrence;
  IF rule IS NULL THEN
    RETURN NEW;
  END IF;

  next_due := public.tasks_next_due(coalesce(NEW.due_date, CURRENT_DATE), rule);

  -- Respect end conditions
  until_at := NULLIF(rule->>'until', '')::date;
  IF until_at IS NOT NULL AND next_due > until_at THEN
    RETURN NEW;
  END IF;

  cnt_limit := NULLIF(rule->>'count', '')::int;
  cnt_done  := coalesce(NEW.recurrence_count_completed, 0) + 1;
  IF cnt_limit IS NOT NULL AND cnt_done >= cnt_limit THEN
    -- Bump the completed counter on this task and stop
    UPDATE public.tasks SET recurrence_count_completed = cnt_done WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  base_id := coalesce(NEW.recurrence_source_id, NEW.id);

  INSERT INTO public.tasks (
    project_id, workspace_id, parent_task_id, title, description,
    status, priority, tags, assignee_id, reporter_id,
    due_date, estimated_hours, story_points, cycle_id,
    recurrence, recurrence_source_id, recurrence_count_completed
  )
  VALUES (
    NEW.project_id, NEW.workspace_id, NEW.parent_task_id, NEW.title, NEW.description,
    'todo', NEW.priority, NEW.tags, NEW.assignee_id, NEW.reporter_id,
    next_due, NEW.estimated_hours, NEW.story_points, NEW.cycle_id,
    NEW.recurrence, base_id, cnt_done
  );

  -- Track how many times the chain completed on the template row
  UPDATE public.tasks
     SET recurrence_count_completed = cnt_done
   WHERE id = base_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_spawn_next_recurrence ON public.tasks;
CREATE TRIGGER tasks_spawn_next_recurrence
  AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_spawn_next_recurrence();

GRANT EXECUTE ON FUNCTION public.tasks_next_due(DATE, JSONB) TO authenticated;
