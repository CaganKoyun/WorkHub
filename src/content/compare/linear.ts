import type { CompareData } from "./notion";

export const linearData: CompareData = {
  slug: "linear",
  competitor: "Linear",
  tagline:
    "Linear is a fast, focused issue tracker built for engineering teams. FounderOS covers the full company — CRM, Finance, HR and Decisions alongside Projects — so founders stop context-switching between six tools.",
  arguments: [
    "Linear is engineering-only. FounderOS serves every department — sales, finance, ops, people — in a single workspace, so the whole company shares one source of truth.",
    "Built-in CRM means won deals flow straight into delivery projects and finance reports. With Linear you need a separate CRM and manual hand-offs.",
    "Finance module tracks cash, burn, runway and project P&L with multi-currency support. Linear has no financial awareness.",
    "Decision System of Record captures strategic calls with context, confidence and expected outcomes — then reviews what actually happened. Linear tracks issues, not decisions.",
  ],
  features: [
    { name: "Issue & bug tracking", founderos: true, competitor: true },
    { name: "Board & list views", founderos: true, competitor: true },
    { name: "Cycles / sprints", founderos: true, competitor: true },
    { name: "Roadmap planning", founderos: true, competitor: true },
    { name: "Timeline / Gantt view", founderos: true, competitor: false },
    { name: "Built-in CRM & pipeline", founderos: true, competitor: false },
    { name: "Quotes & contracts", founderos: true, competitor: false },
    { name: "Finance — cash, burn, runway", founderos: true, competitor: false },
    { name: "Goals & OKRs with auto roll-up", founderos: true, competitor: "Initiatives (limited)" },
    { name: "Decision System of Record", founderos: true, competitor: false },
    { name: "Risk register", founderos: true, competitor: false },
    { name: "Chief of Staff AI agent", founderos: true, competitor: "AI triage" },
    { name: "Company Graph linking all modules", founderos: true, competitor: false },
    { name: "People & HR basics", founderos: true, competitor: false },
  ],
  ctaText: "One workspace for the whole company, not just engineering",
};
