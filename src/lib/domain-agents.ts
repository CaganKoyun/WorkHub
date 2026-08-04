// ---------------------------------------------------------------------------
// Presentation-only mapping between sidebar domains and the agent shown in
// each domain's right rail. Only 4 agents actually exist server-side today
// (chief_of_staff, projects, revenue, finance — see agent-config.ts). Other
// domains fall back to Chief of Staff with a scoped opening prompt, so the
// UI shell is uniform without pretending capability we don't have.
// ---------------------------------------------------------------------------

import type { AgentDomain } from "./agent-config";

export type DomainKey =
  | "home" | "inbox" | "dashboard"
  | "projects" | "tasks" | "bugs" | "product"
  | "crm" | "finance"
  | "goals" | "risks" | "decisions" | "analytics"
  | "company" | "assets" | "employees";

export interface DomainAgentSpec {
  /** Which real agent backs this panel */
  backedBy: AgentDomain;
  /** UI label shown on the agent card ("Program Manager", "Risk Officer"…) */
  displayName: string;
  /** One-line role summary, tailored to the domain */
  role: string;
  /** 3–4 quick task prompts. Sent as ?q= into /ai-chat */
  quickTasks: string[];
  /** Source badges shown under the agent panel */
  sources: string[];
  /** Shown when the real agent doesn't exist yet — "Beta" pill */
  beta?: boolean;
}

export const DOMAIN_AGENTS: Record<DomainKey, DomainAgentSpec> = {
  home: {
    backedBy: "chief_of_staff",
    displayName: "Chief of Staff",
    role: "Şirketin tamamını birleştirir; bugün müdahale etmen gereken üç konuyu söyler.",
    quickTasks: [
      "Bugün müdahale etmem gereken üç konu ne?",
      "Bu haftanın yönetim özeti hazırla",
      "Bende bekleyen onayları önceliklendir",
    ],
    sources: ["Company Graph", "Founder Inbox"],
  },
  inbox: {
    backedBy: "chief_of_staff",
    displayName: "Executive Action",
    role: "Onay, karar ve escalation kuyruğunu özetler; toplu aksiyon önerir.",
    quickTasks: [
      "Inbox'ımı önceliğe göre özetle",
      "Düşük riskli talepleri grupla ve delegasyon öner",
      "Karar vermek için eksik bilgileri getir",
    ],
    sources: ["Approvals", "Decisions"],
  },
  dashboard: {
    backedBy: "chief_of_staff",
    displayName: "Business Intelligence",
    role: "Metrik değişimlerini açıklar, anomali bulur, doğal dilde rapor hazırlar.",
    quickTasks: [
      "Bu ayın en anlamlı metrik değişikliği ne?",
      "Departmanlar arası çelişkileri bul",
      "Yönetim toplantısı için tek sayfalık özet hazırla",
    ],
    sources: ["Company Graph"],
    beta: true,
  },
  projects: {
    backedBy: "projects",
    displayName: "Program Manager",
    role: "Portfolio sağlığı, gecikme kök nedenleri, ekip kapasitesi.",
    quickTasks: [
      "Hangi projeler gecikiyor ve neden?",
      "Kritik yolu analiz et",
      "Proje durum raporu taslağı hazırla",
    ],
    sources: ["Projects", "Tasks", "Bugs"],
  },
  tasks: {
    backedBy: "projects",
    displayName: "Personal Work",
    role: "Günün planı, bloklanmış işler, task önceliklendirme.",
    quickTasks: [
      "Bugün neye odaklanmalıyım?",
      "Geciken görevlerimi çıkar",
      "Bu haftaki işi haftalık özet olarak yaz",
    ],
    sources: ["My Tasks"],
    beta: true,
  },
  bugs: {
    backedBy: "projects",
    displayName: "Engineering Triage",
    role: "Kritik buglar, release blocker'lar, duplicate tespiti.",
    quickTasks: [
      "Release'i blokleyen bug'lar hangileri?",
      "Aynı kök nedene sahip bug'ları grupla",
      "Bu haftaki severity trendini açıkla",
    ],
    sources: ["Bugs"],
    beta: true,
  },
  product: {
    backedBy: "projects",
    displayName: "Chief Product Officer",
    role: "Feedback temaları, roadmap seçenekleri, RICE/ICE, PRD taslağı.",
    quickTasks: [
      "En çok istenen üç özellik hangisi?",
      "Bir sonraki release için önerilen scope hazırla",
      "Feedback'i temalara göre grupla",
    ],
    sources: ["Products", "Features", "Feedback", "Releases"],
    beta: true,
  },
  crm: {
    backedBy: "revenue",
    displayName: "Revenue",
    role: "Pipeline disiplini, riskli fırsatlar, gerçekçi forecast.",
    quickTasks: [
      "Bu ay kapanabilecek fırsatlar hangileri?",
      "Kapanış tarihi geçmiş fırsatları listele",
      "Follow-up yapılmamış müşterileri getir",
    ],
    sources: ["Opportunities", "Companies", "Activities"],
  },
  finance: {
    backedBy: "finance",
    displayName: "Finance",
    role: "Temkinli finans kontrolörü: nakit, bütçe sapması, harcama kontrolü.",
    quickTasks: [
      "Nakit durumumuz nasıl görünüyor?",
      "Son işlemlerde dikkat çeken bir şey var mı?",
      "Bütçelerle gerçekleşen arasında sapma var mı?",
    ],
    sources: ["Transactions", "Budgets", "FX Rates"],
  },
  goals: {
    backedBy: "chief_of_staff",
    displayName: "Strategy",
    role: "OKR gerçekçiliği, hedefe bağlı proje/finansal etki.",
    quickTasks: [
      "Hangi hedefler risk altında?",
      "Hedeflere hizmet etmeyen projeleri bul",
      "OKR check-in taslağı hazırla",
    ],
    sources: ["Goals", "Projects"],
    beta: true,
  },
  risks: {
    backedBy: "chief_of_staff",
    displayName: "Risk Officer",
    role: "Yeni risk sinyalleri, mitigation planı, sahip önerisi.",
    quickTasks: [
      "Kritik risklerin mitigation durumu ne?",
      "Yeni ortaya çıkan risk sinyalleri var mı?",
      "Bu haftaki risk özetini hazırla",
    ],
    sources: ["Risks", "Company Graph"],
    beta: true,
  },
  decisions: {
    backedBy: "chief_of_staff",
    displayName: "Executive Decision",
    role: "Seçenek karşılaştırma, geçmiş benzer kararlar, review kuyruğu.",
    quickTasks: [
      "Bu hafta yeniden açılış zamanı gelen kararlar hangileri?",
      "Son 90 günün önemli kararlarını özetle",
      "Confidence ile sonuç arasındaki kalibrasyon farkını göster",
    ],
    sources: ["Decisions", "Approvals"],
    beta: true,
  },
  analytics: {
    backedBy: "chief_of_staff",
    displayName: "Business Analyst",
    role: "Doğal dille metrik, korelasyon, veri kalitesi.",
    quickTasks: [
      "Bugs bu ay neden arttı?",
      "Trend anomalilerini işaretle",
      "Executive dashboard için 5 metrik öner",
    ],
    sources: ["Bugs", "Company Graph"],
    beta: true,
  },
  company: {
    backedBy: "chief_of_staff",
    displayName: "Org Design",
    role: "Departman, takım, modül sahipliği ve rol atamaları.",
    quickTasks: [
      "Modül sahipliği eksikleri hangileri?",
      "Departman-modül uyumunu gözden geçir",
    ],
    sources: ["Departments", "Teams", "Module Ownership"],
    beta: true,
  },
  assets: {
    backedBy: "chief_of_staff",
    displayName: "Operations",
    role: "Zimmet, lisans, yaklaşan bakım/yenileme.",
    quickTasks: [
      "Boşta duran asset'ler hangileri?",
      "30 gün içinde yenilenecek lisansları getir",
      "Offboarding zimmet kontrolü yap",
    ],
    sources: ["Assets", "Assignments"],
    beta: true,
  },
  employees: {
    backedBy: "chief_of_staff",
    displayName: "HR Business Partner",
    role: "Onboarding, kapasite, açık pozisyonlar (yetki dahilinde).",
    quickTasks: [
      "Bu ay onboarding tamamlanmamış çalışan var mı?",
      "Departman kapasite dağılımı",
      "Açık roller için özet çıkar",
    ],
    sources: ["Employees", "Departments"],
    beta: true,
  },
};

export function getDomainAgent(key: DomainKey): DomainAgentSpec {
  return DOMAIN_AGENTS[key];
}
