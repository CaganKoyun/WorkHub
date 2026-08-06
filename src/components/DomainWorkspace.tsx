import type { ReactNode } from "react";
import { DomainAgentPanel } from "./DomainAgentPanel";
import type { DomainKey } from "@/lib/domain-agents";
// AppLayout is provided by WorkspaceGate at the route level — no
// wrapper needed here or we would double-nest the sidebar/topbar.

interface Props {
  domain: DomainKey;
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  /** Optional Asana-style tab strip rendered under the title row */
  tabs?: ReactNode;
  children: ReactNode;
  showAgent?: boolean;
  maxWidth?: string;
}

/**
 * Asana-style domain shell: white page header (title row + optional tab strip),
 * then the cockpit on a light canvas with the expert agent rail on the right.
 */
export function DomainWorkspace({
  domain,
  title,
  subtitle,
  headerActions,
  tabs,
  children,
  showAgent = true,
  maxWidth = "max-w-[1600px]",
}: Props) {
  return (
    <div className="flex min-h-full flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
          <div className={`${maxWidth} mx-auto w-full px-4 lg:px-6`}>
            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <h1 className="truncate text-[20px] font-semibold leading-tight tracking-tight">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{subtitle}</p>
                )}
              </div>
              {headerActions && (
                <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
              )}
            </div>
            {tabs && (
              <div className="scrollbar-thin -mb-px flex items-center gap-1 overflow-x-auto">
                {tabs}
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 bg-canvas">
          <div className={`${maxWidth} mx-auto w-full px-4 py-5 lg:px-6`}>
            {showAgent ? (
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-6">
                <div className="min-w-0 space-y-4">{children}</div>
                <DomainAgentPanel domain={domain} />
              </div>
            ) : (
              <div className="space-y-4">{children}</div>
            )}
          </div>
        </div>
    </div>
  );
}
