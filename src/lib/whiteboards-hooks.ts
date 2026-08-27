import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export type ShapeKind = 'rect' | 'ellipse' | 'text' | 'arrow';

export interface Shape {
  id: string;
  kind: ShapeKind;
  x: number;
  y: number;
  /** width — rect/ellipse/text */
  w?: number;
  /** height — rect/ellipse/text */
  h?: number;
  /** endpoint — arrow */
  x2?: number;
  y2?: number;
  text?: string;
  color?: string;
  stroke?: string;
}

export interface Whiteboard {
  id: string;
  workspace_id: string;
  name: string;
  elements: Shape[];
  archived_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useWhiteboards() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['whiteboards', currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<Whiteboard[]> => {
      const { data, error } = await supabase
        .from('whiteboards')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .is('archived_at', null)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Whiteboard[];
    },
  });
}

export function useWhiteboard(id: string | undefined) {
  return useQuery({
    queryKey: ['whiteboard', id],
    enabled: !!id,
    queryFn: async (): Promise<Whiteboard | null> => {
      const { data, error } = await supabase
        .from('whiteboards').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as unknown as Whiteboard | null;
    },
  });
}

export function useCreateWhiteboard() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { name?: string }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const { data, error } = await supabase
        .from('whiteboards')
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name ?? 'Adsız pano',
          elements: [] as never,
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })
        .select().single();
      if (error) throw error;
      return data as unknown as Whiteboard;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whiteboards'] }),
  });
}

export function useUpdateWhiteboard() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Whiteboard> & { id: string }) => {
      const p: Record<string, unknown> = { ...patch, updated_by: user?.id ?? null };
      if (patch.elements) p.elements = patch.elements as unknown;
      const { data, error } = await supabase
        .from('whiteboards').update(p as never).eq('id', id).select().single();
      if (error) throw error;
      return data as unknown as Whiteboard;
    },
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: ['whiteboards'] });
      qc.invalidateQueries({ queryKey: ['whiteboard', b.id] });
    },
  });
}

export function useDeleteWhiteboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('whiteboards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whiteboards'] }),
  });
}
