/**
 * Task Quick-Add mini parser.
 *   "Fix login bug #product @cagan !urgent"
 *   →  { title: "Fix login bug", projectHint: "product", assigneeHint: "cagan", priority: "urgent" }
 * Order is free; each token appears anywhere.
 * Pure function → unit-testable.
 */

export type PriorityToken = 'low' | 'medium' | 'high' | 'urgent';

export interface QuickAddParse {
  title: string;
  projectHint: string | null;
  assigneeHint: string | null;
  priority: PriorityToken | null;
  tags: string[];
}

const PRIO_MAP: Record<string, PriorityToken> = {
  low: 'low',      düşük: 'low',
  medium: 'medium', orta: 'medium', med: 'medium',
  high: 'high',    yüksek: 'high',
  urgent: 'urgent', acil: 'urgent', kritik: 'urgent',
};

export function parseQuickAdd(raw: string): QuickAddParse {
  const text = raw.trim();
  if (!text) return { title: '', projectHint: null, assigneeHint: null, priority: null, tags: [] };

  let projectHint: string | null = null;
  let assigneeHint: string | null = null;
  let priority: PriorityToken | null = null;
  const tags: string[] = [];

  const cleaned = text
    // #project
    .replace(/(?:^|\s)#([a-zA-ZğüşıöçĞÜŞİÖÇ][\w-]*)/g, (_m, p1) => {
      // First # is project, subsequent are tags — Linear/GitHub style.
      if (projectHint === null) { projectHint = p1; return ''; }
      tags.push(p1);
      return '';
    })
    // @user
    .replace(/(?:^|\s)@([\w.-]+)/g, (_m, p1) => {
      if (assigneeHint === null) assigneeHint = p1;
      return '';
    })
    // !priority
    .replace(/(?:^|\s)!([a-zA-ZğüşıöçĞÜŞİÖÇ]+)/g, (_m, p1) => {
      const key = p1.toLowerCase();
      if (priority === null && PRIO_MAP[key]) priority = PRIO_MAP[key];
      return '';
    })
    .replace(/\s+/g, ' ')
    .trim();

  return { title: cleaned, projectHint, assigneeHint, priority, tags };
}
