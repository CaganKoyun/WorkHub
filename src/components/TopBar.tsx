import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Command, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { GlobalSearch } from "./GlobalSearch";
import { cn } from "@/lib/utils";
import { clusterForPath, labelForPath } from "./nav-config";

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMac, setIsMac] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setIsMac(typeof navigator !== "undefined" && /mac/i.test(navigator.platform));
  }, []);

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
    <header className="sticky top-0 z-30 hidden h-12 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:flex">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center text-[13px] font-medium text-muted-foreground">
        <span className="truncate">{cluster.title}</span>
        {leaf && (
          <>
            <ChevronRight className="mx-1 h-3.5 w-3.5 shrink-0 opacity-60" />
            <span className="truncate text-foreground">{leaf}</span>
          </>
        )}
      </nav>

      {/* Global search (Cmd+K) */}
      <div className="relative mx-auto w-full max-w-lg">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className={cn(
            "flex h-8 w-full items-center rounded-full pl-3 pr-2 text-[12.5px]",
            "bg-secondary/70 hover:bg-secondary",
            "border border-transparent transition-colors focus:border-border focus:outline-none focus:ring-2 focus:ring-ring/40",
            "text-muted-foreground"
          )}
        >
          <Search className="mr-2 h-3.5 w-3.5 shrink-0" />
          <span className="truncate">FounderOS içinde ara…</span>
          <kbd className="ml-auto inline-flex h-5 shrink-0 items-center gap-0.5 rounded border border-border bg-background/60 px-1.5 font-mono text-[10px]">
            {isMac ? <><Command className="h-2.5 w-2.5" />K</> : "Ctrl K"}
          </kbd>
        </button>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 rounded-full border-primary/25 bg-primary/5 px-3 text-[12px] font-medium text-primary hover:bg-primary/10 hover:text-primary"
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
