import type { CompareData } from "./notion";

export const asanaData: CompareData = {
  slug: "asana",
  competitor: "Asana",
  tagline:
    "Asana is a solid task and project tracker. FounderOS goes further — CRM, Finance, Decision tracking and a Chief of Staff AI, all in one workspace designed for founders.",
  arguments: [
    "FounderOS includes a full CRM with pipeline stages, quotes and contracts. Asana has no native CRM — you need a separate tool and an integration layer.",
    "Finance module gives you cash position, burn rate, runway and budget variance in real time. Asana does not touch financial data at all.",
    "Decision System of Record lets you capture the why behind every strategic call and review outcomes later. Asana tracks tasks, not decisions.",
    "Chief of Staff AI is a domain-aware agent that surfaces blockers, suggests priorities and drafts updates using your actual workspace data — not a chatbot added to a sidebar.",
    "Company Graph connects every project to its customer, budget, goal, risk and originating decision. In Asana, those relationships live in different tools with no shared context.",
  ],
  features: [
    { name: "Project & task management", founderos: true, competitor: true },
    { name: "Board, List, Timeline views", founderos: true, competitor: true },
    { name: "Goals & OKRs", founderos: true, competitor: true },
    { name: "Workload management", founderos: true, competitor: true },
    { name: "Built-in CRM & pipeline", founderos: true, competitor: false },
    { name: "Quotes & contracts", founderos: true, competitor: false },
    { name: "Finance — cash, burn, runway", founderos: true, competitor: false },
    { name: "Multi-currency budgets", founderos: true, competitor: false },
    { name: "Decision System of Record", founderos: true, competitor: false },
    { name: "Risk register", founderos: true, competitor: false },
    { name: "Chief of Staff AI agent", founderos: true, competitor: "Basic AI features" },
    { name: "Company Graph linking all modules", founderos: true, competitor: false },
    { name: "Founder Inbox — unified approvals", founderos: true, competitor: "Inbox (tasks only)" },
    { name: "People & HR basics", founderos: true, competitor: false },
    { name: "Custom dashboards", founderos: true, competitor: true },
  ],
  ctaText: "Go beyond task management — run the whole company",
};
