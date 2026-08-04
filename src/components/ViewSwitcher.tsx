import { cn } from "@/lib/utils";
import { List, LayoutGrid, Calendar, GanttChart, Table2, KanbanSquare } from "lucide-react";

export type ViewMode = "list" | "board" | "table" | "timeline" | "calendar" | "grid";

const ICONS: Record<ViewMode, React.ElementType> = {
  list: List,
  board: KanbanSquare,
  table: Table2,
  timeline: GanttChart,
  calendar: Calendar,
  grid: LayoutGrid,
};

const LABELS: Record<ViewMode, string> = {
  list: "List",
  board: "Board",
  table: "Table",
  timeline: "Timeline",
  calendar: "Calendar",
  grid: "Grid",
};

export function ViewSwitcher({
  value,
  onChange,
  views,
  className,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  views: ViewMode[];
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-lg border border-border bg-secondary/40 p-0.5", className)}>
      {views.map(v => {
        const Icon = ICONS[v];
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {LABELS[v]}
          </button>
        );
      })}
    </div>
  );
}
