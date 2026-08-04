import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus, Settings, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { StackedLogo } from "./StackedLogo";
import { clusterForPath, visibleClusters, navItems } from "./nav-config";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useApprovalCounts } from "@/lib/graph-hooks";
import { useModuleAccess } from "@/hooks/useWorkspacePermission";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export { navItems };
export type { NavItem } from "./nav-config";

const createOptions = [
  { label: "Proje", path: "/projects/new", hint: "P" },
  { label: "Görev", path: "/tasks?new=1", hint: "T" },
  { label: "Hata kaydı", path: "/bugs/new", hint: "B" },
  { label: "Onay talebi", path: "/inbox?new=1", hint: "A" },
  { label: "Varlık", path: "/assets/new", hint: "S" },
];

function CreateButton() {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="h-9 w-full justify-center gap-2 rounded-full text-[13px] font-medium shadow-sm">
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Create
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Yeni kayıt
        </DropdownMenuLabel>
        {createOptions.map(o => (
          <DropdownMenuItem key={o.path} onClick={() => navigate(o.path)} className="justify-between">
            <span>{o.label}</span>
            <kbd className="font-mono text-[10px] text-muted-foreground">{o.hint}</kbd>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/ai-chat")}>
          Chief of Staff'a sor…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NavLinkRow({
  item, onNavigate, badge,
}: {
  item: (typeof navItems)[number];
  onNavigate?: () => void;
  badge?: number;
}) {
  const location = useLocation();
  const isActive =
    location.pathname === item.path ||
    (item.path !== "/" && location.pathname.startsWith(item.path + "/"));

  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      className={cn(
        "group relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors duration-150",
        isActive
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
      )}
    >
      {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-primary" />}
      <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "opacity-70")} />
      <span className="flex-1 truncate">{item.label}</span>
      {badge ? (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

/** Inner drawer contents. `all` renders every cluster (mobile sheet). */
export function SidebarContent({
  onNavigate,
  clusterId,
  all = false,
}: {
  onNavigate?: () => void;
  clusterId?: string;
  all?: boolean;
}) {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { onboarding } = useWorkspace();
  const { allowed: financeAllowed } = useModuleAccess("finance", "view");
  const { data: approvalCounts } = useApprovalCounts();
  const inboxCount = approvalCounts?.pending ?? 0;

  // Onboarding'de seçilen modüller nav'ı şekillendirir (çekirdek hep görünür)
  const gated = visibleClusters(onboarding?.enabled_modules);
  const active = gated.find(c => c.id === clusterId) ?? clusterForPath(location.pathname);
  const shown = all ? gated : [active];

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <>
      <div className="flex h-12 items-center gap-2 border-b border-sidebar-border px-3 md:hidden">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-primary-foreground">
          <StackedLogo size={13} color="currentColor" />
        </span>
        <span className="text-[14px] font-semibold tracking-tight text-sidebar-accent-foreground">
          FounderOS
        </span>
      </div>

      <div className="space-y-2.5 px-3 py-3">
        <WorkspaceSwitcher />
        <CreateButton />
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 pb-2">
        {shown.map((cluster, ci) => (
          <div key={cluster.id} className={cn(ci > 0 && "mt-4")}>
            <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/50">
              {cluster.title}
            </div>
            <div className="space-y-px">
              {cluster.sections.flatMap(s => s.items)
                .filter(i => i.path !== "/finance" || financeAllowed)
                .map(item => (
                  <NavLinkRow
                    key={item.path}
                    item={item}
                    onNavigate={onNavigate}
                    badge={item.badgeKey === "inbox" && inboxCount > 0 ? inboxCount : undefined}
                  />
                ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
            Workspace planı
          </div>
          <div className="mt-1 text-[12px] text-sidebar-accent-foreground">Advanced — deneme</div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-sidebar-border">
            <div className="h-full w-2/3 rounded-full bg-primary" />
          </div>
          <Link
            to="/settings"
            onClick={onNavigate}
            className="mt-2 inline-block text-[11px] font-medium text-primary hover:underline"
          >
            Planı yükselt
          </Link>
        </div>

        <div className="mt-2 flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors hover:bg-sidebar-accent/40 md:hidden">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-primary text-[10px] font-semibold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium leading-tight text-sidebar-accent-foreground">
              {profile?.full_name || "User"}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="h-6 w-6" title="Çıkış">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </>
  );
}

export function AppSidebar({ clusterId }: { clusterId?: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex flex-1 flex-col overflow-hidden">
        <SidebarContent clusterId={clusterId} />
      </div>
    </aside>
  );
}
