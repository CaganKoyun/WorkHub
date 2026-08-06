import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export type TokenScope = 'read' | 'write' | 'admin';

export interface ApiToken {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  token_prefix: string;
  token_hash: string;
  scopes: TokenScope[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export const SCOPE_LABELS: Record<TokenScope, string> = {
  read: 'Okuma',
  write: 'Yazma',
  admin: 'Admin',
};

export function useApiTokens() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['api-tokens', currentWorkspace?.id, user?.id],
    enabled: !!currentWorkspace?.id && !!user?.id,
    queryFn: async (): Promise<ApiToken[]> => {
      const { data, error } = await supabase
        .from('api_tokens')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApiToken[];
    },
  });
}

export function useCreateApiToken() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { name: string; scopes: TokenScope[]; expires_at?: string | null }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const { data, error } = await supabase.rpc('create_api_token', {
        _workspace_id: currentWorkspace.id,
        _name: input.name,
        _scopes: input.scopes,
        _expires_at: input.expires_at ?? undefined,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as { id: string; token: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-tokens'] }),
  });
}

export function useRevokeApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase.rpc('revoke_api_token', { _token_id: tokenId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-tokens'] }),
  });
}

export function useDeleteApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('api_tokens').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-tokens'] }),
  });
}
