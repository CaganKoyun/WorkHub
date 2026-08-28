import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { format, differenceInDays, startOfDay } from "date-fns";
import { tr } from "date-fns/locale";
import { Repeat, Ban, AlertTriangle } from "lucide-react";
import { TaskStatusIcon, TaskPriorityIcon } from "./TaskStatusIcon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Task } from "@/lib/tasks-types";

interface TaskRowProps {
  task: Task;
  projectName?: string;
  assigneeName?: string | null;
  href?: string;
  onClick?: () => void;
  rightSlot?: React.ReactNode;
  className?: string;
  isBlocked?: boolean;
  subtaskProgress?: { done: number; total: number } | null;
}

function dueDateStyle(due: string, status: string): { className: string; label: string } {
  if (status === "done") return { className: "text-muted-foreground", label: format(new Date(due), "d MMM", { locale: tr }) };
  const today = startOfDay(new Date());
  const dueDate = startOfDay(new Date(due));
  const diff = differenceInDays(dueDate, today);
  if (diff < 0) return { className: "text-red-400 font-medium", label: `${Math.abs(diff)}g gecikmiş` };
  if (diff === 0) return { className: "text-amber-400 font-medium", label: "Bugün" };
  if (diff === 1) return { className: "text-amber-400/80", label: "Yarın" };
  if (diff <= 3) return { className: "text-amber-400/60", label: format(new Date(due), "d MMM", { locale: tr }) };
  return { className: "text-muted-foreground", label: format(new Date(due), "d MMM", { locale: tr }) };
}

export function TaskRow({
  task, projectName, assigneeName, href, onClick, rightSlot, className,
  isBlocked, subtaskProgress,
}: TaskRowProps) {
  const dueInfo = task.due_date ? dueDateStyle(task.due_date, task.status) : null;

  const inner = (
    <>
      <TaskPriorityIcon priority={task.priority} />
      <span className="font-mono text-[11px] text-muted-foreground/80 tabular-nums shrink-0 w-16">
        {task.tracking_id ?? "WH-—"}
      </span>
      <TaskStatusIcon status={task.status} />
      <span className="min-w-0 flex-1 truncate text-foreground">{task.title}</span>

      {isBlocked && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="hidden md:inline-flex h-4 w-4 items-center justify-center text-red-400/80 shrink-0">
              <Ban className="h-3 w-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[11px]">Engellenen görev</TooltipContent>
        </Tooltip>
      )}

      {subtaskProgress && subtaskProgress.total > 0 && (
        <span className="hidden md:inline-flex items-center gap-1 text-[10.5px] tabular-nums text-muted-foreground shrink-0">
          <span className="h-1 w-8 rounded-full bg-border overflow-hidden">
            <span
              className="block h-full rounded-full bg-emerald-500/70"
              style={{ width: `${(subtaskProgress.done / subtaskProgress.total) * 100}%` }}
            />
          </span>
          {subtaskProgress.done}/{subtaskProgress.total}
        </span>
      )}

      {task.recurrence && (
        <span
          title={`Tekrar: her ${task.recurrence.interval || 1} ${task.recurrence.freq}`}
          className="hidden md:inline-flex h-4 w-4 items-center justify-center text-muted-foreground/70 shrink-0"
        >
          <Repeat className="h-3 w-3" />
        </span>
      )}

      {projectName && (
        <span className="hidden md:inline-block max-w-[140px] truncate text-[11.5px] text-muted-foreground shrink-0">
          {projectName}
        </span>
      )}

      {task.story_points != null && (
        <span className="hidden md:inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-secondary/40 px-1.5 font-mono text-[10.5px] tabular-nums text-muted-foreground shrink-0">
          {task.story_points}
        </span>
      )}

      {dueInfo && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("text-[11.5px] tabular-nums shrink-0", dueInfo.className)}>
              {dueInfo.label}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[11px]">
            Son tarih: {format(new Date(task.due_date!), "d MMM yyyy")}
          </TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Avatar className="h-5 w-5 shrink-0">
            <AvatarFallback className="bg-sidebar-accent text-[9px] font-semibold text-sidebar-accent-foreground">
              {(assigneeName ?? "").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "·"}
            </AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[11px]">
          {assigneeName || "Atanmamış"}
        </TooltipContent>
      </Tooltip>

      {rightSlot}
    </>
  );

  const classes = cn("issue-row group", className);

  if (href) {
    return (
      <Link to={href} className={classes}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={classes} onClick={onClick} role={onClick ? "button" : undefined}>
      {inner}
    </div>
  );
}
