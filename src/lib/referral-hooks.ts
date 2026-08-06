import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';

export interface Referral {
  id: string;
  workspace_id: string;
  referrer_id: string;
  code: string;
  referred_email: string | null;
  referred_user_id: string | null;
  status: 'pending' | 'signed_up' | 'activated' | 'rewarded';
  reward_type: string | null;
  reward_granted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralStats {
  totalSent: number;
  signedUp: number;
  activated: number;
  conversionRate: number;
}

const db = () => supabase.from('referrals' as any);

export function useMyReferralCode() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  return useQuery({
    queryKey: ['referral-code', currentWorkspace?.id, user?.id],
    enabled: !!currentWorkspace && !!user,
    queryFn: async () => {
      const { data } = await db()
        .select('code')
        .eq('workspace_id', currentWorkspace!.id)
        .eq('referrer_id', user!.id)
        .limit(1)
        .maybeSingle();
      return (data as any)?.code as string | null;
    },
  });
}

export function useReferrals() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['referrals', currentWorkspace?.id],
    enabled: !!currentWorkspace,
    queryFn: async () => {
      const { data, error } = await db()
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Referral[];
    },
  });
}

export function useReferralStats(): ReferralStats {
  const { data: referrals } = useReferrals();
  const all = referrals ?? [];
  const totalSent = all.length;
  const signedUp = all.filter(r => r.status === 'signed_up' || r.status === 'activated' || r.status === 'rewarded').length;
  const activated = all.filter(r => r.status === 'activated' || r.status === 'rewarded').length;
  const conversionRate = totalSent > 0 ? Math.round((signedUp / totalSent) * 100) : 0;
  return { totalSent, signedUp, activated, conversionRate };
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'WH-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function useCreateReferral() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (email?: string) => {
      const { data, error } = await db()
        .insert({
          workspace_id: currentWorkspace!.id,
          referrer_id: user!.id,
          code: generateCode(),
          referred_email: email?.trim() || null,
          status: 'pending',
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Referral;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['referrals'] });
      qc.invalidateQueries({ queryKey: ['referral-code'] });
    },
  });
}
