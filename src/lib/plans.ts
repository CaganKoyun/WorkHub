export interface PlanFeature {
  name: string;
  free: boolean | string;
  team: boolean | string;
  growth: boolean | string;
  scale: boolean | string;
}

export interface Plan {
  id: string;
  name: string;
  monthlyPrice: number | null; // null = custom
  yearlyPrice: number | null;
  description: string;
  highlighted?: boolean;
  cta: string;
  ctaHref: string;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'For solo founders getting started',
    cta: 'Start free',
    ctaHref: '/auth',
    features: [
      'Up to 3 team members',
      '1 workspace',
      'Projects, Tasks, Bugs',
      'Basic CRM (50 contacts)',
      'Decision System of Record',
      '1 GB storage',
      'Community support',
    ],
  },
  {
    id: 'team',
    name: 'Team',
    monthlyPrice: 29,
    yearlyPrice: 24,
    description: 'For small teams scaling fast',
    cta: 'Start free trial',
    ctaHref: '/auth',
    features: [
      'Up to 10 team members',
      'Unlimited workspaces',
      'Everything in Free',
      'Full CRM & Pipeline',
      'Finance & Runway',
      'Goals & OKRs',
      'Founder Inbox',
      '10 GB storage',
      'Priority email support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 79,
    yearlyPrice: 66,
    description: 'For growing companies that need AI',
    highlighted: true,
    cta: 'Start free trial',
    ctaHref: '/auth',
    features: [
      'Up to 50 team members',
      'Everything in Team',
      'Chief of Staff AI',
      'Public Dashboards',
      'Advanced Analytics',
      'Import Wizard',
      'Audit Log (1 year)',
      'Custom fields',
      '50 GB storage',
      'Slack & email support',
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    monthlyPrice: null,
    yearlyPrice: null,
    description: 'For companies that need control',
    cta: 'Contact sales',
    ctaHref: '/auth',
    features: [
      'Unlimited team members',
      'Everything in Growth',
      'SSO / SAML',
      'Custom SLA',
      'Audit Log (unlimited)',
      'Dedicated support',
      'Data residency options',
      'Unlimited storage',
      'Onboarding assistance',
    ],
  },
];

export const FEATURE_COMPARISON: PlanFeature[] = [
  { name: 'Team members', free: '3', team: '10', growth: '50', scale: 'Unlimited' },
  { name: 'Workspaces', free: '1', team: 'Unlimited', growth: 'Unlimited', scale: 'Unlimited' },
  { name: 'Projects & Tasks', free: true, team: true, growth: true, scale: true },
  { name: 'Bug Tracking', free: true, team: true, growth: true, scale: true },
  { name: 'Decision System of Record', free: true, team: true, growth: true, scale: true },
  { name: 'CRM & Pipeline', free: '50 contacts', team: true, growth: true, scale: true },
  { name: 'Finance & Runway', free: false, team: true, growth: true, scale: true },
  { name: 'Goals & OKRs', free: false, team: true, growth: true, scale: true },
  { name: 'Risk Management', free: false, team: true, growth: true, scale: true },
  { name: 'Founder Inbox', free: false, team: true, growth: true, scale: true },
  { name: 'Chief of Staff AI', free: false, team: false, growth: true, scale: true },
  { name: 'Public Dashboards', free: false, team: false, growth: true, scale: true },
  { name: 'Import Wizard', free: false, team: false, growth: true, scale: true },
  { name: 'Audit Log', free: false, team: false, growth: '1 year', scale: 'Unlimited' },
  { name: 'Advanced Analytics', free: false, team: false, growth: true, scale: true },
  { name: 'SSO / SAML', free: false, team: false, growth: false, scale: true },
  { name: 'Custom SLA', free: false, team: false, growth: false, scale: true },
  { name: 'API Access', free: false, team: true, growth: true, scale: true },
  { name: 'Storage', free: '1 GB', team: '10 GB', growth: '50 GB', scale: 'Unlimited' },
  { name: 'Support', free: 'Community', team: 'Email', growth: 'Priority', scale: 'Dedicated' },
];
