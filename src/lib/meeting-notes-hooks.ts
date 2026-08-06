import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { ExtractedActionItem } from './meeting-extract';

export interface MeetingNote {
  id: string;
  workspace_id: string;
  title: string;
  meeting_at: string;
  transcript: string;
  summary: string;
  action_items: ExtractedActionItem[];
  project_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useMeetingNotes() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['meeting-notes', currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<MeetingNote[]> => {
      const { data, error } = await supabase
        .from('meeting_notes')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .order('meeting_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as MeetingNote[];
    },
  });
}

export function useMeetingNote(id: string | undefined) {
  return useQuery({
    queryKey: ['meeting-note', id],
    enabled: !!id,
    queryFn: async (): Promise<MeetingNote | null> => {
      const { data, error } = await supabase
        .from('meeting_notes').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as unknown as MeetingNote | null;
    },
  });
}

export function useCreateMeetingNote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      title: string; transcript: string; summary: string;
      action_items: ExtractedActionItem[]; project_id?: string | null;
    }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const { data, error } = await supabase
        .from('meeting_notes')
        .insert({
          workspace_id: currentWorkspace.id,
          title: input.title,
          transcript: input.transcript,
          summary: input.summary,
          action_items: input.action_items as never,
          project_id: input.project_id ?? null,
          created_by: user?.id ?? null,
        })
        .select().single();
      if (error) throw error;
      return data as unknown as MeetingNote;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meeting-notes'] }),
  });
}

export function useUpdateMeetingNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<MeetingNote> & { id: string }) => {
      const p: Record<string, unknown> = { ...patch };
      if (patch.action_items) p.action_items = patch.action_items as unknown;
      const { data, error } = await supabase
        .from('meeting_notes').update(p as never).eq('id', id).select().single();
      if (error) throw error;
      return data as unknown as MeetingNote;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['meeting-notes'] });
      qc.invalidateQueries({ queryKey: ['meeting-note', n.id] });
    },
  });
}

export function useDeleteMeetingNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meeting_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meeting-notes'] }),
  });
}

/** Create a task from an action item; caller must supply project_id +
 *  assignee_id (already resolved). Returns the created task id. */
export function useConvertActionItemToTask() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      project_id: string; title: string; assignee_id?: string | null;
    }): Promise<string> => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: input.project_id,
          title: input.title.slice(0, 200),
          status: 'todo',
          priority: 'medium',
          assignee_id: input.assignee_id ?? null,
          reporter_id: user.id,
        })
        .select('id').single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
  });
}
