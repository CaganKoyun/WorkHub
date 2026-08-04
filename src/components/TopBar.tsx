import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { GlobalSearch } from "./GlobalSearch";
import { clusterForPath, labelForPath } from "./nav-config";

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
