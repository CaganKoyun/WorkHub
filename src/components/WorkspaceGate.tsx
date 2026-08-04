import { Navigate, useLocation } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";

/** Redirects to onboarding wizard until the active workspace is fully set up. */
export function WorkspaceGate({ children }: { children: React.ReactNode }) {
  const { loading, needsOnboarding } = useWorkspace();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  if (needsOnboarding && !location.pathname.startsWith("/onboarding") && !location.pathname.startsWith("/invite")) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
