import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { TaskStatusIcon, TaskPriorityIcon } from "./TaskStatusIcon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Task } from "@/lib/tasks-types";

interface TaskRowProps {
  task: Task;
  projectName?: string;
  assigneeName?: string | null;
  href?: string;
  onClick?: () => void;
  rightSlot?: React.ReactNode;
  className?: string;
}

/**
 * Linear-style compact task row.
 * [priority] [WH-123] [status] [title]  ...  [project] [date] [avatar]
 */
export function TaskRow({
  task, projectName, assigneeName, href, onClick, rightSlot, className,
}: TaskRowProps) {
  const inner = (
    <>
      <TaskPriorityIcon priority={task.priority} />
      <span className="font-mono text-[11px] text-muted-foreground/80 tabular-nums shrink-0 w-16">
        {task.tracking_id ?? "WH-—"}
      </span>
      <TaskStatusIcon status={task.status} />
      <span className="min-w-0 flex-1 truncate text-foreground">{task.title}</span>

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

      {task.due_date && (
        <span className="text-[11.5px] tabular-nums text-muted-foreground shrink-0">
          {format(new Date(task.due_date), "MMM d")}
        </span>
      )}

      <Avatar className="h-5 w-5 shrink-0">
        <AvatarFallback className="bg-sidebar-accent text-[9px] font-semibold text-sidebar-accent-foreground">
          {(assigneeName ?? "").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "·"}
        </AvatarFallback>
      </Avatar>

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
