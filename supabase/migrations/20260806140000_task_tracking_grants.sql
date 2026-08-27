-- Fix: non-owner authenticated users hit "permission denied for sequence
-- task_tracking_seq" when inserting tasks, because the BEFORE INSERT
-- trigger runs as the caller and needs USAGE on the sequence.
--
-- Two-belts fix:
--  1. GRANT USAGE ON SEQUENCE explicitly so any authenticated user can
--     bump the counter through the trigger.
--  2. Recreate the trigger function with SECURITY DEFINER so it also
--     works if the grant is ever revoked or the function is invoked in
--     a different security context.

GRANT USAGE, SELECT ON SEQUENCE public.task_tracking_seq TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_task_tracking_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tracking_id IS NULL OR NEW.tracking_id = '' THEN
    NEW.tracking_id := 'WH-' || LPAD(nextval('public.task_tracking_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;
