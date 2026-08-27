import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface Doc {
  id: string;
  workspace_id: string;
  parent_id: string | null;
  title: string;
  body: string;
  icon: string | null;
  position: number;
  archived_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useDocs() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['docs', currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<Doc[]> => {
      const { data, error } = await supabase
        .from('docs')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .is('archived_at', null)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Doc[];
    },
  });
}

export function useDoc(id: string | undefined) {
  return useQuery({
    queryKey: ['doc', id],
    enabled: !!id,
    queryFn: async (): Promise<Doc | null> => {
      const { data, error } = await supabase
        .from('docs').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as Doc | null;
    },
  });
}

export function useCreateDoc() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { parent_id?: string | null; title?: string; icon?: string | null }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const { data, error } = await supabase
        .from('docs')
        .insert({
          workspace_id: currentWorkspace.id,
          parent_id: input.parent_id ?? null,
          title: input.title ?? 'Adsız sayfa',
          icon: input.icon ?? null,
          body: '',
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })
        .select().single();
      if (error) throw error;
      return data as Doc;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs'] }),
  });
}

export function useUpdateDoc() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Doc> & { id: string }) => {
      const { data, error } = await supabase
        .from('docs')
        .update({ ...patch, updated_by: user?.id ?? null })
        .eq('id', id)
        .select().single();
      if (error) throw error;
      return data as Doc;
    },
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ['docs'] });
      qc.invalidateQueries({ queryKey: ['doc', doc.id] });
    },
  });
}

export function useDeleteDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('docs').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docs'] }),
  });
}

/** Group docs by parent_id into a tree structure for rendering. */
export interface DocNode extends Doc {
  children: DocNode[];
}

export function buildDocTree(docs: Doc[]): DocNode[] {
  const byId = new Map<string, DocNode>();
  docs.forEach(d => byId.set(d.id, { ...d, children: [] }));
  const roots: DocNode[] = [];
  byId.forEach(n => {
    if (n.parent_id && byId.has(n.parent_id)) {
      byId.get(n.parent_id)!.children.push(n);
    } else {
      roots.push(n);
    }
  });
  return roots;
}
