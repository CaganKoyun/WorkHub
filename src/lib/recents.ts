/**
 * Command-palette recents (localStorage). Per-user + per-workspace keyed so
 * different tenants don't leak items across each other on the same machine.
 * Bounded to MAX entries, most-recent first, deduped by (kind,id).
 */
export type RecentKind =
  | 'task' | 'project' | 'bug' | 'decision'
  | 'approval' | 'company' | 'doc';

export interface RecentItem {
  kind: RecentKind;
  id: string;
  label: string;
  sublabel?: string;
  to: string;
  ts: number;
}

const MAX = 8;

function storageKey(userId: string | null, workspaceId: string | null) {
  return `wh:recents:${userId ?? 'anon'}:${workspaceId ?? 'none'}`;
}

export function loadRecents(userId: string | null, workspaceId: string | null): RecentItem[] {
  try {
    const raw = localStorage.getItem(storageKey(userId, workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r): r is RecentItem =>
      r && typeof r.kind === 'string' && typeof r.id === 'string'
      && typeof r.label === 'string' && typeof r.to === 'string'
      && typeof r.ts === 'number'
    ).slice(0, MAX);
  } catch {
    return [];
  }
}

export function pushRecent(
  userId: string | null,
  workspaceId: string | null,
  item: Omit<RecentItem, 'ts'>,
): RecentItem[] {
  const now = Date.now();
  const current = loadRecents(userId, workspaceId);
  const filtered = current.filter(r => !(r.kind === item.kind && r.id === item.id));
  const next = [{ ...item, ts: now }, ...filtered].slice(0, MAX);
  try {
    localStorage.setItem(storageKey(userId, workspaceId), JSON.stringify(next));
  } catch {
    // quota / disabled — silent
  }
  return next;
}

export function clearRecents(userId: string | null, workspaceId: string | null) {
  try {
    localStorage.removeItem(storageKey(userId, workspaceId));
  } catch { /* noop */ }
}
