import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  CrmCompany, CrmContact, CrmContract, CrmCustomer, CrmOpportunity,
  CrmPipeline, CrmPipelineStage, CrmQuote, CrmQuoteItem, CrmSubscription,
  CrmActivity, CrmForecastCategory,
} from './crm-types';

/* ============ COMPANIES ============ */
export function useCrmCompanies(search?: string) {
  return useQuery({
    queryKey: ['crm-companies', search ?? ''],
    queryFn: async (): Promise<CrmCompany[]> => {
      let q = supabase.from('crm_companies').select('*').eq('is_archived', false).order('updated_at', { ascending: false });
      if (search) q = q.ilike('name', `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CrmCompany[];
    },
  });
}

export function useCrmCompany(id?: string) {
  return useQuery({
    queryKey: ['crm-company', id],
    enabled: !!id,
    queryFn: async (): Promise<CrmCompany | null> => {
      const { data, error } = await supabase.from('crm_companies').select('*').eq('id', id!).maybeSingle();
      if (error) throw error;
      return data as CrmCompany | null;
    },
  });
}

export function useCreateCrmCompany() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<CrmCompany> & { name: string }) => {
      const { data, error } = await supabase
        .from('crm_companies')
        .insert({ ...input, created_by: user?.id ?? null, owner_id: input.owner_id ?? user?.id ?? null })
        .select().single();
      if (error) throw error;
      return data as CrmCompany;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-companies'] }),
  });
}

export function useUpdateCrmCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CrmCompany> & { id: string }) => {
      const { data, error } = await supabase.from('crm_companies').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data as CrmCompany;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['crm-companies'] });
      qc.invalidateQueries({ queryKey: ['crm-company', v.id] });
    },
  });
}

// Duplicate company detection — CRM-007
export function useDuplicateCompanies(name?: string, domain?: string | null) {
  return useQuery({
    queryKey: ['crm-dup-companies', name, domain],
    enabled: !!(name && name.length >= 2) || !!domain,
    queryFn: async (): Promise<CrmCompany[]> => {
      const filters: string[] = [];
      if (name) filters.push(`name.ilike.%${name}%`);
      if (domain) filters.push(`domain.ilike.%${domain}%`);
      const { data, error } = await supabase
        .from('crm_companies')
        .select('*')
        .or(filters.join(','))
        .limit(5);
      if (error) throw error;
      return (data ?? []) as CrmCompany[];
    },
  });
}

/* ============ CONTACTS ============ */
export function useCrmContacts(companyId?: string) {
  return useQuery({
    queryKey: ['crm-contacts', companyId ?? 'all'],
    queryFn: async (): Promise<CrmContact[]> => {
      let q = supabase.from('crm_contacts').select('*').order('updated_at', { ascending: false });
      if (companyId) q = q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CrmContact[];
    },
  });
}

export function useCreateCrmContact() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<CrmContact>) => {
      const { data, error } = await supabase
        .from('crm_contacts')
        .insert({ ...input, created_by: user?.id ?? null, owner_id: input.owner_id ?? user?.id ?? null })
        .select().single();
      if (error) throw error;
      return data as CrmContact;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-contacts'] }),
  });
}

// Duplicate contact detection — CRM-007
export function useDuplicateContacts(email?: string | null) {
  return useQuery({
    queryKey: ['crm-dup-contacts', email],
    enabled: !!email,
    queryFn: async (): Promise<CrmContact[]> => {
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .ilike('email', email!)
        .limit(5);
      if (error) throw error;
      return (data ?? []) as CrmContact[];
    },
  });
}

/* ============ PIPELINES ============ */
export function useCrmPipelines() {
  return useQuery({
    queryKey: ['crm-pipelines'],
    queryFn: async (): Promise<CrmPipeline[]> => {
      const { data, error } = await supabase.from('crm_pipelines').select('*').eq('is_archived', false).order('is_default', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CrmPipeline[];
    },
  });
}

export function useCrmStages(pipelineId?: string) {
  return useQuery({
    queryKey: ['crm-stages', pipelineId ?? 'all'],
    enabled: !!pipelineId,
    queryFn: async (): Promise<CrmPipelineStage[]> => {
      const { data, error } = await supabase.from('crm_pipeline_stages').select('*').eq('pipeline_id', pipelineId!).order('position');
      if (error) throw error;
      return (data ?? []) as CrmPipelineStage[];
    },
  });
}

/* ============ OPPORTUNITIES ============ */
export function useCrmOpportunities(filters?: { pipelineId?: string; ownerId?: string; status?: string }) {
  return useQuery({
    queryKey: ['crm-opps', filters],
    queryFn: async (): Promise<CrmOpportunity[]> => {
      let q = supabase.from('crm_opportunities').select('*').order('updated_at', { ascending: false });
      if (filters?.pipelineId) q = q.eq('pipeline_id', filters.pipelineId);
      if (filters?.ownerId) q = q.eq('owner_id', filters.ownerId);
      if (filters?.status) q = q.eq('status', filters.status as CrmOpportunity['status']);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CrmOpportunity[];
    },
  });
}

export function useCreateCrmOpportunity() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<CrmOpportunity> & { name: string; pipeline_id: string; stage_id: string }) => {
      const { data, error } = await supabase
        .from('crm_opportunities')
        .insert({
          ...input,
          created_by: user?.id ?? null,
          owner_id: input.owner_id ?? user?.id ?? null,
          amount_base: input.amount_base ?? (input.amount ?? 0) * (input.fx_rate ?? 1),
        })
        .select().single();
      if (error) throw error;
      return data as CrmOpportunity;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-opps'] });
      qc.invalidateQueries({ queryKey: ['crm-forecast'] });
    },
  });
}

export function useUpdateCrmOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CrmOpportunity> & { id: string }) => {
      const { data, error } = await supabase.from('crm_opportunities').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data as CrmOpportunity;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-opps'] });
      qc.invalidateQueries({ queryKey: ['crm-forecast'] });
    },
  });
}

// Move opportunity to a stage (kanban drag)
export function useMoveOpportunityStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage_id, probability, forecast_category }: {
      id: string; stage_id: string; probability?: number; forecast_category?: CrmForecastCategory;
    }) => {
      const patch: Record<string, unknown> = { stage_id };
      if (probability !== undefined) patch.probability = probability;
      if (forecast_category) patch.forecast_category = forecast_category;
      const { error } = await supabase.from('crm_opportunities').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-opps'] });
      qc.invalidateQueries({ queryKey: ['crm-forecast'] });
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['approvals-counts'] });
      qc.invalidateQueries({ queryKey: ['company-pulse'] });
    },
  });
}

// CRM-004 — stuck opportunities: past stage SLA
export function useStuckOpportunities() {
  return useQuery({
    queryKey: ['crm-stuck-opps'],
    queryFn: async () => {
      const [opps, stages] = await Promise.all([
        supabase.from('crm_opportunities').select('*').eq('status', 'open'),
        supabase.from('crm_pipeline_stages').select('*'),
      ]);
      if (opps.error) throw opps.error;
      if (stages.error) throw stages.error;
      const stageMap = new Map((stages.data ?? []).map(s => [s.id, s as CrmPipelineStage]));
      const now = Date.now();
      const stuck = ((opps.data ?? []) as CrmOpportunity[])
        .map(o => {
          const s = stageMap.get(o.stage_id);
          if (!s?.sla_days) return null;
          const days = Math.floor((now - new Date(o.stage_entered_at).getTime()) / 86400000);
          if (days <= s.sla_days) return null;
          return { opportunity: o, stage: s, daysInStage: days };
        })
        .filter(Boolean) as { opportunity: CrmOpportunity; stage: CrmPipelineStage; daysInStage: number }[];
      return stuck.sort((a, b) => b.daysInStage - a.daysInStage);
    },
  });
}

/* ============ ACTIVITIES ============ */
export function useCrmActivities(parent?: { opportunity_id?: string; company_id?: string; contact_id?: string }) {
  return useQuery({
    queryKey: ['crm-activities', parent],
    enabled: !!(parent?.opportunity_id || parent?.company_id || parent?.contact_id),
    queryFn: async (): Promise<CrmActivity[]> => {
      let q = supabase.from('crm_activities').select('*').order('occurred_at', { ascending: false }).limit(100);
      if (parent?.opportunity_id) q = q.eq('opportunity_id', parent.opportunity_id);
      else if (parent?.company_id) q = q.eq('company_id', parent.company_id);
      else if (parent?.contact_id) q = q.eq('contact_id', parent.contact_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CrmActivity[];
    },
  });
}

export function useCreateCrmActivity() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<CrmActivity> & { subject: string; kind: CrmActivity['kind'] }) => {
      const { data, error } = await supabase
        .from('crm_activities')
        .insert({ ...input, created_by: user?.id ?? null, performed_by: input.performed_by ?? user?.id ?? null })
        .select().single();
      if (error) throw error;
      return data as CrmActivity;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-activities'] });
      qc.invalidateQueries({ queryKey: ['crm-opps'] });
    },
  });
}

/* ============ QUOTES ============ */
export function useCrmQuotes(opportunityId?: string) {
  return useQuery({
    queryKey: ['crm-quotes', opportunityId ?? 'all'],
    queryFn: async (): Promise<CrmQuote[]> => {
      let q = supabase.from('crm_quotes').select('*').order('created_at', { ascending: false });
      if (opportunityId) q = q.eq('opportunity_id', opportunityId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CrmQuote[];
    },
  });
}

export function useCreateCrmQuote() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<CrmQuote>) => {
      const payload = { ...input, created_by: user?.id ?? null, owner_id: input.owner_id ?? user?.id ?? null } as never;
      const { data, error } = await supabase
        .from('crm_quotes')
        .insert(payload)
        .select().single();
      if (error) throw error;
      return data as CrmQuote;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-quotes'] }),
  });
}

export function useCrmQuoteItems(quoteId?: string) {
  return useQuery({
    queryKey: ['crm-quote-items', quoteId],
    enabled: !!quoteId,
    queryFn: async (): Promise<CrmQuoteItem[]> => {
      const { data, error } = await supabase.from('crm_quote_items').select('*').eq('quote_id', quoteId!).order('position');
      if (error) throw error;
      return (data ?? []) as CrmQuoteItem[];
    },
  });
}

/* ============ CONTRACTS ============ */
export function useCrmContracts() {
  return useQuery({
    queryKey: ['crm-contracts'],
    queryFn: async (): Promise<CrmContract[]> => {
      const { data, error } = await supabase.from('crm_contracts').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CrmContract[];
    },
  });
}

export function useCreateCrmContract() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<CrmContract> & { title: string }) => {
      const payload = { ...input, created_by: user?.id ?? null, owner_id: input.owner_id ?? user?.id ?? null } as never;
      const { data, error } = await supabase
        .from('crm_contracts')
        .insert(payload)
        .select().single();
      if (error) throw error;
      return data as CrmContract;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-contracts'] }),
  });
}

export function useUpdateCrmContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CrmContract> & { id: string }) => {
      const { data, error } = await supabase.from('crm_contracts').update(patch as never).eq('id', id).select().single();
      if (error) throw error;
      return data as CrmContract;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-contracts'] }),
  });
}

/* ============ CUSTOMERS ============ */
export function useCrmCustomers() {
  return useQuery({
    queryKey: ['crm-customers'],
    queryFn: async (): Promise<CrmCustomer[]> => {
      const { data, error } = await supabase.from('crm_customers').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CrmCustomer[];
    },
  });
}

export function useUpdateCrmCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CrmCustomer> & { id: string }) => {
      const { data, error } = await supabase.from('crm_customers').update({ ...patch, health_updated_at: patch.health ? new Date().toISOString() : undefined }).eq('id', id).select().single();
      if (error) throw error;
      return data as CrmCustomer;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['crm-customers'] }),
  });
}

/* ============ SUBSCRIPTIONS ============ */
export function useCrmSubscriptions(customerId?: string) {
  return useQuery({
    queryKey: ['crm-subs', customerId ?? 'all'],
    queryFn: async (): Promise<CrmSubscription[]> => {
      let q = supabase.from('crm_subscriptions').select('*').order('renewal_date', { ascending: true });
      if (customerId) q = q.eq('customer_id', customerId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CrmSubscription[];
    },
  });
}

/* ============ FORECAST ============ */
// CRM-005 — sales forecast, sliceable
export interface ForecastBucket {
  key: string;        // period key (yyyy-mm or yyyy-Qn)
  label: string;
  pipeline: number;
  best_case: number;
  commit: number;
  closed_won: number;
  closed_lost: number;
  count: number;
}

export function useCrmForecast(sliceBy: 'month' | 'quarter' = 'month') {
  return useQuery({
    queryKey: ['crm-forecast', sliceBy],
    queryFn: async (): Promise<ForecastBucket[]> => {
      const { data, error } = await supabase
        .from('crm_opportunities')
        .select('amount,amount_base,currency,forecast_category,expected_close_date,actual_close_date,status');
      if (error) throw error;
      const rows = (data ?? []) as Pick<CrmOpportunity, 'amount' | 'amount_base' | 'currency' | 'forecast_category' | 'expected_close_date' | 'actual_close_date' | 'status'>[];
      const buckets = new Map<string, ForecastBucket>();
      for (const r of rows) {
        const dateStr = r.actual_close_date || r.expected_close_date;
        if (!dateStr) continue;
        const d = new Date(dateStr);
        let key: string; let label: string;
        if (sliceBy === 'quarter') {
          const q = Math.floor(d.getMonth() / 3) + 1;
          key = `${d.getFullYear()}-Q${q}`;
          label = key;
        } else {
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          label = d.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
        }
        const b = buckets.get(key) ?? { key, label, pipeline: 0, best_case: 0, commit: 0, closed_won: 0, closed_lost: 0, count: 0 };
        const val = Number(r.amount_base ?? r.amount ?? 0);
        b.count += 1;
        if (r.forecast_category === 'pipeline') b.pipeline += val;
        else if (r.forecast_category === 'best_case') b.best_case += val;
        else if (r.forecast_category === 'commit') b.commit += val;
        else if (r.forecast_category === 'closed_won') b.closed_won += val;
        else if (r.forecast_category === 'closed_lost') b.closed_lost += val;
        buckets.set(key, b);
      }
      return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
    },
  });
}

// Aggregate revenue metrics for CRM dashboard tile
export function useCrmSummary() {
  return useQuery({
    queryKey: ['crm-summary'],
    queryFn: async () => {
      const [companies, opps, customers, contracts] = await Promise.all([
        supabase.from('crm_companies').select('lifecycle'),
        supabase.from('crm_opportunities').select('status,amount,amount_base,forecast_category'),
        supabase.from('crm_customers').select('mrr,arr,health'),
        supabase.from('crm_contracts').select('status,value,renewal_date,end_date'),
      ]);
      const opRows = (opps.data ?? []) as { status: string; amount: number; amount_base: number | null; forecast_category: string }[];
      const custRows = (customers.data ?? []) as { mrr: number | null; arr: number | null; health: string }[];
      const contractRows = (contracts.data ?? []) as { status: string; value: number | null; renewal_date: string | null; end_date: string | null }[];
      const today = new Date();
      const in30 = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);
      const tstr = today.toISOString().slice(0, 10);

      return {
        totalCompanies: (companies.data ?? []).length,
        openPipeline: opRows.filter(o => o.status === 'open').reduce((s, o) => s + Number(o.amount_base ?? o.amount ?? 0), 0),
        commit: opRows.filter(o => o.forecast_category === 'commit').reduce((s, o) => s + Number(o.amount_base ?? o.amount ?? 0), 0),
        closedWon: opRows.filter(o => o.status === 'won').reduce((s, o) => s + Number(o.amount_base ?? o.amount ?? 0), 0),
        openOppCount: opRows.filter(o => o.status === 'open').length,
        totalCustomers: custRows.length,
        totalMRR: custRows.reduce((s, c) => s + Number(c.mrr ?? 0), 0),
        totalARR: custRows.reduce((s, c) => s + Number(c.arr ?? 0), 0),
        atRiskCustomers: custRows.filter(c => c.health === 'at_risk' || c.health === 'critical').length,
        activeContracts: contractRows.filter(c => c.status === 'active').length,
        renewalsSoon: contractRows.filter(c => c.status === 'active' && c.renewal_date && c.renewal_date >= tstr && c.renewal_date <= in30).length,
      };
    },
  });
}
