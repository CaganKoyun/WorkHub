-- Meeting notes: paste-in transcripts, auto-extracted summary + action items,
-- action items convert to tasks in a chosen project.

CREATE TABLE IF NOT EXISTS public.meeting_notes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title          text        NOT NULL DEFAULT 'Adsız toplantı',
  meeting_at     timestamptz NOT NULL DEFAULT now(),
  transcript     text        NOT NULL DEFAULT '',
  summary        text        NOT NULL DEFAULT '',
  -- action_items: [{ id, text, assignee_email?, done, task_id? }]
  action_items   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  project_id     uuid        REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_notes_workspace_time
  ON public.meeting_notes(workspace_id, meeting_at DESC);

DROP TRIGGER IF EXISTS trg_meeting_notes_updated_at ON public.meeting_notes;
CREATE TRIGGER trg_meeting_notes_updated_at
  BEFORE UPDATE ON public.meeting_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.meeting_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meeting_notes readable by workspace members"   ON public.meeting_notes;
DROP POLICY IF EXISTS "meeting_notes writable by workspace members"   ON public.meeting_notes;
DROP POLICY IF EXISTS "meeting_notes updatable by workspace members"  ON public.meeting_notes;
DROP POLICY IF EXISTS "meeting_notes deletable by workspace members"  ON public.meeting_notes;

CREATE POLICY "meeting_notes readable by workspace members"
  ON public.meeting_notes FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "meeting_notes writable by workspace members"
  ON public.meeting_notes FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "meeting_notes updatable by workspace members"
  ON public.meeting_notes FOR UPDATE
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "meeting_notes deletable by workspace members"
  ON public.meeting_notes FOR DELETE
  USING (public.is_workspace_member(workspace_id, auth.uid()));
