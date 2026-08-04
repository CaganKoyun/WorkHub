import { Link, useLocation, useNavigate } from "react-router-dom";
import { Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { StackedLogo } from "./StackedLogo";
import { clusterForPath, visibleClusters } from "./nav-config";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useApprovalCounts } from "@/lib/graph-hooks";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function AppRail({
  activeId,
  onSelect,
}: {
  activeId?: string;
  onSelect?: (id: string) => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { onboarding } = useWorkspace();
  const { data: approvalCounts } = useApprovalCounts();
  const shownClusters = visibleClusters(onboarding?.enabled_modules);
  const current = activeId ?? clusterForPath(location.pathname).id;

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <aside className="hidden md:flex w-14 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-3 h-screen sticky top-0">
      <Link
        to="/home"
        className="mb-2 grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"
        aria-label="FounderOS"
      >
        <StackedLogo size={14} color="currentColor" />
      </Link>

      {shownClusters.map(c => {
        const isActive = current === c.id;
        const showDot = c.id === "overview" && (approvalCounts?.pending ?? 0) > 0;
        return (
          <Tooltip key={c.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  onSelect?.(c.id);
                  navigate(c.sections[0].items[0].path);
                }}
                className={cn(
                  "relative flex w-12 flex-col items-center gap-0.5 rounded-lg py-1.5 transition-colors duration-150",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <c.icon className="h-[18px] w-[18px]" />
                <span className="text-[9px] font-medium leading-none tracking-tight">
                  {c.caption}
                </span>
                {showDot && (
                  <span className="absolute right-2 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{c.title}</TooltipContent>
          </Tooltip>
        );
      })}

      <div className="flex-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/settings"
            className="grid h-9 w-9 place-items-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          >
            <Settings className="h-[18px] w-[18px]" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">Ayarlar</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="mt-1 rounded-full ring-offset-sidebar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-sidebar-accent text-[10px] font-semibold text-sidebar-accent-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="w-48">
          <DropdownMenuItem onClick={() => navigate("/settings")}>
            <Settings className="mr-2 h-4 w-4" /> Ayarlar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Çıkış yap
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </aside>
  );
}
