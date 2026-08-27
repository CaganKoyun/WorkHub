-- Task tracking IDs (WH-00001 style), mirrors the pattern used for bugs.

-- 1) Column
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS tracking_id TEXT;

-- 2) Sequence
CREATE SEQUENCE IF NOT EXISTS public.task_tracking_seq START 1;

-- 3) Trigger function
CREATE OR REPLACE FUNCTION public.generate_task_tracking_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tracking_id IS NULL OR NEW.tracking_id = '' THEN
    NEW.tracking_id := 'WH-' || LPAD(nextval('public.task_tracking_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- 4) Attach trigger (idempotent)
DROP TRIGGER IF EXISTS set_task_tracking_id ON public.tasks;
CREATE TRIGGER set_task_tracking_id
  BEFORE INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.generate_task_tracking_id();

-- 5) Backfill existing rows in stable created_at order
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.tasks WHERE tracking_id IS NULL ORDER BY created_at
  LOOP
    UPDATE public.tasks
       SET tracking_id = 'WH-' || LPAD(nextval('public.task_tracking_seq')::TEXT, 5, '0')
     WHERE id = r.id;
  END LOOP;
END $$;

-- 6) Constraints + index (only unique within a workspace; global unique is
--    fine here because sequence guarantees monotonicity)
ALTER TABLE public.tasks
  ALTER COLUMN tracking_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_tracking_id
  ON public.tasks(tracking_id);
