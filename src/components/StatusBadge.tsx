import { cn } from "@/lib/utils";
import type { Enums } from "@/integrations/supabase/types";

const statusConfig: Record<Enums<"bug_status">, { label: string; dotClass: string; text: string }> = {
  new:         { label: "New",         dotClass: "bg-info",                            text: "text-info" },
  assigned:    { label: "Assigned",    dotClass: "bg-primary",                         text: "text-primary" },
  in_progress: { label: "In Progress", dotClass: "bg-[hsl(var(--status-in-progress))]", text: "text-[hsl(var(--status-in-progress))]" },
  testing:     { label: "Testing",     dotClass: "bg-[hsl(var(--status-review))]",     text: "text-[hsl(var(--status-review))]" },
  resolved:    { label: "Resolved",    dotClass: "bg-[hsl(var(--status-done))]",       text: "text-[hsl(var(--status-done))]" },
  closed:      { label: "Closed",      dotClass: "bg-[hsl(var(--status-canceled))]",   text: "text-muted-foreground" },
};

export function StatusBadge({ status }: { status: Enums<"bug_status"> }) {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px]", config.text)}>
      <span className={cn("h-2 w-2 rounded-full shrink-0", config.dotClass)} />
      {config.label}
    </span>
  );
}
