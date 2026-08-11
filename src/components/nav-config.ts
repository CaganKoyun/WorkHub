import {
  LayoutDashboard, Bug, BarChart3, Package, Users, FolderKanban, CheckSquare,
  Home, Inbox, Briefcase, DollarSign, Target, ShieldAlert, Sparkles, Shield, Bookmark, KeyRound, UserRound, Trophy,
  ScrollText, Rocket, Plug, Building2, Compass, Layers, LineChart, Boxes,
  RefreshCw, FileText, Timer, BookOpen, MessageSquare, Zap, ClipboardList, PenSquare, Headphones, Activity,
  Settings, Bot, Mic,
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
    caption: "Ana Sayfa",
    title: "Genel Bakış",
    sections: [
      {
        label: "Genel",
        items: [
          { icon: Home, label: "Ana Sayfa", path: "/home" },
          { icon: Inbox, label: "Gelen Kutusu", path: "/inbox", badgeKey: "inbox" },
          { icon: LayoutDashboard, label: "Kontrol Paneli", path: "/dashboard" },
        ],
      },
    ],
  },
  {
    id: "work",
    icon: Layers,
    caption: "Calisma",
    title: "Çalışma",
    sections: [
      {
        label: "Calisma",
        items: [
          { icon: Layers, label: "Gorevler", path: "/issues" },
          { icon: Bookmark, label: "Görünümler", path: "/views" },
          { icon: RefreshCw, label: "Sprintler", path: "/cycles" },
          { icon: Rocket, label: "Yol Haritasi", path: "/roadmap" },
          { icon: FolderKanban, label: "Projeler", path: "/projects" },
          { icon: Briefcase, label: "Portföyler", path: "/portfolios" },
          { icon: CheckSquare, label: "Gorevlerim", path: "/tasks" },
          { icon: BarChart3, label: "Is Yuku", path: "/workload" },
          { icon: Activity, label: "Analizler", path: "/insights" },
          { icon: Bug, label: "Hatalar", path: "/bugs" },
          { icon: Package, label: "Urun", path: "/product" },
        ],
      },
      {
        label: "Zaman",
        items: [
          { icon: Timer, label: "Zaman Cizelgesi", path: "/timesheet" },
        ],
      },
    ],
  },
  {
    id: "revenue",
    icon: LineChart,
    caption: "Gelir",
    title: "Gelir",
    sections: [
      {
        label: "Gelir",
        items: [
          { icon: Briefcase, label: "CRM", path: "/crm" },
          { icon: DollarSign, label: "Finans", path: "/finance" },
          { icon: BarChart3, label: "Analitik", path: "/analytics" },
        ],
      },
    ],
  },
  {
    id: "strategy",
    icon: Target,
    caption: "Strateji",
    title: "Strateji",
    sections: [
      {
        label: "Strateji",
        items: [
          { icon: Target, label: "Hedefler", path: "/goals" },
          { icon: ShieldAlert, label: "Riskler", path: "/risks" },
          { icon: ScrollText, label: "Kararlar", path: "/decisions" },
        ],
      },
    ],
  },
  {
    id: "operations",
    icon: Boxes,
    caption: "Operasyon",
    title: "Operasyon",
    sections: [
      {
        label: "Operasyon",
        items: [
          { icon: Users, label: "Takimlar", path: "/teams" },
          { icon: Trophy, label: "Skor tablosu", path: "/leaderboard" },
          { icon: Package, label: "Varliklar", path: "/assets" },
          { icon: UserRound, label: "Calisanlar", path: "/employees" },
          { icon: Building2, label: "Sirket", path: "/company" },
          { icon: UserRound, label: "Portallar", path: "/portals" },
          { icon: Shield, label: "Denetim Kaydi", path: "/audit" },
          { icon: Settings, label: "Yonetim", path: "/admin" },
        ],
      },
    ],
  },
  {
    id: "ai",
    icon: Sparkles,
    caption: "Yapay Zeka",
    title: "Yapay Zeka",
    sections: [
      {
        label: "Yapay Zeka",
        items: [
          { icon: Sparkles, label: "Yapay Zeka Asistan", path: "/ai-chat" },
          { icon: Bot, label: "Ajan Calismalari", path: "/agent" },
          { icon: Mic, label: "Toplantı notları", path: "/meetings" },
          { icon: MessageSquare, label: "Mesajlar", path: "/chat" },
          { icon: BookOpen, label: "Belgeler", path: "/docs" },
          { icon: Zap, label: "Otomasyonlar", path: "/automations" },
          { icon: ClipboardList, label: "Formlar", path: "/forms" },
          { icon: PenSquare, label: "Panolar", path: "/whiteboards" },
          { icon: Headphones, label: "Destek Masasi", path: "/desk" },
          { icon: FileText, label: "Sablonlar", path: "/templates" },
          { icon: Plug, label: "Entegrasyonlar", path: "/integrations" },
          { icon: KeyRound, label: "API Anahtarlari", path: "/api-tokens" },
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
  "/portfolios": "work",
  "/tasks": "work",
  "/issues": "work",
  "/cycles": "work",
  "/workload": "work",
  "/insights": "work",
  "/roadmap": "work",
  "/timesheet": "work",
  "/views": "work",
  "/bugs": "work",
  "/product": "work",
  "/analytics": "revenue",
  "/crm": "crm",
  "/finance": "finance",
  "/goals": "goals",
  "/risks": "goals",
  "/assets": "assets",
  "/employees": "people",
  "/company": "people",
  "/teams": "people",
  "/leaderboard": "people",
  "/audit": "people",
  "/admin": "people",
  "/portals": "people",
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
