// CRM & Revenue types
export type CrmLifecycle = 'lead' | 'prospect' | 'customer' | 'partner' | 'vendor' | 'churned';
export type CrmForecastCategory = 'pipeline' | 'best_case' | 'commit' | 'closed_won' | 'closed_lost' | 'omitted';
export type CrmOppStatus = 'open' | 'won' | 'lost' | 'abandoned';
export type CrmActivityKind = 'call' | 'email' | 'meeting' | 'note' | 'task' | 'whatsapp' | 'demo' | 'proposal_sent' | 'contract_sent' | 'other';
export type CrmQuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'revised';
export type CrmContractStatus = 'draft' | 'internal_review' | 'counterparty_review' | 'pending_approval' | 'pending_signature' | 'active' | 'renewal' | 'expired' | 'terminated';
export type CrmCustomerHealth = 'healthy' | 'watch' | 'at_risk' | 'critical';
export type CrmSubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'paused' | 'expired';

export interface CrmCompany {
  id: string;
  name: string;
  legal_name: string | null;
  domain: string | null;
  website: string | null;
  industry: string | null;
  employee_count: number | null;
  annual_revenue: number | null;
  currency: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  lifecycle: CrmLifecycle;
  source: string | null;
  tags: string[];
  description: string | null;
  health: CrmCustomerHealth | null;
  owner_id: string | null;
  source_system: string | null;
  source_record_id: string | null;
  is_archived: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmContact {
  id: string;
  company_id: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  seniority: string | null;
  linkedin_url: string | null;
  is_primary: boolean;
  is_decision_maker: boolean;
  owner_id: string | null;
  lifecycle: CrmLifecycle;
  source: string | null;
  tags: string[];
  source_system: string | null;
  source_record_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmPipeline {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_archived: boolean;
  currency: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmPipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
  probability: number;
  sla_days: number | null;
  forecast_category: CrmForecastCategory;
  is_won: boolean;
  is_lost: boolean;
  color: string | null;
  created_at: string;
}

export interface CrmOpportunity {
  id: string;
  name: string;
  company_id: string | null;
  primary_contact_id: string | null;
  pipeline_id: string;
  stage_id: string;
  status: CrmOppStatus;
  amount: number;
  currency: string;
  fx_rate: number | null;
  amount_base: number | null;
  probability: number | null;
  forecast_category: CrmForecastCategory;
  expected_close_date: string | null;
  actual_close_date: string | null;
  source: string | null;
  campaign: string | null;
  competitor: string | null;
  next_action: string | null;
  next_action_date: string | null;
  lost_reason: string | null;
  won_reason: string | null;
  owner_id: string | null;
  stage_entered_at: string;
  last_activity_at: string | null;
  description: string | null;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmActivity {
  id: string;
  kind: CrmActivityKind;
  subject: string;
  body: string | null;
  occurred_at: string;
  duration_minutes: number | null;
  outcome: string | null;
  company_id: string | null;
  contact_id: string | null;
  opportunity_id: string | null;
  performed_by: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CrmQuote {
  id: string;
  quote_number: string;
  opportunity_id: string | null;
  company_id: string | null;
  status: CrmQuoteStatus;
  version: number;
  currency: string;
  subtotal: number;
  discount_pct: number;
  discount_amount: number;
  tax_pct: number;
  tax_amount: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  terms: string | null;
  pdf_url: string | null;
  esign_url: string | null;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  owner_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmQuoteItem {
  id: string;
  quote_id: string;
  position: number;
  sku: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  tax_pct: number;
  line_total: number;
  created_at: string;
}

export interface CrmContract {
  id: string;
  contract_number: string;
  title: string;
  company_id: string | null;
  opportunity_id: string | null;
  status: CrmContractStatus;
  value: number | null;
  currency: string | null;
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  auto_renew: boolean;
  renewal_notice_days: number | null;
  owner_id: string | null;
  counterparty_name: string | null;
  counterparty_email: string | null;
  risky_clauses: string | null;
  file_url: string | null;
  esign_url: string | null;
  approval_history: unknown;
  signed_at: string | null;
  terminated_at: string | null;
  termination_reason: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmCustomer {
  id: string;
  company_id: string | null;
  onboarded_at: string;
  cs_owner_id: string | null;
  am_owner_id: string | null;
  health: CrmCustomerHealth;
  health_score: number | null;
  health_updated_at: string | null;
  arr: number | null;
  mrr: number | null;
  currency: string | null;
  nps: number | null;
  nps_updated_at: string | null;
  last_contact_at: string | null;
  renewal_date: string | null;
  churned_at: string | null;
  churn_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrmSubscription {
  id: string;
  customer_id: string;
  plan_name: string;
  status: CrmSubscriptionStatus;
  mrr: number;
  arr: number | null;
  currency: string;
  seats: number | null;
  start_date: string;
  renewal_date: string | null;
  cancelled_at: string | null;
  trial_ends_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// -------- Labels & colors (Turkish UI) --------
export const LIFECYCLE_LABELS: Record<CrmLifecycle, string> = {
  lead: 'Lead', prospect: 'Prospect', customer: 'Müşteri',
  partner: 'Partner', vendor: 'Tedarikçi', churned: 'Kaybedilen',
};
export const LIFECYCLE_COLORS: Record<CrmLifecycle, string> = {
  lead: 'bg-slate-500/20 text-slate-300',
  prospect: 'bg-blue-500/20 text-blue-300',
  customer: 'bg-emerald-500/20 text-emerald-300',
  partner: 'bg-violet-500/20 text-violet-300',
  vendor: 'bg-amber-500/20 text-amber-300',
  churned: 'bg-destructive/20 text-destructive-foreground',
};

export const FORECAST_LABELS: Record<CrmForecastCategory, string> = {
  pipeline: 'Pipeline', best_case: 'Best Case', commit: 'Commit',
  closed_won: 'Closed Won', closed_lost: 'Closed Lost', omitted: 'Omitted',
};
export const FORECAST_COLORS: Record<CrmForecastCategory, string> = {
  pipeline: 'bg-slate-500/20 text-slate-300',
  best_case: 'bg-sky-500/20 text-sky-300',
  commit: 'bg-amber-500/20 text-amber-300',
  closed_won: 'bg-emerald-500/20 text-emerald-300',
  closed_lost: 'bg-destructive/20 text-destructive-foreground',
  omitted: 'bg-muted text-muted-foreground',
};

export const OPP_STATUS_LABELS: Record<CrmOppStatus, string> = {
  open: 'Açık', won: 'Kazanıldı', lost: 'Kaybedildi', abandoned: 'Bırakıldı',
};

export const ACTIVITY_LABELS: Record<CrmActivityKind, string> = {
  call: 'Arama', email: 'E-posta', meeting: 'Toplantı', note: 'Not',
  task: 'Görev', whatsapp: 'WhatsApp', demo: 'Demo',
  proposal_sent: 'Teklif Gönderildi', contract_sent: 'Sözleşme Gönderildi', other: 'Diğer',
};

export const QUOTE_STATUS_LABELS: Record<CrmQuoteStatus, string> = {
  draft: 'Taslak', sent: 'Gönderildi', accepted: 'Kabul', declined: 'Red', expired: 'Süresi Doldu', revised: 'Revize',
};

export const CONTRACT_STATUS_LABELS: Record<CrmContractStatus, string> = {
  draft: 'Taslak', internal_review: 'İç İnceleme', counterparty_review: 'Karşı Taraf',
  pending_approval: 'Onay Bekliyor', pending_signature: 'İmza Bekliyor',
  active: 'Aktif', renewal: 'Yenileme', expired: 'Süresi Doldu', terminated: 'Feshedildi',
};
export const CONTRACT_STATUS_COLORS: Record<CrmContractStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  internal_review: 'bg-blue-500/20 text-blue-300',
  counterparty_review: 'bg-sky-500/20 text-sky-300',
  pending_approval: 'bg-amber-500/20 text-amber-300',
  pending_signature: 'bg-violet-500/20 text-violet-300',
  active: 'bg-emerald-500/20 text-emerald-300',
  renewal: 'bg-teal-500/20 text-teal-300',
  expired: 'bg-orange-500/20 text-orange-300',
  terminated: 'bg-destructive/20 text-destructive-foreground',
};

export const HEALTH_LABELS: Record<CrmCustomerHealth, string> = {
  healthy: 'Sağlıklı', watch: 'İzlemede', at_risk: 'Riskli', critical: 'Kritik',
};
export const HEALTH_COLORS: Record<CrmCustomerHealth, string> = {
  healthy: 'bg-emerald-500/20 text-emerald-300',
  watch: 'bg-amber-500/20 text-amber-300',
  at_risk: 'bg-orange-500/20 text-orange-300',
  critical: 'bg-destructive/20 text-destructive-foreground',
};

export const SUB_STATUS_LABELS: Record<CrmSubscriptionStatus, string> = {
  trialing: 'Deneme', active: 'Aktif', past_due: 'Gecikmiş',
  cancelled: 'İptal', paused: 'Durduruldu', expired: 'Süresi Doldu',
};

// Currency helper
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'TRY', 'AED', 'CHF', 'CAD', 'AUD'] as const;
export function formatMoney(amount: number | null | undefined, currency = 'USD'): string {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount.toLocaleString('tr-TR')} ${currency}`;
  }
}
