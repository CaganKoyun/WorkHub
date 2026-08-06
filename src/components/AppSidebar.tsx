import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Plus, Search, LogOut, ChevronDown, ChevronRight, Command,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SparkLogo } from "./SparkLogo";
import { clusters, visibleClusters, navItems, type NavCluster, type NavItem } from "./nav-config";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useApprovalCounts } from "@/lib/graph-hooks";
import { useModuleAccess } from "@/hooks/useWorkspacePermission";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { GlobalSearch } from "./GlobalSearch";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export { navItems };
export type { NavItem } from "./nav-config";

const createOptions = [
  { label: "New issue",   path: "/tasks?new=1",   hint: "C" },
  { label: "New project", path: "/projects/new",  hint: "P" },
  { label: "New bug",     path: "/bugs/new",      hint: "B" },
  { label: "New approval",path: "/inbox?new=1",   hint: "A" },
  { label: "New asset",   path: "/assets/new",    hint: "S" },
];

function NewIssueButton() {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-8 flex-1 items-center gap-2 rounded-md border border-sidebar-border/70 bg-sidebar-accent/50 px-2.5",
            "text-[13px] font-medium text-sidebar-accent-foreground",
            "transition-colors hover:bg-sidebar-accent hover:border-sidebar-border"
          )}
        >
          <span className="grid h-4 w-4 place-items-center rounded-sm bg-primary/90 text-primary-foreground">
            <Plus className="h-3 w-3" strokeWidth={2.5} />
          </span>
          <span className="flex-1 text-left">New issue</span>
          <kbd className="kbd">C</kbd>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Yeni kayıt
        </DropdownMenuLabel>
        {createOptions.map(o => (
          <DropdownMenuItem key={o.path} onClick={() => navigate(o.path)} className="justify-between">
            <span>{o.label}</span>
            <kbd className="kbd">{o.hint}</kbd>
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

function SearchTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Search"
      className={cn(
        "grid h-8 w-8 place-items-center rounded-md border border-sidebar-border/70 bg-sidebar-accent/50",
        "text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
      title="Search (⌘K)"
    >
      <Search className="h-3.5 w-3.5" />
    </button>
  );
}

function NavRow({
  item, onNavigate, badge,
}: {
  item: NavItem;
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
        "group relative flex h-7 items-center gap-2 rounded-md px-2 text-[12.5px] transition-colors",
        isActive
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
      )}
    >
      <item.icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "opacity-70")} />
      <span className="flex-1 truncate">{item.label}</span>
      {badge ? (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function ClusterGroup({
  cluster, defaultOpen, onNavigate, inboxCount, financeAllowed,
}: {
  cluster: NavCluster;
  defaultOpen: boolean;
  onNavigate?: () => void;
  inboxCount: number;
  financeAllowed: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const items = cluster.sections.flatMap(s => s.items)
    .filter(i => i.path !== "/finance" || financeAllowed);

  return (
    <div className="mt-3 first:mt-1">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="group flex h-6 w-full items-center gap-1.5 rounded px-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/50 transition-colors hover:text-sidebar-accent-foreground"
      >
        <ChevronRight
          className={cn(
            "h-3 w-3 opacity-0 transition-all group-hover:opacity-100",
            open && "rotate-90 opacity-100"
          )}
        />
        <cluster.icon className="h-3 w-3 opacity-60" />
        <span className="flex-1 text-left">{cluster.title}</span>
      </button>
      {open && (
        <div className="mt-0.5 space-y-px pl-2">
          {items.map(item => (
            <NavRow
              key={item.path}
              item={item}
              onNavigate={onNavigate}
              badge={item.badgeKey === "inbox" && inboxCount > 0 ? inboxCount : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SidebarContent({
  onNavigate,
  isMobile = false,
}: {
  onNavigate?: () => void;
  isMobile?: boolean;
  /** kept for API compatibility with old callers */
  clusterId?: string;
  all?: boolean;
}) {
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { onboarding } = useWorkspace();
  const { allowed: financeAllowed } = useModuleAccess("finance", "view");
  const { data: approvalCounts } = useApprovalCounts();
  const inboxCount = approvalCounts?.pending ?? 0;
  const [searchOpen, setSearchOpen] = useState(false);

  const shown = visibleClusters(onboarding?.enabled_modules);

  // Split: first cluster (Overview) always expanded at top w/o header;
  // rest render as collapsible groups.
  const [top, ...rest] = shown;
  const activePath = location.pathname;

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <>
      {isMobile && (
        <div className="flex h-11 items-center border-b border-sidebar-border px-3 text-sidebar-accent-foreground">
          <SparkLogo size={15} />
        </div>
      )}

      {/* Workspace + actions */}
      <div className="space-y-2 px-2 pt-2">
        <WorkspaceSwitcher />
        <div className="flex items-center gap-2">
          <NewIssueButton />
          <SearchTrigger onOpen={() => setSearchOpen(true)} />
        </div>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Nav */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 pt-3 pb-2">
        {/* Overview items, no header */}
        {top && (
          <div className="space-y-px">
            {top.sections.flatMap(s => s.items).map(item => (
              <NavRow
                key={item.path}
                item={item}
                onNavigate={onNavigate}
                badge={item.badgeKey === "inbox" && inboxCount > 0 ? inboxCount : undefined}
              />
            ))}
          </div>
        )}

        {/* Everything else as collapsible groups */}
        {rest.map(cluster => {
          const containsActive = cluster.sections.some(s =>
            s.items.some(i => activePath === i.path || activePath.startsWith(i.path + "/"))
          );
          return (
            <ClusterGroup
              key={cluster.id}
              cluster={cluster}
              defaultOpen={containsActive || cluster.id === "work"}
              onNavigate={onNavigate}
              inboxCount={inboxCount}
              financeAllowed={financeAllowed}
            />
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border/60 px-2 py-2">
        <Link
          to="/settings"
          onClick={onNavigate}
          className="flex h-8 items-center gap-2 rounded-md px-2 text-[12.5px] text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <Avatar className="h-5 w-5">
            <AvatarFallback className="bg-primary/90 text-[9px] font-semibold text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate">{profile?.full_name || "User"}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="mt-1 flex h-7 w-full items-center gap-2 rounded-md px-2 text-[12px] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-3.5 w-3.5" /> Çıkış yap
        </button>
      </div>
    </>
  );
}

export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex flex-1 flex-col overflow-hidden">
        <SidebarContent />
      </div>
    </aside>
  );
}
