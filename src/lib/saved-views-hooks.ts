import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export type ViewTarget = 'issues' | 'tasks' | 'bugs' | 'projects';

export interface ViewFilters {
  status?: string[];
  priority?: string[];
  assignee_ids?: string[];
  project_ids?: string[];
  tags?: string[];
  search?: string;
}

export interface ViewSort {
  field?: string;
  dir?: 'asc' | 'desc';
}

export interface SavedView {
  id: string;
  workspace_id: string;
  owner_id: string;
  target: ViewTarget;
  name: string;
  description: string | null;
  filters: ViewFilters;
  sort: ViewSort;
  group_by: string | null;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export const TARGET_LABELS: Record<ViewTarget, string> = {
  issues: 'Issues',
  tasks: 'Tasks',
  bugs: 'Buglar',
  projects: 'Projeler',
};

export const TARGET_PATH: Record<ViewTarget, string> = {
  issues: '/issues',
  tasks: '/tasks',
  bugs: '/bugs',
  projects: '/projects',
};

export function useSavedViews(target?: ViewTarget) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['saved-views', currentWorkspace?.id, target],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<SavedView[]> => {
      let q = supabase.from('saved_views').select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .order('created_at', { ascending: false });
      if (target) q = q.eq('target', target);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as SavedView[];
    },
  });
}

export function useFavoriteViewIds() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['saved-view-favorites', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from('saved_view_favorites')
        .select('view_id')
        .eq('user_id', user!.id);
      if (error) throw error;
      return new Set((data ?? []).map((r: { view_id: string }) => r.view_id));
    },
  });
}

export function useCreateSavedView() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      target: ViewTarget; name: string; description?: string;
      filters?: ViewFilters; sort?: ViewSort;
      group_by?: string; is_shared?: boolean;
    }) => {
      if (!currentWorkspace || !user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('saved_views')
        .insert({
          workspace_id: currentWorkspace.id,
          owner_id: user.id,
          target: input.target,
          name: input.name,
          description: input.description ?? null,
          filters: (input.filters ?? {}) as never,
          sort: (input.sort ?? {}) as never,
          group_by: input.group_by ?? null,
          is_shared: input.is_shared ?? false,
        })
        .select().single();
      if (error) throw error;
      return data as unknown as SavedView;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-views'] }),
  });
}

export function useUpdateSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<SavedView> & { id: string }) => {
      const p: Record<string, unknown> = { ...patch };
      if (patch.filters) p.filters = patch.filters as unknown;
      if (patch.sort) p.sort = patch.sort as unknown;
      const { data, error } = await supabase
        .from('saved_views').update(p as never).eq('id', id).select().single();
      if (error) throw error;
      return data as unknown as SavedView;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-views'] }),
  });
}

export function useDeleteSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_views').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-views'] }),
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ viewId, isFav }: { viewId: string; isFav: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      if (isFav) {
        const { error } = await supabase.from('saved_view_favorites').delete()
          .eq('view_id', viewId).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('saved_view_favorites').insert({
          view_id: viewId, user_id: user.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-view-favorites'] }),
  });
}

/** Serialize filters into URL query string for target page. */
export function viewToUrl(view: SavedView): string {
  const params = new URLSearchParams();
  const f = view.filters;
  if (f.status && f.status.length) params.set('status', f.status.join(','));
  if (f.priority && f.priority.length) params.set('priority', f.priority.join(','));
  if (f.assignee_ids && f.assignee_ids.length) params.set('assignee', f.assignee_ids.join(','));
  if (f.project_ids && f.project_ids.length) params.set('project', f.project_ids.join(','));
  if (f.tags && f.tags.length) params.set('tags', f.tags.join(','));
  if (f.search) params.set('q', f.search);
  if (view.sort.field) params.set('sort', `${view.sort.field}:${view.sort.dir ?? 'asc'}`);
  if (view.group_by) params.set('group', view.group_by);
  params.set('view', view.id);
  const qs = params.toString();
  return `${TARGET_PATH[view.target]}${qs ? '?' + qs : ''}`;
}
