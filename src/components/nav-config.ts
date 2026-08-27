import {
  LayoutDashboard, Bug, BarChart3, Package, Users, FolderKanban, CheckSquare,
  Home, Inbox, Briefcase, DollarSign, Target, ShieldAlert, Sparkles, Shield, Bookmark, KeyRound, UserRound, Trophy,
  ScrollText, Rocket, Plug, Building2, Compass, Layers, LineChart, Boxes,
  RefreshCw, Timer, BookOpen, MessageSquare, Zap, Headphones, Activity,
  Settings, Flame,
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
          { icon: Flame, label: "Spark HQ", path: "/spark-hq" },
        ],
      },
    ],
  },
  {
    id: "work",
    icon: Layers,
    caption: "Çalışma",
    title: "Çalışma",
    sections: [
      {
        label: "Çalışma",
        items: [
          { icon: Layers, label: "Görevler", path: "/issues" },
          { icon: Bookmark, label: "Görünümler", path: "/views" },
          { icon: RefreshCw, label: "Sprintler", path: "/cycles" },
          { icon: Rocket, label: "Yol Haritası", path: "/roadmap" },
          { icon: FolderKanban, label: "Projeler", path: "/projects" },
          { icon: CheckSquare, label: "Görevlerim", path: "/tasks" },
          { icon: BarChart3, label: "İş Yükü", path: "/workload" },
          { icon: Activity, label: "İçgörüler", path: "/insights" },
          { icon: Bug, label: "Hatalar", path: "/bugs" },
          { icon: Package, label: "Ürün", path: "/product" },
        ],
      },
      {
        label: "Zaman",
        items: [
          { icon: Timer, label: "Zaman Çizelgesi", path: "/timesheet" },
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
          { icon: Users, label: "Takımlar", path: "/teams" },
          { icon: Trophy, label: "Skor Tablosu", path: "/leaderboard" },
          { icon: Package, label: "Varlıklar", path: "/assets" },
          { icon: UserRound, label: "Çalışanlar", path: "/employees" },
          { icon: Building2, label: "Şirket", path: "/company" },
          { icon: UserRound, label: "Portallar", path: "/portals" },
          { icon: Shield, label: "Denetim Kaydı", path: "/audit" },
          { icon: Settings, label: "Yönetim", path: "/admin" },
        ],
      },
    ],
  },
  {
    id: "tools",
    icon: BookOpen,
    caption: "Araçlar",
    title: "Araçlar",
    sections: [
      {
        label: "İletişim",
        items: [
          { icon: MessageSquare, label: "Mesajlar", path: "/chat" },
          { icon: Headphones, label: "Destek Masası", path: "/desk" },
        ],
      },
      {
        label: "İçerik",
        items: [
          { icon: BookOpen, label: "Belgeler", path: "/docs" },
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
          { icon: Sparkles, label: "Yapay Zeka Asistanı", path: "/ai-chat" },
          { icon: Zap, label: "Otomasyonlar", path: "/automations" },
        ],
      },
    ],
  },
  {
    id: "settings",
    icon: Settings,
    caption: "Ayarlar",
    title: "Ayarlar",
    sections: [
      {
        label: "Ayarlar",
        items: [
          { icon: Building2, label: "Workspace Ayarları", path: "/workspace/settings" },
          { icon: UserRound, label: "Hesap Ayarları", path: "/settings" },
          { icon: Plug, label: "Entegrasyonlar", path: "/integrations" },
          { icon: KeyRound, label: "API Anahtarları", path: "/api-tokens" },
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
