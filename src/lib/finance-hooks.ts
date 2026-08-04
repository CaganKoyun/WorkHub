import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  FinAccount, FinBudget, FinCategory, FinTransaction, FinTxnType,
} from './finance-types';

/* ============ ACCOUNTS ============ */
export function useFinAccounts() {
  return useQuery({
    queryKey: ['fin-accounts'],
    queryFn: async (): Promise<FinAccount[]> => {
      const { data, error } = await supabase.from('fin_accounts').select('*').eq('is_archived', false).order('name');
      if (error) throw error;
      return (data ?? []) as FinAccount[];
    },
  });
}

export function useCreateFinAccount() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<FinAccount> & { name: string }) => {
      const payload = { ...input, created_by: user?.id ?? null } as never;
      const { data, error } = await supabase.from('fin_accounts').insert(payload).select().single();
      if (error) throw error;
      return data as FinAccount;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-accounts'] });
      qc.invalidateQueries({ queryKey: ['fin-summary'] });
    },
  });
}

/* ============ CATEGORIES ============ */
export function useFinCategories(type?: FinTxnType) {
  return useQuery({
    queryKey: ['fin-categories', type ?? 'all'],
    queryFn: async (): Promise<FinCategory[]> => {
      let q = supabase.from('fin_categories').select('*').eq('is_archived', false).order('name');
      if (type) q = q.eq('txn_type', type);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FinCategory[];
    },
  });
}

/* ============ TRANSACTIONS ============ */
export interface FinTxnFilters {
  type?: FinTxnType;
  projectId?: string;
  customerId?: string;
  from?: string;
  to?: string;
  status?: string;
  limit?: number;
}

export function useFinTransactions(filters?: FinTxnFilters) {
  return useQuery({
    queryKey: ['fin-transactions', filters],
    queryFn: async (): Promise<FinTransaction[]> => {
      let q = supabase.from('fin_transactions').select('*').order('txn_date', { ascending: false });
      if (filters?.type) q = q.eq('type', filters.type);
      if (filters?.projectId) q = q.eq('project_id', filters.projectId);
      if (filters?.customerId) q = q.eq('crm_customer_id', filters.customerId);
      if (filters?.status) q = q.eq('status', filters.status as FinTransaction['status']);
      if (filters?.from) q = q.gte('txn_date', filters.from);
      if (filters?.to) q = q.lte('txn_date', filters.to);
      if (filters?.limit) q = q.limit(filters.limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as FinTransaction[];
    },
  });
}

export function useCreateFinTransaction() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<FinTransaction> & { type: FinTxnType; description: string; amount: number }) => {
      const payload = { ...input, created_by: user?.id ?? null } as never;
      const { data, error } = await supabase.from('fin_transactions').insert(payload).select().single();
      if (error) throw error;
      return data as FinTransaction;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-transactions'] });
      qc.invalidateQueries({ queryKey: ['fin-summary'] });
      qc.invalidateQueries({ queryKey: ['fin-cashflow'] });
      qc.invalidateQueries({ queryKey: ['fin-budget-variance'] });
      qc.invalidateQueries({ queryKey: ['fin-project-pl'] });
    },
  });
}

/* ============ BUDGETS ============ */
export function useFinBudgets() {
  return useQuery({
    queryKey: ['fin-budgets'],
    queryFn: async (): Promise<FinBudget[]> => {
      const { data, error } = await supabase.from('fin_budgets').select('*').order('period_start', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FinBudget[];
    },
  });
}

export function useCreateFinBudget() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<FinBudget> & { name: string; amount: number; period_start: string; period_end: string }) => {
      const payload = { ...input, created_by: user?.id ?? null } as never;
      const { data, error } = await supabase.from('fin_budgets').insert(payload).select().single();
      if (error) throw error;
      return data as FinBudget;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fin-budgets'] });
      qc.invalidateQueries({ queryKey: ['fin-budget-variance'] });
    },
  });
}

/* ============ SUMMARY / METRICS ============ */
// Cash balance, burn rate, runway — FIN-005, FIN-006, FIN-007
export interface FinSummary {
  cashBase: number;
  burn3m: number;
  burn6m: number;
  income30d: number;
  expense30d: number;
  runwayMonths: number | null;
  runwayConservative: number | null;
  runwayOptimistic: number | null;
  accountsCount: number;
}

export function useFinSummary(enabled = true) {
  return useQuery({
    queryKey: ['fin-summary'],
    enabled,
    queryFn: async (): Promise<FinSummary> => {
      const [balR, burn3R, burn6R, txns, accts] = await Promise.all([
        supabase.rpc('fin_cash_balance'),
        supabase.rpc('fin_burn_rate', { _days: 90 }),
        supabase.rpc('fin_burn_rate', { _days: 180 }),
        supabase.from('fin_transactions').select('type,amount_base,txn_date,status')
          .gte('txn_date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)),
        supabase.from('fin_accounts').select('id').eq('is_archived', false),
      ]);
      const cashBase = Number(balR.data ?? 0);
      const burn3m = Number(burn3R.data ?? 0);
      const burn6m = Number(burn6R.data ?? 0);
      const txnRows = (txns.data ?? []) as { type: string; amount_base: number | null; status: string }[];
      const posted = txnRows.filter(r => r.status === 'posted' || r.status === 'reconciled');
      const income30d = posted.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount_base ?? 0), 0);
      const expense30d = posted.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount_base ?? 0), 0);
      const runway = (burn: number) => (burn > 0 ? cashBase / burn : null);
      return {
        cashBase, burn3m, burn6m, income30d, expense30d,
        runwayMonths: runway(burn3m),
        runwayConservative: runway(burn6m > burn3m ? burn6m : burn3m * 1.15),
        runwayOptimistic: runway(burn3m * 0.85),
        accountsCount: (accts.data ?? []).length,
      };
    },
  });
}

/* ============ CASH FLOW PROJECTION ============ */
// Opening + expected income + expected expense per month
export interface CashFlowBucket {
  key: string;
  label: string;
  opening: number;
  income: number;
  expense: number;
  net: number;
  closing: number;
}

export function useFinCashFlow(months = 6) {
  return useQuery({
    queryKey: ['fin-cashflow', months],
    queryFn: async (): Promise<CashFlowBucket[]> => {
      const [balR, txns, pipelineOpps] = await Promise.all([
        supabase.rpc('fin_cash_balance'),
        supabase.from('fin_transactions').select('type,amount_base,txn_date,status,is_recurring,recurring_interval')
          .gte('txn_date', new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)),
        // FIN-009: sales pipeline feeds financial forecast
        supabase.from('crm_opportunities')
          .select('amount_base,amount,currency,expected_close_date,forecast_category,status,probability')
          .eq('status', 'open'),
      ]);
      const opening = Number(balR.data ?? 0);
      const now = new Date();
      const buckets: CashFlowBucket[] = [];
      // Rolling 3m avg income & expense for recurring baseline
      const rows = (txns.data ?? []) as { type: string; amount_base: number | null; txn_date: string; status: string }[];
      const posted = rows.filter(r => r.status === 'posted' || r.status === 'reconciled');
      const avgIncome = posted.filter(r => r.type === 'income').reduce((s, r) => s + Number(r.amount_base ?? 0), 0) / 3;
      const avgExpense = posted.filter(r => r.type === 'expense').reduce((s, r) => s + Number(r.amount_base ?? 0), 0) / 3;

      const opps = (pipelineOpps.data ?? []) as { amount_base: number | null; amount: number; expected_close_date: string | null; forecast_category: string; probability: number | null }[];
      // Weight opps: commit=90%, best_case=60%, pipeline=25%
      const weight = (fc: string) => fc === 'commit' ? 0.9 : fc === 'best_case' ? 0.6 : fc === 'closed_won' ? 1 : 0.25;

      let running = opening;
      for (let i = 0; i < months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
        const monthStart = d.toISOString().slice(0, 10);
        // Expected income from opps closing this month + recurring baseline
        const pipelineIncome = opps
          .filter(o => o.expected_close_date && o.expected_close_date >= monthStart && o.expected_close_date <= monthEnd)
          .reduce((s, o) => s + Number(o.amount_base ?? o.amount ?? 0) * weight(o.forecast_category), 0);
        const income = avgIncome + pipelineIncome;
        const expense = avgExpense;
        const net = income - expense;
        const bucketOpening = running;
        running += net;
        buckets.push({ key, label, opening: bucketOpening, income, expense, net, closing: running });
      }
      return buckets;
    },
  });
}

/* ============ BUDGET VARIANCE ============ */
export interface BudgetVariance {
  budget: FinBudget;
  actual: number;
  variance: number;      // budget - actual
  utilizationPct: number;
  alerted: boolean;
}

export function useBudgetVariance() {
  return useQuery({
    queryKey: ['fin-budget-variance'],
    queryFn: async (): Promise<BudgetVariance[]> => {
      const { data: budgets, error } = await supabase.from('fin_budgets').select('*').order('period_start', { ascending: false });
      if (error) throw error;
      const bList = (budgets ?? []) as FinBudget[];
      if (!bList.length) return [];
      const { data: txnData, error: txErr } = await supabase.from('fin_transactions').select('*').eq('type', 'expense')
        .in('status', ['posted','reconciled']);
      if (txErr) throw txErr;
      const txns = (txnData ?? []) as FinTransaction[];
      return bList.map(b => {
        const actual = txns
          .filter(t =>
            t.txn_date >= b.period_start && t.txn_date <= b.period_end &&
            (!b.project_id || t.project_id === b.project_id) &&
            (!b.category_id || t.category_id === b.category_id) &&
            (!b.department || t.department === b.department)
          )
          .reduce((s, t) => s + Number(t.amount_base ?? 0), 0);
        const budgetBase = Number(b.amount_base ?? b.amount);
        const variance = budgetBase - actual;
        const utilizationPct = budgetBase > 0 ? (actual / budgetBase) * 100 : 0;
        return { budget: b, actual, variance, utilizationPct, alerted: utilizationPct >= Number(b.alert_threshold_pct ?? 90) };
      });
    },
  });
}

/* ============ PROJECT P&L ============ */
export interface ProjectPL {
  projectId: string;
  projectName: string;
  income: number;
  expense: number;
  net: number;
  budget: number | null;
  budgetUtilizationPct: number | null;
}

export function useProjectPL() {
  return useQuery({
    queryKey: ['fin-project-pl'],
    queryFn: async (): Promise<ProjectPL[]> => {
      const [projRes, txnRes, budRes] = await Promise.all([
        supabase.from('projects').select('id,name'),
        supabase.from('fin_transactions').select('type,amount_base,project_id,status'),
        supabase.from('fin_budgets').select('project_id,amount_base,amount').not('project_id', 'is', null),
      ]);
      const projects = (projRes.data ?? []) as { id: string; name: string }[];
      const txns = (txnRes.data ?? []) as { type: string; amount_base: number | null; project_id: string | null; status: string }[];
      const budgets = (budRes.data ?? []) as { project_id: string | null; amount_base: number | null; amount: number }[];
      return projects.map(p => {
        const proj = txns.filter(t => t.project_id === p.id && (t.status === 'posted' || t.status === 'reconciled'));
        const income = proj.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount_base ?? 0), 0);
        const expense = proj.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount_base ?? 0), 0);
        const budget = budgets.filter(b => b.project_id === p.id).reduce((s, b) => s + Number(b.amount_base ?? b.amount ?? 0), 0) || null;
        return {
          projectId: p.id, projectName: p.name,
          income, expense, net: income - expense,
          budget,
          budgetUtilizationPct: budget ? (expense / budget) * 100 : null,
        };
      }).sort((a, b) => b.expense - a.expense);
    },
  });
}
