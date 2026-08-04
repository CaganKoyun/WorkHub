// ---------------------------------------------------------------------------
// Domain Agents — client-side config for the 4 MVP agents.
// The behavior ceiling (Level 3: explain/recommend/draft) is enforced
// server-side in supabase/functions/ai-chat; this file is presentation only.
// ---------------------------------------------------------------------------

export type AgentDomain = "chief_of_staff" | "finance" | "projects" | "revenue";

export interface AgentDef {
  domain: AgentDomain;
  label: string;
  title: string;
  description: string;
  /** Hazır görev kartları — boş chat yerine ilk tıklanacak sorular */
  suggestedPrompts: string[];
  /** finance modül yetkisi gerektirir */
  requiresFinanceAccess: boolean;
}

export const AGENTS: Record<AgentDomain, AgentDef> = {
  chief_of_staff: {
    domain: "chief_of_staff",
    label: "Chief of Staff",
    title: "Executive Chief of Staff",
    description:
      "Şirketin tamamını birleştirir: bekleyen kararların, geciken işlerin ve alanlar arası etkilerin tek özeti.",
    suggestedPrompts: [
      "Bugün müdahale etmem gereken üç konu ne?",
      "Bende bekleyen onay ve kararları önceliklendir",
      "Bu haftanın yönetim özeti hazırla",
      "Yeniden açılışı gelen kararlarımı hatırlat",
    ],
    requiresFinanceAccess: false,
  },
  projects: {
    domain: "projects",
    label: "Program Manager",
    title: "Program Manager Agent",
    description:
      "Proje sağlığı, gecikme kök nedenleri, bloklanmış işler ve kapasite.",
    suggestedPrompts: [
      "Hangi projeler gecikiyor ve neden?",
      "Geciken görevleri önceliklendir",
      "Proje durum raporu taslağı hazırla",
    ],
    requiresFinanceAccess: false,
  },
  revenue: {
    domain: "revenue",
    label: "Revenue",
    title: "Revenue Agent",
    description:
      "Pipeline disiplini: riskli fırsatlar, takip edilmeyen müşteriler, gerçekçi forecast.",
    suggestedPrompts: [
      "Bu ay kapanabilecek fırsatlar hangileri?",
      "Kapanış tarihi geçmiş fırsatları listele",
      "Pipeline'daki en büyük riskleri açıkla",
    ],
    requiresFinanceAccess: false,
  },
  finance: {
    domain: "finance",
    label: "Finance",
    title: "Finance Agent",
    description:
      "Temkinli finans kontrolörü: nakit, bütçe sapması, harcama kontrolü. Finans yetkisi gerektirir.",
    suggestedPrompts: [
      "Nakit durumumuz nasıl görünüyor?",
      "Son işlemlerde dikkat çeken bir şey var mı?",
      "Bütçelerle gerçekleşen arasında sapma var mı?",
    ],
    requiresFinanceAccess: true,
  },
};

export const AGENT_LIST: AgentDef[] = [
  AGENTS.chief_of_staff,
  AGENTS.projects,
  AGENTS.revenue,
  AGENTS.finance,
];

export function getAgent(domain: string | null | undefined): AgentDef {
  if (domain && domain in AGENTS) return AGENTS[domain as AgentDomain];
  return AGENTS.chief_of_staff;
}

/**
 * §4 action bridge: derive an approval draft from an agent message.
 * Title = first meaningful line, markdown-stripped, ≤120 chars.
 */
export function extractApprovalDraft(message: string): { title: string; summary: string } {
  const stripMd = (s: string) =>
    s.replace(/[#*_`>]/g, "").replace(/\s+/g, " ").trim();
  const lines = message.split("\n").map(stripMd).filter(Boolean);
  const firstLine = lines[0] ?? "Agent önerisi";
  const title = firstLine.length > 120 ? firstLine.slice(0, 117) + "..." : firstLine;
  const summary = message.length > 2000 ? message.slice(0, 1997) + "..." : message;
  return { title, summary };
}
