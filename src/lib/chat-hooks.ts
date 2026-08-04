import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface ChatChannel {
  id: string;
  workspace_id: string;
  slug: string;
  name: string;
  description: string | null;
  is_private: boolean;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  workspace_id: string;
  channel_id: string;
  parent_id: string | null;
  author_id: string | null;
  body: string;
  mentions: string[];
  edited_at: string | null;
  created_at: string;
}

export function useChannels() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['chat-channels', currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<ChatChannel[]> => {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .is('archived_at', null)
        .order('name');
      if (error) throw error;
      return (data ?? []) as ChatChannel[];
    },
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const slug = input.name.trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || `ch-${Date.now()}`;
      const { data, error } = await supabase
        .from('chat_channels')
        .insert({
          workspace_id: currentWorkspace.id,
          slug,
          name: input.name.trim(),
          description: input.description ?? null,
          created_by: user?.id ?? null,
        })
        .select().single();
      if (error) throw error;
      return data as ChatChannel;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-channels'] }),
  });
}

/** Top-level messages of a channel (parent_id IS NULL), oldest → newest. */
export function useChannelMessages(channelId: string | undefined) {
  return useQuery({
    queryKey: ['chat-messages', channelId],
    enabled: !!channelId,
    refetchInterval: 5000,
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId!)
        .is('parent_id', null)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as ChatMessage[];
    },
  });
}

/** Replies for a given thread root, oldest → newest. */
export function useThreadReplies(rootId: string | undefined) {
  return useQuery({
    queryKey: ['chat-thread', rootId],
    enabled: !!rootId,
    refetchInterval: 5000,
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('parent_id', rootId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChatMessage[];
    },
  });
}

/** Reply counts per root message id, for a channel. */
export function useReplyCounts(channelId: string | undefined) {
  return useQuery({
    queryKey: ['chat-reply-counts', channelId],
    enabled: !!channelId,
    refetchInterval: 10_000,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('parent_id')
        .eq('channel_id', channelId!)
        .not('parent_id', 'is', null);
      if (error) throw error;
      const out: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        if (r.parent_id) out[r.parent_id] = (out[r.parent_id] ?? 0) + 1;
      });
      return out;
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      channel_id: string; body: string; parent_id?: string | null; mentions?: string[];
    }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          workspace_id: currentWorkspace.id,
          channel_id: input.channel_id,
          parent_id: input.parent_id ?? null,
          author_id: user.id,
          body: input.body,
          mentions: input.mentions ?? [],
        })
        .select().single();
      if (error) throw error;
      return data as ChatMessage;
    },
    onSuccess: (msg) => {
      if (msg.parent_id) {
        qc.invalidateQueries({ queryKey: ['chat-thread', msg.parent_id] });
        qc.invalidateQueries({ queryKey: ['chat-reply-counts', msg.channel_id] });
      } else {
        qc.invalidateQueries({ queryKey: ['chat-messages', msg.channel_id] });
      }
    },
  });
}

export function useDeleteMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; channel_id: string; parent_id: string | null }) => {
      const { error } = await supabase.from('chat_messages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      if (vars.parent_id) {
        qc.invalidateQueries({ queryKey: ['chat-thread', vars.parent_id] });
        qc.invalidateQueries({ queryKey: ['chat-reply-counts', vars.channel_id] });
      } else {
        qc.invalidateQueries({ queryKey: ['chat-messages', vars.channel_id] });
      }
    },
  });
}

export interface ChatMember {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

/** Workspace members for @mention autocomplete + author name resolution.
 *  Two queries — Supabase RLS makes join tricky and profiles is small. */
export function useWorkspaceMembers() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['workspace-members-lite', currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<ChatMember[]> => {
      const { data: mem, error: e1 } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', currentWorkspace!.id)
        .eq('is_active', true);
      if (e1) throw e1;
      const ids = (mem ?? []).map((r: any) => r.user_id);
      if (ids.length === 0) return [];
      const { data: profs, error: e2 } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', ids);
      if (e2) throw e2;
      const byId = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
      return ids.map(id => ({
        user_id: id,
        full_name: byId.get(id)?.full_name ?? null,
        avatar_url: byId.get(id)?.avatar_url ?? null,
      }));
    },
  });
}

/** Parse @mentions from body against a name→id lookup. */
export function extractMentions(body: string, members: ChatMember[]): string[] {
  const ids = new Set<string>();
  const re = /@([a-zA-Z0-9._-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const tag = m[1].toLowerCase();
    const hit = members.find(mem => {
      const nm = (mem.full_name ?? '').toLowerCase().replace(/\s+/g, '');
      return nm === tag;
    });
    if (hit) ids.add(hit.user_id);
  }
  return [...ids];
}
