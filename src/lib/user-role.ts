import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'manager' | 'user';

export function useUserRole() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user-role', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AppRole> => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user!.id);
      const roles = (data ?? []).map(r => r.role as string);
      if (roles.includes('admin')) return 'admin';
      if (roles.includes('manager')) return 'manager';
      return 'user';
    },
  });
}

export function canCreateProject(role?: AppRole) {
  return role === 'admin' || role === 'manager';
}
