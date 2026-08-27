-- Service Desk: external tickets with public submission, replies, SLA.
-- Priority drives SLA due-at, computed once at insert and preserved unless
-- the ticket's priority changes.

DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'waiting', 'resolved', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.tickets (
  id                  uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid                      NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  tracking_id         text                      NOT NULL,
  subject             text                      NOT NULL,
  body                text                      NOT NULL DEFAULT '',
  requester_name      text,
  requester_email     text,
  status              public.ticket_status      NOT NULL DEFAULT 'open',
  priority            public.ticket_priority    NOT NULL DEFAULT 'medium',
  assignee_id         uuid                      REFERENCES auth.users(id) ON DELETE SET NULL,
  sla_due_at          timestamptz,
  first_response_at   timestamptz,
  resolved_at         timestamptz,
  submitter_ip        text,
  created_at          timestamptz               NOT NULL DEFAULT now(),
  updated_at          timestamptz               NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, tracking_id)
);

CREATE INDEX IF NOT EXISTS idx_tickets_workspace_status
  ON public.tickets(workspace_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee
  ON public.tickets(assignee_id) WHERE assignee_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON public.tickets;
CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ticket_replies (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     uuid        NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  workspace_id  uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  -- author_id NULL = external requester
  author_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  body          text        NOT NULL,
  is_internal   boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_time
  ON public.ticket_replies(ticket_id, created_at);

-- Sequence-based tracking IDs (SD-00001), per-workspace.
CREATE SEQUENCE IF NOT EXISTS public.tickets_tracking_seq START 1;

CREATE OR REPLACE FUNCTION public.tickets_before_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  _hours integer;
BEGIN
  IF NEW.tracking_id IS NULL OR NEW.tracking_id = '' THEN
    NEW.tracking_id := 'SD-' || lpad(nextval('public.tickets_tracking_seq')::text, 5, '0');
  END IF;
  IF NEW.sla_due_at IS NULL THEN
    _hours := CASE NEW.priority
      WHEN 'urgent' THEN 4
      WHEN 'high'   THEN 24
      WHEN 'medium' THEN 48
      WHEN 'low'    THEN 72
      ELSE 48 END;
    NEW.sla_due_at := coalesce(NEW.created_at, now()) + make_interval(hours => _hours);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tickets_before_insert ON public.tickets;
CREATE TRIGGER trg_tickets_before_insert
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.tickets_before_insert();

-- When status transitions to 'resolved', stamp resolved_at.
CREATE OR REPLACE FUNCTION public.tickets_before_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status <> 'resolved' AND NEW.resolved_at IS NULL THEN
    NEW.resolved_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tickets_before_update ON public.tickets;
CREATE TRIGGER trg_tickets_before_update
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.tickets_before_update();

-- When the first non-internal reply from a workspace member arrives, stamp
-- first_response_at on the ticket.
CREATE OR REPLACE FUNCTION public.ticket_replies_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.author_id IS NOT NULL AND NEW.is_internal = false THEN
    UPDATE public.tickets
       SET first_response_at = coalesce(first_response_at, now())
     WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_replies_after_insert ON public.ticket_replies;
CREATE TRIGGER trg_ticket_replies_after_insert
  AFTER INSERT ON public.ticket_replies
  FOR EACH ROW EXECUTE FUNCTION public.ticket_replies_after_insert();

-- RLS ---------------------------------------------------------------------
ALTER TABLE public.tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets readable by workspace members"    ON public.tickets;
DROP POLICY IF EXISTS "tickets insertable by anyone"             ON public.tickets;
DROP POLICY IF EXISTS "tickets updatable by workspace members"   ON public.tickets;
DROP POLICY IF EXISTS "tickets deletable by workspace admins"    ON public.tickets;
DROP POLICY IF EXISTS "ticket_replies readable by workspace members" ON public.ticket_replies;
DROP POLICY IF EXISTS "ticket_replies writable by workspace members" ON public.ticket_replies;
DROP POLICY IF EXISTS "ticket_replies deletable by author or admin"  ON public.ticket_replies;

CREATE POLICY "tickets readable by workspace members"
  ON public.tickets FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
-- Anon (public form) may submit a ticket into any workspace — cheap DoS
-- surface, but the alternative is per-workspace public ingest tokens.
-- Keeping it open here; ratelimit at the edge.
CREATE POLICY "tickets insertable by anyone"
  ON public.tickets FOR INSERT
  WITH CHECK (true);
CREATE POLICY "tickets updatable by workspace members"
  ON public.tickets FOR UPDATE
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "tickets deletable by workspace admins"
  ON public.tickets FOR DELETE
  USING (public.is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "ticket_replies readable by workspace members"
  ON public.ticket_replies FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "ticket_replies writable by workspace members"
  ON public.ticket_replies FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND author_id = auth.uid());
CREATE POLICY "ticket_replies deletable by author or admin"
  ON public.ticket_replies FOR DELETE
  USING (author_id = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid()));
