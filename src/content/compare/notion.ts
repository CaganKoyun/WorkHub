export interface CompareFeature {
  name: string;
  founderos: boolean | string;
  competitor: boolean | string;
}

export interface CompareData {
  slug: string;
  competitor: string;
  tagline: string;
  arguments: string[];
  features: CompareFeature[];
  ctaText: string;
}

export const notionData: CompareData = {
  slug: "notion",
  competitor: "Notion",
  tagline:
    "Notion is a flexible docs and wikis tool. FounderOS is a purpose-built operating system for running an entire company — CRM, Finance, Decisions and more included out of the box.",
  arguments: [
    "FounderOS ships a real CRM with pipeline, quotes and contracts — Notion requires you to build one from scratch with databases and formulas.",
    "Built-in Finance module tracks cash, burn and runway with multi-currency support. In Notion you would need a third-party integration or a fragile spreadsheet embed.",
    "Decision System of Record captures context, options and confidence at decision time, then reviews outcomes automatically. Notion has no equivalent concept.",
    "Chief of Staff AI is a domain-expert agent grounded in your workspace data — not a generic assistant bolted onto a doc editor.",
    "Company Graph links every task to its customer, budget, goal and risk so nothing falls through the cracks. Notion pages are connected only if you wire them up manually.",
  ],
  features: [
    { name: "Project & task management", founderos: true, competitor: true },
    { name: "Docs & wikis", founderos: true, competitor: true },
    { name: "Board, List, Timeline views", founderos: true, competitor: true },
    { name: "Built-in CRM & pipeline", founderos: true, competitor: false },
    { name: "Quotes & contracts", founderos: true, competitor: false },
    { name: "Finance — cash, burn, runway", founderos: true, competitor: false },
    { name: "Multi-currency budgets", founderos: true, competitor: false },
    { name: "Goals & OKRs with auto roll-up", founderos: true, competitor: "Manual databases" },
    { name: "Decision System of Record", founderos: true, competitor: false },
    { name: "Risk register", founderos: true, competitor: false },
    { name: "Chief of Staff AI agent", founderos: true, competitor: "Generic AI assistant" },
    { name: "Company Graph linking all modules", founderos: true, competitor: false },
    { name: "Founder Inbox — unified approvals", founderos: true, competitor: false },
    { name: "People & HR basics", founderos: true, competitor: false },
  ],
  ctaText: "Replace Notion + 4 other tools with one workspace",
};
