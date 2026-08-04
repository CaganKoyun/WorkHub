/**
 * Minimal RFC-4180 CSV parser. Handles:
 *   - comma separator (,)
 *   - quoted fields "…"
 *   - escaped quotes "" inside quoted fields
 *   - CRLF or LF line endings
 *   - a header row (first row)
 *
 * No dependency. Enough for exports from Linear, Asana, Trello, Jira,
 * ClickUp, Monday.
 */
export interface CsvParseResult {
  headers: string[];
  rows: string[][];
}

export function parseCsv(input: string): CsvParseResult {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let i = 0;
  let inQuotes = false;
  const len = input.length;

  while (i < len) {
    const c = input[i];

    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }

    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') {
      row.push(field); field = '';
      rows.push(row); row = [];
      if (input[i + 1] === '\n') i += 2; else i++;
      continue;
    }
    if (c === '\n') {
      row.push(field); field = '';
      rows.push(row); row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }

  // Flush last field / row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Strip trailing empty rows
  while (rows.length > 0 && rows[rows.length - 1].every(f => f === '')) {
    rows.pop();
  }

  const [headers = [], ...data] = rows;
  return { headers: headers.map(h => h.trim()), rows: data };
}

/** Given a header string, guess which task field it maps to. */
export function guessTaskField(header: string): string | null {
  const h = header.toLowerCase().trim().replace(/[\s_-]+/g, '');
  const map: Record<string, string> = {
    // title
    title: 'title', name: 'title', task: 'title', issue: 'title',
    summary: 'title', story: 'title', taskname: 'title',
    // description
    description: 'description', body: 'description', notes: 'description',
    details: 'description',
    // status
    status: 'status', state: 'status', stage: 'status', column: 'status',
    // priority
    priority: 'priority', importance: 'priority',
    // assignee
    assignee: 'assignee', owner: 'assignee', assignedto: 'assignee',
    assignto: 'assignee', responsible: 'assignee',
    // due date
    duedate: 'due_date', due: 'due_date', deadline: 'due_date', dueby: 'due_date',
    // tags
    tags: 'tags', labels: 'tags', label: 'tags', tag: 'tags',
    // external id
    id: 'external_id', identifier: 'external_id', key: 'external_id',
    trackingid: 'external_id', ticket: 'external_id', reference: 'external_id',
    // story points
    estimate: 'story_points', points: 'story_points', storypoints: 'story_points',
    // estimated hours
    estimated: 'estimated_hours', estimatedhours: 'estimated_hours',
    effort: 'estimated_hours',
  };
  return map[h] ?? null;
}

/** Task field descriptor used by the importer UI. */
export interface TaskFieldDef {
  key: string;
  label: string;
  required?: boolean;
}

export const IMPORT_TASK_FIELDS: TaskFieldDef[] = [
  { key: 'title',            label: 'Title',          required: true },
  { key: 'description',      label: 'Description' },
  { key: 'status',           label: 'Status' },
  { key: 'priority',         label: 'Priority' },
  { key: 'assignee',         label: 'Assignee (email or name)' },
  { key: 'due_date',         label: 'Due date' },
  { key: 'tags',             label: 'Tags (comma-separated)' },
  { key: 'story_points',     label: 'Story points' },
  { key: 'estimated_hours',  label: 'Estimated hours' },
  { key: 'external_id',      label: 'External ID (for note)' },
];

const STATUS_ALIASES: Record<string, string> = {
  backlog: 'backlog',
  todo: 'todo', 'to do': 'todo', 'to-do': 'todo', open: 'todo', new: 'todo',
  'in progress': 'in_progress', 'in-progress': 'in_progress', doing: 'in_progress',
  wip: 'in_progress', started: 'in_progress',
  review: 'review', 'in review': 'review', 'code review': 'review',
  qa: 'review', testing: 'review',
  done: 'done', complete: 'done', completed: 'done', closed: 'done',
  resolved: 'done', finished: 'done', shipped: 'done',
};

const PRIORITY_ALIASES: Record<string, string> = {
  urgent: 'urgent', critical: 'urgent', p0: 'urgent', highest: 'urgent',
  high: 'high', p1: 'high', important: 'high',
  medium: 'medium', normal: 'medium', p2: 'medium', med: 'medium',
  low: 'low', p3: 'low', p4: 'low', minor: 'low',
};

export function normalizeStatus(raw: string): string | null {
  const k = raw.toLowerCase().trim();
  return STATUS_ALIASES[k] ?? null;
}

export function normalizePriority(raw: string): string | null {
  const k = raw.toLowerCase().trim();
  return PRIORITY_ALIASES[k] ?? null;
}

export function parseTags(raw: string): string[] {
  if (!raw) return [];
  return raw.split(/[,;|]/).map(t => t.trim()).filter(Boolean);
}

/** Convert MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD to YYYY-MM-DD if possible. */
export function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  const t = raw.trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(t)) return t.slice(0, 10);
  const parts = t.split(/[\/\-.]/).map(p => p.trim());
  if (parts.length === 3) {
    const [a, b, c] = parts;
    // Heuristic: if first is 4-digit → YYYY-MM-DD
    if (a.length === 4) return `${a.padStart(4,'0')}-${b.padStart(2,'0')}-${c.padStart(2,'0')}`;
    // If last is 4-digit → could be MM/DD/YYYY or DD/MM/YYYY. Assume DD/MM.
    if (c.length === 4) return `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
  }
  // Fallback: Date parse
  const d = new Date(t);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}
