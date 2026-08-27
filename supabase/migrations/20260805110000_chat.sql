-- Chat (Slack-lite): workspace channels + threaded messages + @mentions.
-- Channels are workspace-wide (private flag reserved for later). Every workspace
-- member can read/post. Threads via messages.parent_id (one level deep).

CREATE TABLE IF NOT EXISTS public.chat_channels (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slug          text        NOT NULL,
  name          text        NOT NULL,
  description   text,
  is_private    boolean     NOT NULL DEFAULT false,
  archived_at   timestamptz,
  created_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_workspace ON public.chat_channels(workspace_id);

DROP TRIGGER IF EXISTS trg_chat_channels_updated_at ON public.chat_channels;
CREATE TRIGGER trg_chat_channels_updated_at
  BEFORE UPDATE ON public.chat_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  channel_id    uuid        NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  parent_id     uuid        REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  author_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  body          text        NOT NULL,
  mentions      uuid[]      NOT NULL DEFAULT '{}'::uuid[],
  edited_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_time
  ON public.chat_messages(channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread
  ON public.chat_messages(parent_id, created_at) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_messages_mentions
  ON public.chat_messages USING gin(mentions);

ALTER TABLE public.chat_channels  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_channels readable by workspace members"     ON public.chat_channels;
DROP POLICY IF EXISTS "chat_channels writable by workspace members"     ON public.chat_channels;
DROP POLICY IF EXISTS "chat_channels updatable by workspace members"    ON public.chat_channels;
DROP POLICY IF EXISTS "chat_channels deletable by workspace admins"     ON public.chat_channels;
DROP POLICY IF EXISTS "chat_messages readable by workspace members"     ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages writable by workspace members"     ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages updatable by author"               ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages deletable by author or admin"      ON public.chat_messages;

CREATE POLICY "chat_channels readable by workspace members"
  ON public.chat_channels FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "chat_channels writable by workspace members"
  ON public.chat_channels FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "chat_channels updatable by workspace members"
  ON public.chat_channels FOR UPDATE
  USING (public.is_workspace_member(workspace_id, auth.uid()))
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "chat_channels deletable by workspace admins"
  ON public.chat_channels FOR DELETE
  USING (public.is_workspace_admin(workspace_id, auth.uid()));

CREATE POLICY "chat_messages readable by workspace members"
  ON public.chat_messages FOR SELECT
  USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "chat_messages writable by workspace members"
  ON public.chat_messages FOR INSERT
  WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()) AND author_id = auth.uid());
CREATE POLICY "chat_messages updatable by author"
  ON public.chat_messages FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());
CREATE POLICY "chat_messages deletable by author or admin"
  ON public.chat_messages FOR DELETE
  USING (author_id = auth.uid() OR public.is_workspace_admin(workspace_id, auth.uid()));

-- Seed a #general channel per existing workspace, once.
INSERT INTO public.chat_channels (workspace_id, slug, name, description)
SELECT w.id, 'general', 'general', 'Genel sohbet kanalı'
FROM public.workspaces w
ON CONFLICT (workspace_id, slug) DO NOTHING;
