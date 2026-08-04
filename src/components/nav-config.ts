import {
  LayoutDashboard, Bug, BarChart3, Package, Users, FolderKanban, CheckSquare,
  Home, Inbox, Briefcase, DollarSign, Target, ShieldAlert, Sparkles,
  ScrollText, Rocket, Plug, Building2, Compass, Layers, LineChart, Boxes,
} from "lucide-react";

export type NavItem = {
  icon: React.ElementType;
  label: string;
  path: string;
  badgeKey?: "inbox";
};

export type NavCluster = {
  id: string;
  /** rail icon + rail caption */
  icon: React.ElementType;
  caption: string;
  /** inner-sidebar heading */
  title: string;
  sections: { label: string; items: NavItem[] }[];
};

export const clusters: NavCluster[] = [
  {
    id: "overview",
    icon: Compass,
    caption: "Home",
    title: "Genel Bakış",
    sections: [
      {
        label: "Overview",
        items: [
          { icon: Home, label: "Founder Home", path: "/home" },
          { icon: Inbox, label: "Inbox", path: "/inbox", badgeKey: "inbox" },
          { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
        ],
      },
    ],
  },
  {
    id: "work",
    icon: Layers,
    caption: "Work",
    title: "Çalışma",
    sections: [
      {
        label: "Work",
        items: [
          { icon: FolderKanban, label: "Projects", path: "/projects" },
          { icon: CheckSquare, label: "My Tasks", path: "/tasks" },
          { icon: Bug, label: "Bugs", path: "/bugs" },
          { icon: Rocket, label: "Product", path: "/product" },
        ],
      },
    ],
  },
  {
    id: "revenue",
    icon: LineChart,
    caption: "Revenue",
    title: "Gelir",
    sections: [
      {
        label: "Revenue",
        items: [
          { icon: Briefcase, label: "CRM", path: "/crm" },
          { icon: DollarSign, label: "Finance", path: "/finance" },
          { icon: BarChart3, label: "Analytics", path: "/analytics" },
        ],
      },
    ],
  },
  {
    id: "strategy",
    icon: Target,
    caption: "Strategy",
    title: "Strateji",
    sections: [
      {
        label: "Strategy",
        items: [
          { icon: Target, label: "Goals", path: "/goals" },
          { icon: ShieldAlert, label: "Risks", path: "/risks" },
          { icon: ScrollText, label: "Decisions", path: "/decisions" },
        ],
      },
    ],
  },
  {
    id: "operations",
    icon: Boxes,
    caption: "Ops",
    title: "Operasyon",
    sections: [
      {
        label: "Operations",
        items: [
          { icon: Package, label: "Assets", path: "/assets" },
          { icon: Users, label: "Employees", path: "/employees" },
          { icon: Building2, label: "Company", path: "/company" },
        ],
      },
    ],
  },
  {
    id: "ai",
    icon: Sparkles,
    caption: "AI",
    title: "Yapay Zeka",
    sections: [
      {
        label: "AI",
        items: [
          { icon: Sparkles, label: "Chief of Staff", path: "/ai-chat" },
          { icon: Plug, label: "Integrations", path: "/integrations" },
        ],
      },
    ],
  },
];

/** flat list, kept for backwards compatibility with existing imports */
export const navItems: NavItem[] = clusters.flatMap(c =>
  c.sections.flatMap(s => s.items)
);

// ---------------------------------------------------------------------------
// Modül gating: onboarding'de seçilen enabled_modules nav'ı şekillendirir.
// Eşlenmemiş path'ler çekirdektir (home, inbox, decisions, ai...) ve her
// zaman görünür. Boş/eksik enabled_modules = hiç seçim yapılmamış → tümü açık.
// ---------------------------------------------------------------------------
export const PATH_MODULE: Record<string, string> = {
  "/projects": "work",
  "/tasks": "work",
  "/bugs": "work",
  "/product": "work",
  "/analytics": "work",
  "/crm": "crm",
  "/finance": "finance",
  "/goals": "goals",
  "/risks": "goals",
  "/assets": "assets",
  "/employees": "people",
};

export function visibleClusters(enabledModules: string[] | null | undefined): NavCluster[] {
  if (!enabledModules || enabledModules.length === 0) return clusters;
  const on = new Set(enabledModules);
  return clusters
    .map((c) => ({
      ...c,
      sections: c.sections
        .map((s) => ({
          ...s,
          items: s.items.filter((i) => {
            const mod = PATH_MODULE[i.path];
            return !mod || on.has(mod);
          }),
        }))
        .filter((s) => s.items.length > 0),
    }))
    .filter((c) => c.sections.length > 0);
}

export function clusterForPath(pathname: string): NavCluster {
  const match = clusters.find(c =>
    c.sections.some(s =>
      s.items.some(i => pathname === i.path || pathname.startsWith(i.path + "/"))
    )
  );
  return match ?? clusters[0];
}

export function labelForPath(pathname: string): string | undefined {
  const item = navItems
    .filter(i => pathname === i.path || pathname.startsWith(i.path + "/"))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return item?.label;
}
