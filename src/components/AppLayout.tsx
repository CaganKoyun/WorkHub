import { createContext, useContext, useState } from "react";
import { Link } from "react-router-dom";
import { AppSidebar, SidebarContent } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Plus } from "lucide-react";
import { StackedLogo } from "./StackedLogo";
import { TopBar } from "./TopBar";

/**
 * Idempotency guard — WorkspaceGate wraps every protected route in
 * AppLayout, but many page components historically wrapped themselves
 * in AppLayout too. Nesting would render two sidebars + two topbars.
 * Context lets a nested <AppLayout> become a passthrough.
 */
const AppLayoutContext = createContext(false);

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const alreadyWrapped = useContext(AppLayoutContext);

  if (alreadyWrapped) return <>{children}</>;

  return (
    <AppLayoutContext.Provider value={true}>
    <div className="flex min-h-screen bg-background">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />

        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex h-11 items-center justify-between border-b border-border bg-background/90 px-3 backdrop-blur md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] bg-sidebar p-0">
              <div className="flex h-full flex-col">
                <SidebarContent isMobile onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-1.5">
            <span className="grid h-5 w-5 place-items-center rounded bg-primary text-primary-foreground">
              <StackedLogo size={11} color="currentColor" />
            </span>
            <span className="text-[14px] font-semibold tracking-tight text-foreground">Spark WorkHub</span>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
            <Link to="/tasks?new=1"><Plus className="h-4 w-4" /></Link>
          </Button>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
    </AppLayoutContext.Provider>
  );
}
