// Company Graph — polymorphic linkable object types.
// Extend `LinkableType` as new modules ship (crm.company, finance.expense, etc.).

export type LinkableType =
  | 'project'
  | 'task'
  | 'bug'
  | 'asset'
  | 'employee'
  | 'goal'
  | 'risk'
  | 'decision'
  | 'approval'
  // future modules — safe to reference now
  | 'crm.company'
  | 'crm.contact'
  | 'crm.opportunity'
  | 'crm.contract'
  | 'finance.expense'
  | 'finance.invoice'
  | 'finance.budget'
  | 'product.feature'
  | 'product.release';

export const LINKABLE_LABELS: Record<LinkableType, string> = {
  project: 'Proje',
  task: 'Görev',
  bug: 'Bug',
  asset: 'Varlık',
  employee: 'Çalışan',
  goal: 'Hedef',
  risk: 'Risk',
  decision: 'Karar',
  approval: 'Onay',
  'crm.company': 'Şirket',
  'crm.contact': 'Kişi',
  'crm.opportunity': 'Fırsat',
  'crm.contract': 'Sözleşme',
  'finance.expense': 'Gider',
  'finance.invoice': 'Fatura',
  'finance.budget': 'Bütçe',
  'product.feature': 'Feature',
  'product.release': 'Release',
};

export interface ObjectLink {
  id: string;
  from_type: LinkableType;
  from_id: string;
  to_type: LinkableType;
  to_id: string;
  link_kind: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export type GoalStatus = 'draft' | 'on_track' | 'at_risk' | 'off_track' | 'achieved' | 'missed' | 'archived';
export type GoalPeriod = 'monthly' | 'quarterly' | 'yearly' | 'custom';

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  status: GoalStatus;
  period: GoalPeriod;
  progress: number;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  start_date: string | null;
  end_date: string | null;
  parent_goal_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type RiskStatus = 'open' | 'mitigating' | 'accepted' | 'closed';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Risk {
  id: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  status: RiskStatus;
  level: RiskLevel;
  likelihood: number;
  impact: number;
  mitigation: string | null;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type DecisionStatus = 'proposed' | 'decided' | 'revisit' | 'revoked';

export type DecisionVerdict = 'held' | 'changed' | 'wrong';
export type DecisionReversibility = 'one_way' | 'two_way';

export interface CompanySnapshot {
  captured_at: string;
  open_tasks: number;
  overdue_tasks: number;
  critical_bugs: number;
  active_projects: number;
  pending_approvals: number;
  open_risks: number;
  critical_risks: number;
  cash_position: number;
  open_opportunities: number;
  pipeline_amount: number;
}

export interface Decision {
  id: string;
  title: string;
  context: string | null;
  decision: string | null;
  rationale: string | null;
  status: DecisionStatus;
  decided_by: string | null;
  decided_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // the wager
  expected_outcome: string | null;
  confidence: number | null;
  // reversibility
  reversibility: DecisionReversibility | null;
  reversibility_note: string | null;
  // the loop
  review_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  actual_outcome: string | null;
  verdict: DecisionVerdict | null;
  // the frozen moment
  state_snapshot: CompanySnapshot | null;
  source_approval_id: string | null;
}

export type ApprovalKind =
  | 'expense' | 'hiring' | 'contract' | 'discount' | 'budget_change'
  | 'project_escalation' | 'risk_acceptance' | 'payment' | 'time_off' | 'general';

export type ApprovalStatus =
  | 'pending' | 'approved' | 'rejected' | 'info_requested' | 'delegated' | 'snoozed' | 'cancelled';

export type ApprovalPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Approval {
  id: string;
  kind: ApprovalKind;
  title: string;
  summary: string | null;
  amount: number | null;
  currency: string | null;
  priority: ApprovalPriority;
  status: ApprovalStatus;
  context: Record<string, unknown>;
  resource_type: string | null;
  resource_id: string | null;
  requested_by: string | null;
  assigned_to: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  due_at: string | null;
  snooze_until: string | null;
  created_at: string;
  updated_at: string;
}

export const APPROVAL_KIND_LABELS: Record<ApprovalKind, string> = {
  expense: 'Harcama',
  hiring: 'İşe Alım',
  contract: 'Sözleşme',
  discount: 'İndirim',
  budget_change: 'Bütçe Değişikliği',
  project_escalation: 'Proje Escalation',
  risk_acceptance: 'Risk Kabulü',
  payment: 'Ödeme',
  time_off: 'İzin',
  general: 'Genel',
};

export const APPROVAL_PRIORITY_LABELS: Record<ApprovalPriority, string> = {
  low: 'Düşük', normal: 'Normal', high: 'Yüksek', urgent: 'Acil',
};

export const APPROVAL_PRIORITY_COLORS: Record<ApprovalPriority, string> = {
  low: 'bg-muted text-muted-foreground',
  normal: 'bg-blue-500/20 text-blue-300',
  high: 'bg-amber-500/20 text-amber-300',
  urgent: 'bg-destructive/20 text-destructive-foreground',
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  draft: 'Taslak', on_track: 'Yolunda', at_risk: 'Riskli',
  off_track: 'Sapmış', achieved: 'Ulaşıldı', missed: 'Kaçırıldı', archived: 'Arşiv',
};

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'Düşük', medium: 'Orta', high: 'Yüksek', critical: 'Kritik',
};

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-500/20 text-blue-300',
  high: 'bg-amber-500/20 text-amber-300',
  critical: 'bg-destructive/20 text-destructive-foreground',
};
