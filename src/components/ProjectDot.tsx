import { cn } from '@/lib/utils';

/**
 * Tiny colored circle used next to project names in the sidebar, on
 * Kanban cards, and anywhere a project is namechecked. Reads
 * projects.color when present; falls back to a deterministic hue from
 * the project name so an unset color still renders something meaningful.
 */
function fallbackColor(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hue = ((h >>> 0) % 24) * 15;
  return `hsl(${hue} 65% 60%)`;
}

export function ProjectDot({
  color,
  name,
  size = 8,
  className,
}: {
  color?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const c = color?.trim() || fallbackColor(name ?? 'x');
  return (
    <span
      aria-hidden
      className={cn('inline-block shrink-0 rounded-full', className)}
      style={{ width: size, height: size, backgroundColor: c }}
    />
  );
}
