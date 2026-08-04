import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { extractKeywords } from '@/lib/precedent-utils';
import type {
  Approval, ApprovalKind, ApprovalPriority, ApprovalStatus,
  Decision, Goal, LinkableType, ObjectLink, Risk,
} from './graph-types';

/* ============ OBJECT LINKS ============ */

export function useObjectLinks(type?: LinkableType, id?: string) {
  return useQuery({
    queryKey: ['object-links', type, id],
    enabled: !!type && !!id,
    queryFn: async (): Promise<ObjectLink[]> => {
      const orFilter = `and(from_type.eq.${type},from_id.eq.${id}),and(to_type.eq.${type},to_id.eq.${id})`;
      const { data, error } = await supabase
        .from('object_links')
        .select('*')
        .or(orFilter)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ObjectLink[];
    },
  });
}

export function useCreateObjectLink() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      from_type: LinkableType; from_id: string;
      to_type: LinkableType; to_id: string;
      link_kind?: string; note?: string;
    }) => {
      const { data, error } = await supabase
        .from('object_links')
        .insert({
          ...input,
          link_kind: input.link_kind ?? 'related',
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ObjectLink;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['object-links', vars.from_type, vars.from_id] });
      qc.invalidateQueries({ queryKey: ['object-links', vars.to_type, vars.to_id] });
    },
  });
}

export function useDeleteObjectLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('object_links').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['object-links'] }),
  });
}

/* ============ APPROVALS (Founder Inbox) ============ */

/** 'resolved' = approved + rejected birleşik görünümü (Inbox sekmesi). */
export type ApprovalFilter = ApprovalStatus | 'all' | 'resolved';

export function useApprovals(filters?: { status?: ApprovalFilter; assigned_to_me?: boolean }) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['approvals', filters, user?.id],
    queryFn: async (): Promise<Approval[]> => {
      let q = supabase.from('approvals').select('*').order('created_at', { ascending: false });
      const nowIso = new Date().toISOString();
      if (filters?.status && filters.status !== 'all') {
        if (filters.status === 'pending') {
          // Süresi dolan snooze'lar cron beklemeden kuyruğa geri düşer
          q = q.or(`status.eq.pending,and(status.eq.snoozed,snooze_until.lte.${nowIso})`);
        } else if (filters.status === 'snoozed') {
          q = q.eq('status', 'snoozed').gt('snooze_until', nowIso);
        } else if (filters.status === 'resolved') {
          q = q.in('status', ['approved', 'rejected']);
        } else {
          q = q.eq('status', filters.status);
        }
      }
      if (filters?.assigned_to_me && user) q = q.eq('assigned_to', user.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Approval[];
    },
  });
}

export function useApprovalCounts() {
  return useQuery({
    queryKey: ['approval-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('approvals').select('status,priority,snooze_until');
      if (error) throw error;
      const rows = (data ?? []) as { status: ApprovalStatus; priority: ApprovalPriority; snooze_until: string | null }[];
      const nowIso = new Date().toISOString();
      // Badge, aktif snooze'lananları SAYMAZ; süresi dolanlar pending sayılır
      const isPending = (r: { status: ApprovalStatus; snooze_until: string | null }) =>
        r.status === 'pending' ||
        (r.status === 'snoozed' && !!r.snooze_until && r.snooze_until <= nowIso);
      return {
        pending: rows.filter(isPending).length,
        urgent: rows.filter(r => isPending(r) && r.priority === 'urgent').length,
        total: rows.length,
      };
    },
  });
}

/** Aktif workspace üyeleri (devretme seçici için, isimleriyle). */
export function useWorkspaceMembers() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['workspace-members', currentWorkspace?.id],
    enabled: !!currentWorkspace,
    queryFn: async (): Promise<{ user_id: string; full_name: string | null; role: string; approval_limit: number | null }[]> => {
      const { data: members, error } = await supabase
        .from('workspace_members')
        .select('user_id,role,approval_limit')
        .eq('workspace_id', currentWorkspace!.id)
        .eq('is_active', true);
      if (error) throw error;
      const ids = (members ?? []).map(m => m.user_id);
      if (ids.length === 0) return [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id,full_name')
        .in('user_id', ids);
      const names = new Map((profiles ?? []).map(p => [p.user_id, p.full_name]));
      return (members ?? []).map(m => ({
        user_id: m.user_id,
        full_name: names.get(m.user_id) ?? null,
        role: m.role,
        approval_limit: m.approval_limit,
      }));
    },
  });
}

/** Onayı bir workspace üyesine devret (status=delegated + assigned_to). */
export function useDelegateApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; userId: string }) => {
      const { data, error } = await supabase
        .from('approvals')
        .update({ status: 'delegated', assigned_to: input.userId } as never)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as Approval;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['approval-counts'] });
    },
  });
}

export function useCreateApproval() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      kind: ApprovalKind; title: string; summary?: string;
      amount?: number | null; currency?: string;
      priority?: ApprovalPriority; assigned_to?: string | null;
      resource_type?: string | null; resource_id?: string | null;
      due_at?: string | null; context?: Record<string, unknown>;
    }) => {
      const row = {
        kind: input.kind,
        title: input.title,
        summary: input.summary ?? null,
        amount: input.amount ?? null,
        currency: input.currency ?? 'USD',
        priority: input.priority ?? 'normal',
        assigned_to: input.assigned_to ?? null,
        resource_type: input.resource_type ?? null,
        resource_id: input.resource_id ?? null,
        due_at: input.due_at ?? null,
        context: (input.context ?? {}) as never,
        requested_by: user?.id ?? null,
      };
      const { data, error } = await supabase
        .from('approvals')
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data as Approval;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['approval-counts'] });
    },
  });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; status: ApprovalStatus; note?: string; snooze_until?: string | null }) => {
      const patch: Partial<Approval> = {
        status: input.status,
        decision_note: input.note ?? null,
        snooze_until: input.snooze_until ?? null,
      };
      if (input.status === 'approved' || input.status === 'rejected') {
        patch.decided_by = user?.id ?? null;
        patch.decided_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from('approvals')
        .update(patch as never)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as Approval;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['approval-counts'] });
    },
  });
}

/* ============ GOALS / RISKS / DECISIONS ============ */

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase.from('goals').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Goal[];
    },
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Goal> & { title: string }) => {
      const { data, error } = await supabase
        .from('goals')
        .insert({ ...input, created_by: user?.id ?? null })
        .select().single();
      if (error) throw error;
      return data as Goal;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useRisks() {
  return useQuery({
    queryKey: ['risks'],
    queryFn: async (): Promise<Risk[]> => {
      const { data, error } = await supabase.from('risks').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Risk[];
    },
  });
}

export function useCreateRisk() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Risk> & { title: string }) => {
      const { data, error } = await supabase
        .from('risks')
        .insert({ ...input, created_by: user?.id ?? null })
        .select().single();
      if (error) throw error;
      return data as Risk;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks'] }),
  });
}

export function useDecisions() {
  return useQuery({
    queryKey: ['decisions'],
    queryFn: async (): Promise<Decision[]> => {
      const { data, error } = await supabase.from('decisions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Decision[];
    },
  });
}

export function useCreateDecision() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Decision> & { title: string }) => {
      // state_snapshot is owned by the DB trigger — never written from the client
      const { state_snapshot: _ignored, ...rest } = input;
      const { data, error } = await supabase
        .from('decisions')
        .insert({ ...rest, created_by: user?.id ?? null })
        .select().single();
      if (error) throw error;
      return data as unknown as Decision;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decisions'] }),
  });
}

/**
 * Şirketin ŞU ANKİ durumu (Karar Tekrarı için). Karar anındaki snapshot'la
 * aynı RPC'den gelir; sertleştirilmiş build_company_snapshot üyelik ister,
 * üye değilse NULL döner.
 */
export function useCurrentSnapshot(enabled = true) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ['current-snapshot', currentWorkspace?.id],
    enabled: enabled && !!currentWorkspace,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, unknown> | null> => {
      const { data, error } = await supabase.rpc('build_company_snapshot', {
        _ws: currentWorkspace!.id,
      });
      if (error) throw error;
      return (data as unknown as Record<string, unknown>) ?? null;
    },
  });
}

/** F5 — Emsal: başlık kelimelerine göre benzer geçmiş kararlar. */
export function useSimilarDecisions(title: string) {
  const keywords = extractKeywords(title);
  return useQuery({
    queryKey: ['similar-decisions', keywords],
    enabled: keywords.length > 0,
    staleTime: 30_000,
    queryFn: async (): Promise<Decision[]> => {
      const orFilter = keywords.map((k) => `title.ilike.%${k}%`).join(',');
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .or(orFilter)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as unknown as Decision[];
    },
  });
}

export function useDecision(id: string | undefined) {
  return useQuery({
    queryKey: ['decision', id],
    enabled: !!id,
    queryFn: async (): Promise<Decision | null> => {
      const { data, error } = await supabase
        .from('decisions').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return (data as unknown as Decision) ?? null;
    },
  });
}

export function useUpdateDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Decision> & { id: string }) => {
      const { state_snapshot: _ignored, ...rest } = patch;
      const { data, error } = await supabase
        .from('decisions')
        .update(rest)
        .eq('id', id)
        .select().single();
      if (error) throw error;
      return data as unknown as Decision;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['decisions'] });
      qc.invalidateQueries({ queryKey: ['decision', d.id] });
    },
  });
}

/** Yeniden açılış kuyruğu: vadesi gelmiş, hükmü girilmemiş kararlar. */
export function useReviewQueue() {
  return useQuery({
    queryKey: ['decisions', 'review-queue'],
    queryFn: async (): Promise<Decision[]> => {
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .eq('status', 'decided')
        .is('verdict', null)
        .not('review_at', 'is', null)
        .lte('review_at', new Date().toISOString())
        .order('review_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Decision[];
    },
  });
}

/* ============ COMPANY PULSE METRICS ============ */

export interface CompanyPulse {
  activeProjects: number;
  totalProjects: number;
  openTasks: number;
  overdueTasks: number;
  criticalBugs: number;
  openBugs: number;
  totalEmployees: number;
  pendingApprovals: number;
  urgentApprovals: number;
  openRisks: number;
  criticalRisks: number;
  activeGoals: number;
  onTrackGoals: number;
}

export function useCompanyPulse() {
  return useQuery({
    queryKey: ['company-pulse'],
    queryFn: async (): Promise<CompanyPulse> => {
      const today = new Date().toISOString().slice(0, 10);
      const [projects, tasks, bugs, employees, approvals, risks, goals] = await Promise.all([
        supabase.from('projects').select('status'),
        supabase.from('tasks').select('status,due_date'),
        supabase.from('bugs').select('status,severity'),
        supabase.from('employees').select('id'),
        supabase.from('approvals').select('status,priority'),
        supabase.from('risks').select('status,level'),
        supabase.from('goals').select('status'),
      ]);

      const projRows = (projects.data ?? []) as { status: string }[];
      const taskRows = (tasks.data ?? []) as { status: string; due_date: string | null }[];
      const bugRows = (bugs.data ?? []) as { status: string; severity: string }[];
      const approvalRows = (approvals.data ?? []) as { status: string; priority: string }[];
      const riskRows = (risks.data ?? []) as { status: string; level: string }[];
      const goalRows = (goals.data ?? []) as { status: string }[];

      return {
        activeProjects: projRows.filter(p => p.status === 'active').length,
        totalProjects: projRows.length,
        openTasks: taskRows.filter(t => t.status !== 'done').length,
        overdueTasks: taskRows.filter(t => t.status !== 'done' && t.due_date && t.due_date < today).length,
        criticalBugs: bugRows.filter(b => b.status !== 'closed' && (b.severity === 'critical' || b.severity === 'high')).length,
        openBugs: bugRows.filter(b => b.status !== 'closed').length,
        totalEmployees: (employees.data ?? []).length,
        pendingApprovals: approvalRows.filter(a => a.status === 'pending').length,
        urgentApprovals: approvalRows.filter(a => a.status === 'pending' && a.priority === 'urgent').length,
        openRisks: riskRows.filter(r => r.status === 'open' || r.status === 'mitigating').length,
        criticalRisks: riskRows.filter(r => (r.status === 'open' || r.status === 'mitigating') && r.level === 'critical').length,
        activeGoals: goalRows.filter(g => g.status !== 'archived' && g.status !== 'missed' && g.status !== 'achieved').length,
        onTrackGoals: goalRows.filter(g => g.status === 'on_track').length,
      };
    },
  });
}
