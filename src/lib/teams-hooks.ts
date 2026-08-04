import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type {
  Team, WorkspaceMember, WorkspaceInvitation, WorkspaceRole,
} from './teams-types';

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------
export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async (): Promise<Team[]> => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('is_archived', false)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Team[];
    },
  });
}

export function useTeam(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team', teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<Team | null> => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId!)
        .maybeSingle();
      if (error) throw error;
      return data as Team | null;
    },
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; color?: string; lead_user_id?: string | null }) => {
      if (!currentWorkspace) throw new Error('Aktif workspace yok');
      const { data, error } = await supabase
        .from('teams')
        .insert({
          workspace_id: currentWorkspace.id,
          name: input.name,
          description: input.description ?? null,
          color: input.color ?? '#10b981',
          lead_user_id: input.lead_user_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Team;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Team> & { id: string }) => {
      const { data, error } = await supabase
        .from('teams')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Team;
    },
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['team', t.id] });
    },
  });
}

// ---------------------------------------------------------------------------
// Workspace Members
// ---------------------------------------------------------------------------
export function useWorkspaceMembers() {
  return useQuery({
    queryKey: ['workspace-members'],
    queryFn: async (): Promise<WorkspaceMember[]> => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('is_active', true)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WorkspaceMember[];
    },
  });
}

export function useTeamMembers(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-members', teamId],
    enabled: !!teamId,
    queryFn: async (): Promise<WorkspaceMember[]> => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('team_id', teamId!)
        .eq('is_active', true);
      if (error) throw error;
      return (data ?? []) as WorkspaceMember[];
    },
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: WorkspaceRole }) => {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace-members'] });
    },
  });
}

export function useAssignMemberToTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ member_id, team_id }: { member_id: string; team_id: string | null }) => {
      const { error } = await supabase
        .from('workspace_members')
        .update({ team_id })
        .eq('id', member_id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['workspace-members'] });
      if (v.team_id) qc.invalidateQueries({ queryKey: ['team-members', v.team_id] });
    },
  });
}

export function useDeactivateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workspace_members')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-members'] }),
  });
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------
export function useWorkspaceInvitations() {
  return useQuery({
    queryKey: ['workspace-invitations'],
    queryFn: async (): Promise<WorkspaceInvitation[]> => {
      const { data, error } = await supabase
        .from('workspace_invitations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkspaceInvitation[];
    },
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { email: string; role?: WorkspaceRole }) => {
      if (!currentWorkspace) throw new Error('Aktif workspace yok');
      if (!user) throw new Error('Giriş gerekli');
      const { data, error } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: currentWorkspace.id,
          email: input.email.trim().toLowerCase(),
          role: input.role ?? 'member',
          invited_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as WorkspaceInvitation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-invitations'] }),
  });
}

export function useRevokeInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workspace_invitations')
        .update({ status: 'revoked' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-invitations'] }),
  });
}
