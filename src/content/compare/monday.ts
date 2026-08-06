import type { CompareData } from "./notion";

export const mondayData: CompareData = {
  slug: "monday",
  competitor: "Monday",
  tagline:
    "Monday.com is a colourful spreadsheet layer for work tracking. FounderOS is a structured operating system with native CRM, Finance, Decision tracking and AI — built specifically for founders running lean.",
  arguments: [
    "FounderOS has a real Decision System of Record that captures context, options and confidence at decision time, then reviews outcomes. Monday tracks tasks in rows — decisions live in someone's head.",
    "Chief of Staff AI is a domain-expert agent grounded in your workspace data. Monday's AI is auto-fill and formula generation on top of a spreadsheet grid.",
    "Finance module delivers cash, burn, runway and project P&L with multi-currency support. Monday offers a Numbers column and dashboard widgets — not a finance system.",
    "Company Graph links every project to its customer, budget, goal and risk automatically. In Monday, those connections are manual column references that break when someone renames a board.",
    "FounderOS is purpose-built for founders. Monday is a horizontal platform that tries to be everything for everyone, so nothing fits perfectly out of the box.",
  ],
  features: [
    { name: "Project & task management", founderos: true, competitor: true },
    { name: "Board, List, Timeline views", founderos: true, competitor: true },
    { name: "Custom dashboards", founderos: true, competitor: true },
    { name: "Automations", founderos: true, competitor: true },
    { name: "Built-in CRM & pipeline", founderos: true, competitor: "Add-on product" },
    { name: "Quotes & contracts", founderos: true, competitor: false },
    { name: "Finance — cash, burn, runway", founderos: true, competitor: "Number columns only" },
    { name: "Multi-currency budgets", founderos: true, competitor: false },
    { name: "Goals & OKRs with auto roll-up", founderos: true, competitor: "Manual tracking" },
    { name: "Decision System of Record", founderos: true, competitor: false },
    { name: "Risk register", founderos: true, competitor: false },
    { name: "Chief of Staff AI agent", founderos: true, competitor: "AI auto-fill" },
    { name: "Company Graph linking all modules", founderos: true, competitor: false },
    { name: "Founder Inbox — unified approvals", founderos: true, competitor: false },
    { name: "People & HR basics", founderos: true, competitor: "Add-on product" },
  ],
  ctaText: "Stop building your OS on a spreadsheet — get the real thing",
};
