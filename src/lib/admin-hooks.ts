import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export type PlanTier = 'free' | 'pro' | 'business';

export interface WorkspaceBilling {
  workspace_id: string;
  plan: PlanTier;
  seat_limit: number;
  status: 'active' | 'past_due' | 'canceled';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  updated_at: string;
}

export interface AdminSummary {
  seats_used: number;
  storage_bytes: number;
  automation_runs_24h: number;
  email_queue_pending: number;
}

export const PLAN_META: Record<PlanTier, { label: string; seats: number; price: string; tint: string }> = {
  free:     { label: 'Free',     seats: 3,   price: '$0',       tint: 'bg-secondary text-muted-foreground' },
  pro:      { label: 'Pro',      seats: 10,  price: '$12/user', tint: 'bg-primary/15 text-primary ring-1 ring-primary/30' },
  business: { label: 'Business', seats: 50,  price: '$24/user', tint: 'bg-info/15 text-info ring-1 ring-info/30' },
};

export function useBilling() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['billing', currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<WorkspaceBilling | null> => {
      const { data, error } = await (supabase as any)
        .from('workspace_billing')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .maybeSingle();
      if (error) throw error;
      return data as WorkspaceBilling | null;
    },
  });
}

export function useAdminSummary() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['admin-summary', currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async (): Promise<AdminSummary> => {
      const { data, error } = await (supabase as any)
        .rpc('workspace_admin_summary', { _ws: currentWorkspace!.id });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? { seats_used: 0, storage_bytes: 0, automation_runs_24h: 0, email_queue_pending: 0 }) as AdminSummary;
    },
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (input: { plan: PlanTier; seat_limit?: number }) => {
      if (!currentWorkspace) throw new Error('No workspace');
      const seatLimit = input.seat_limit ?? PLAN_META[input.plan].seats;
      const { data, error } = await (supabase as any)
        .from('workspace_billing')
        .update({
          plan: input.plan,
          seat_limit: seatLimit,
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', currentWorkspace.id)
        .select().single();
      if (error) throw error;
      return data as WorkspaceBilling;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  });
}
