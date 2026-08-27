import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/tasks-types";

/**
 * Linear-style outline status circles.
 * - todo: empty ring
 * - in_progress: partially filled arc (~65%)
 * - review: half filled with dashed accent
 * - done: solid ring with check
 * - backlog: dashed ring (used when a task has no status yet — future)
 * - canceled: X inside ring (future)
 */
type StatusKey = TaskStatus | "canceled" | "cancelled";

export function TaskStatusIcon({
  status,
  size = 14,
  className,
}: {
  status: StatusKey;
  size?: number;
  className?: string;
}) {
  const s = size;
  const r = (s - 2) / 2;
  const cx = s / 2;
  const cy = s / 2;
  const circumference = 2 * Math.PI * r;

  const common = { cx, cy, r, fill: "none", strokeWidth: 1.5 } as const;

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      className={cn("shrink-0", className)}
      aria-hidden
    >
      {status === "backlog" && (
        <circle {...common} stroke="hsl(var(--status-backlog))" strokeDasharray="2 2.4" />
      )}

      {status === "todo" && (
        <circle {...common} stroke="hsl(var(--status-todo))" />
      )}

      {status === "in_progress" && (
        <>
          <circle {...common} stroke="hsl(var(--status-in-progress) / 0.35)" />
          <circle
            {...common}
            stroke="hsl(var(--status-in-progress))"
            strokeLinecap="round"
            strokeDasharray={`${circumference * 0.65} ${circumference}`}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        </>
      )}

      {status === "review" && (
        <>
          <circle {...common} stroke="hsl(var(--status-review) / 0.4)" />
          <path
            d={`M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} Z`}
            fill="hsl(var(--status-review))"
          />
        </>
      )}

      {status === "done" && (
        <>
          <circle cx={cx} cy={cy} r={r} fill="hsl(var(--status-done))" />
          <path
            d={`M ${cx - r * 0.55} ${cy} l ${r * 0.4} ${r * 0.4} l ${r * 0.85} -${r * 0.85}`}
            fill="none"
            stroke="hsl(var(--primary-foreground))"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}

      {(status === "cancelled" || status === "canceled") && (
        <>
          <circle {...common} stroke="hsl(var(--status-canceled))" />
          <path
            d={`M ${cx - r * 0.45} ${cy - r * 0.45} l ${r * 0.9} ${r * 0.9} M ${cx + r * 0.45} ${cy - r * 0.45} l -${r * 0.9} ${r * 0.9}`}
            stroke="hsl(var(--status-canceled))"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

/** Bar-chart priority glyph (Linear style: 3 rising bars, filled up to level). */
export function TaskPriorityIcon({
  priority,
  size = 14,
  className,
}: {
  priority: "low" | "medium" | "high" | "urgent" | "none";
  size?: number;
  className?: string;
}) {
  const level =
    priority === "urgent" ? 4 :
    priority === "high" ? 3 :
    priority === "medium" ? 2 :
    priority === "low" ? 1 : 0;

  const color =
    priority === "urgent" ? "hsl(var(--priority-urgent))" :
    priority === "high" ? "hsl(var(--priority-high))" :
    priority === "medium" ? "hsl(var(--priority-medium))" :
    priority === "low" ? "hsl(var(--priority-low))" :
    "hsl(var(--priority-none))";

  const dim = "hsl(var(--muted-foreground) / 0.35)";
  const bars = [
    { x: 1, h: 4, y: 9 },
    { x: 5, h: 7, y: 6 },
    { x: 9, h: 10, y: 3 },
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      className={cn("shrink-0", className)}
      aria-label={`Priority: ${priority}`}
    >
      {priority === "urgent" ? (
        <>
          <rect x="6" y="2" width="2" height="6" rx="1" fill={color} />
          <rect x="6" y="10" width="2" height="2" rx="1" fill={color} />
        </>
      ) : (
        bars.map((b, i) => (
          <rect
            key={i}
            x={b.x}
            y={b.y}
            width="3"
            height={b.h}
            rx="0.75"
            fill={i < level ? color : dim}
          />
        ))
      )}
    </svg>
  );
}
