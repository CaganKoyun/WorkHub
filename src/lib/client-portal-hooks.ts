import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface ClientPortal {
  id: string;
  workspace_id: string;
  name: string;
  client_email: string;
  token: string;
  project_ids: string[];
  can_comment: boolean;
  expires_at: string | null;
  revoked_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalGrant {
  id: string;
  name: string;
  client_email: string;
  project_ids: string[];
  can_comment: boolean;
  workspace_id: string;
}

export interface PortalProject {
  id: string;
  name: string;
  status: string;
  description: string | null;
}

export interface PortalTask {
  id: string;
  tracking_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  project_id: string;
  project_name: string;
}

export interface PortalComment {
  id: string;
  guest_email: string;
  guest_name: string | null;
  body: string;
  created_at: string;
}

function randToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return 'cp_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---- Admin hooks (workspace side) ---------------------------------------

export function useClientPortals() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['client-portals', currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<ClientPortal[]> => {
      const { data, error } = await supabase
        .from('client_portals')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientPortal[];
    },
  });
}

export function useCreateClientPortal() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: {
      name: string; client_email: string;
      project_ids: string[]; can_comment?: boolean; expires_at?: string | null;
    }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const { data, error } = await supabase
        .from('client_portals')
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name,
          client_email: input.client_email,
          token: randToken(),
          project_ids: input.project_ids,
          can_comment: input.can_comment ?? true,
          expires_at: input.expires_at ?? null,
          created_by: user?.id ?? null,
        })
        .select().single();
      if (error) throw error;
      return data as ClientPortal;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-portals'] }),
  });
}

export function useUpdateClientPortal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<ClientPortal> & { id: string }) => {
      const { data, error } = await supabase
        .from('client_portals').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data as ClientPortal;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-portals'] }),
  });
}

export function useDeleteClientPortal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('client_portals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['client-portals'] }),
  });
}

// ---- Public hooks (guest side, anon-safe) --------------------------------

export function usePortalGrant(token: string | undefined) {
  return useQuery({
    queryKey: ['portal-grant', token],
    enabled: !!token,
    queryFn: async (): Promise<PortalGrant | null> => {
      const { data, error } = await supabase.rpc('portal_get', { _token: token! });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as PortalGrant | null;
    },
  });
}

export function usePortalProjects(token: string | undefined) {
  return useQuery({
    queryKey: ['portal-projects', token],
    enabled: !!token,
    queryFn: async (): Promise<PortalProject[]> => {
      const { data, error } = await supabase.rpc('portal_projects', { _token: token! });
      if (error) throw error;
      return (data ?? []) as PortalProject[];
    },
  });
}

export function usePortalTasks(token: string | undefined, projectId: string | null) {
  return useQuery({
    queryKey: ['portal-tasks', token, projectId],
    enabled: !!token,
    queryFn: async (): Promise<PortalTask[]> => {
      const { data, error } = await supabase.rpc('portal_tasks', {
        _token: token!,
        _project_id: projectId ?? undefined,
      });
      if (error) throw error;
      return (data ?? []) as PortalTask[];
    },
  });
}

export function usePortalTaskComments(token: string | undefined, taskId: string | null) {
  return useQuery({
    queryKey: ['portal-comments', token, taskId],
    enabled: !!token && !!taskId,
    queryFn: async (): Promise<PortalComment[]> => {
      const { data, error } = await supabase.rpc('portal_task_comments', {
        _token: token!, _task_id: taskId!,
      });
      if (error) throw error;
      return (data ?? []) as PortalComment[];
    },
  });
}

export function usePortalPostComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { token: string; task_id: string; body: string; guest_name?: string }) => {
      const { error } = await supabase.rpc('portal_post_comment', {
        _token: input.token,
        _task_id: input.task_id,
        _body: input.body,
        _guest_name: input.guest_name ?? undefined,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['portal-comments', v.token, v.task_id] });
    },
  });
}
