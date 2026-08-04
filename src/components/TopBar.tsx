import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { GlobalSearch } from "./GlobalSearch";
import { clusterForPath, labelForPath } from "./nav-config";
import { useActiveTimer, useStopTimer, useElapsedSeconds, formatHMS } from "@/lib/time-tracking-hooks";

function ActiveTimerChip() {
  const navigate = useNavigate();
  const { data: active } = useActiveTimer();
  const stop = useStopTimer();
  const elapsed = useElapsedSeconds(active?.started_at);
  if (!active) return null;
  return (
    <div className="flex items-center gap-1 rounded-full border border-[hsl(var(--status-in-progress))/50] bg-[hsl(var(--status-in-progress))/12] px-1.5 py-0.5 text-[11.5px]">
      <button
        type="button"
        onClick={() => navigate('/timesheet')}
        className="font-mono tabular-nums text-[hsl(var(--status-in-progress))]"
        title="Timesheet'e git"
      >
        {formatHMS(elapsed)}
      </button>
      <button
        type="button"
        onClick={() => stop.mutate()}
        className="h-4 w-4 grid place-items-center rounded-full hover:bg-[hsl(var(--status-in-progress))/20]"
        title="Timer'ı durdur"
      >
        <Square className="h-2.5 w-2.5" fill="currentColor" />
      </button>
    </div>
  );
}

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cluster = clusterForPath(location.pathname);
  const leaf = labelForPath(location.pathname);

  return (
    <header className="sticky top-0 z-30 hidden h-11 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:flex">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center text-[13px] text-muted-foreground">
        <span className="truncate">{cluster.title}</span>
        {leaf && (
          <>
            <ChevronRight className="mx-1 h-3.5 w-3.5 shrink-0 opacity-60" />
            <span className="truncate font-medium text-foreground">{leaf}</span>
          </>
        )}
      </nav>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      <div className="flex items-center gap-1">
        <ActiveTimerChip />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 px-2 text-[12px] font-medium text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/ai-chat")}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Ask AI
        </Button>
        <NotificationBell />
        <ThemeToggle />
      </div>
    </header>
  );
}
