import { Navigate, useLocation } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { AppLayout } from "./AppLayout";

/**
 * Every protected route passes through here. Provides two things:
 *  1. Onboarding redirect until the active workspace is set up.
 *  2. The AppLayout shell (sidebar + topbar) — so no page has to
 *     remember to wrap itself, and no page can render orphaned
 *     without a way back to the rest of the app.
 */
export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const { loading, needsOnboarding } = useWorkspace();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Çalışma alanı yükleniyor…
      </div>
    );
  }

  if (needsOnboarding && !location.pathname.startsWith("/onboarding") && !location.pathname.startsWith("/invite")) {
    return <Navigate to="/onboarding" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}
