export type FinTxnType = 'income' | 'expense' | 'transfer';
export type FinTxnStatus = 'planned' | 'posted' | 'reconciled' | 'cancelled';
export type FinAccountType = 'bank' | 'cash' | 'credit_card' | 'wallet' | 'other';
export type FinBudgetPeriod = 'monthly' | 'quarterly' | 'yearly' | 'custom';

export interface FinAccount {
  id: string;
  name: string;
  type: FinAccountType;
  currency: string;
  opening_balance: number;
  opening_date: string;
  bank_name: string | null;
  account_number: string | null;
  is_archived: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinCategory {
  id: string;
  name: string;
  txn_type: FinTxnType;
  parent_id: string | null;
  color: string | null;
  is_archived: boolean;
  created_at: string;
}

export interface FinFxRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  rate_date: string;
  source: string | null;
  created_at: string;
}

export interface FinTransaction {
  id: string;
  type: FinTxnType;
  status: FinTxnStatus;
  description: string;
  txn_date: string;
  amount: number;
  currency: string;
  fx_rate: number | null;
  amount_base: number | null;
  fx_date: string | null;
  account_id: string | null;
  category_id: string | null;
  project_id: string | null;
  crm_company_id: string | null;
  crm_customer_id: string | null;
  employee_id: string | null;
  department: string | null;
  contract_id: string | null;
  invoice_number: string | null;
  vendor_name: string | null;
  notes: string | null;
  attachment_url: string | null;
  is_recurring: boolean;
  recurring_interval: string | null;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinBudget {
  id: string;
  name: string;
  period: FinBudgetPeriod;
  period_start: string;
  period_end: string;
  amount: number;
  currency: string;
  amount_base: number | null;
  category_id: string | null;
  project_id: string | null;
  department: string | null;
  alert_threshold_pct: number;
  owner_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const TXN_TYPE_LABELS: Record<FinTxnType, string> = {
  income: 'Gelir', expense: 'Gider', transfer: 'Transfer',
};
export const TXN_TYPE_COLORS: Record<FinTxnType, string> = {
  income: 'bg-emerald-500/20 text-emerald-300',
  expense: 'bg-destructive/20 text-destructive-foreground',
  transfer: 'bg-blue-500/20 text-blue-300',
};

export const TXN_STATUS_LABELS: Record<FinTxnStatus, string> = {
  planned: 'Planlanmış', posted: 'Kaydedildi', reconciled: 'Mutabık', cancelled: 'İptal',
};

export const ACCOUNT_TYPE_LABELS: Record<FinAccountType, string> = {
  bank: 'Banka', cash: 'Nakit', credit_card: 'Kredi Kartı', wallet: 'Cüzdan', other: 'Diğer',
};

export const BUDGET_PERIOD_LABELS: Record<FinBudgetPeriod, string> = {
  monthly: 'Aylık', quarterly: 'Çeyreklik', yearly: 'Yıllık', custom: 'Özel',
};

export const FIN_CURRENCIES = ['USD','EUR','GBP','TRY','AED','CHF','CAD','AUD'] as const;

export function formatCurrency(amount: number | null | undefined, currency = 'USD'): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount.toLocaleString('tr-TR')} ${currency}`;
  }
}

export function formatMonths(months: number | null | undefined): string {
  if (months == null || !Number.isFinite(months)) return '∞';
  if (months >= 24) return `${(months / 12).toFixed(1)} yıl`;
  return `${months.toFixed(1)} ay`;
}
