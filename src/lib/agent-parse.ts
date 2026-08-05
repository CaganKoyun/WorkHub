/**
 * WorkHub agent — direktifi araç çağrılarına dönüştüren heuristik parser.
 * LLM-backed planner bu dosyayı bir gün değiştirir; kontrat aynı kalır:
 *   parseDirective(text) → Plan (list of steps)
 * Every step names a `tool` from the AGENT_TOOLS registry and its params.
 */

export type ToolId =
  | 'update_task_status'      // bulk: match tasks by filter → set status
  | 'assign_tasks'            // bulk: match by filter → set assignee
  | 'add_tag_to_tasks'        // bulk: match by filter → append tag
  | 'notify_user'             // enqueue push for a user
  | 'noop';                   // when nothing matched

export interface StepFilter {
  status?: string[];          // task status filter
  priority?: string[];        // task priority filter
  tags?: string[];            // tag inclusion filter
  updated_before_days?: number;
}

export interface PlanStep {
  tool: ToolId;
  params: {
    filter?: StepFilter;
    assignee_name?: string;   // resolved to id at exec time
    new_status?: string;
    tag?: string;
    user_name?: string;
    title?: string;
    body?: string;
  };
  description: string;         // human-readable "what will happen"
}

export interface AgentTool {
  id: ToolId;
  label: string;
  description: string;
}

export const AGENT_TOOLS: AgentTool[] = [
  { id: 'update_task_status', label: 'Task durumunu değiştir',   description: 'Filtreye uyan task’ların durumunu belirtilene çeker.' },
  { id: 'assign_tasks',       label: 'Task ata',                 description: 'Filtreye uyan task’ları bir kullanıcıya atar.' },
  { id: 'add_tag_to_tasks',   label: 'Task’lara etiket ekle',    description: 'Filtreye uyan task’lara yeni etiket ekler.' },
  { id: 'notify_user',        label: 'Kullanıcıya push at',      description: 'Belirli bir kullanıcıya bildirim kuyruğuna push atar.' },
  { id: 'noop',               label: 'İşlem yok',                description: 'Direktif anlaşılamadı — el ile plan gerekli.' },
];

// ---- Small NLP helpers --------------------------------------------------

const STATUS_MAP: Record<string, string> = {
  'backlog': 'backlog',
  'todo': 'todo', 'yapılacak': 'todo', 'yapilacak': 'todo',
  'in_progress': 'in_progress', 'in progress': 'in_progress',
  'devam eden': 'in_progress', 'devam': 'in_progress', 'aktif': 'in_progress',
  'review': 'review', 'inceleme': 'review',
  'done': 'done', 'tamamlanan': 'done', 'tamamlandı': 'done', 'bitirilen': 'done', 'kapat': 'done',
};

const PRIORITY_MAP: Record<string, string> = {
  'low': 'low', 'düşük': 'low',
  'medium': 'medium', 'orta': 'medium',
  'high': 'high', 'yüksek': 'high', 'yuksek': 'high',
  'urgent': 'urgent', 'acil': 'urgent', 'kritik': 'urgent',
};

function firstMatch(text: string, map: Record<string, string>): string[] {
  const hits = new Set<string>();
  for (const [key, val] of Object.entries(map)) {
    if (new RegExp(`\\b${key}\\b`, 'i').test(text)) hits.add(val);
  }
  return [...hits];
}

function extractQuoted(text: string): string | null {
  const m = text.match(/["'"'“'']([^"'"'“'']+)["'"'“'']/);
  return m ? m[1].trim() : null;
}

function extractTag(text: string): string | null {
  // #tagname or "etiket X"
  const hash = text.match(/#([\w-]+)/);
  if (hash) return hash[1];
  const m = text.match(/etiket(?:i|ini)?\s+["'"]?([\w-]+)["'"]?/i);
  return m ? m[1] : null;
}

function extractAssignee(text: string): string | null {
  // "X'e ata" / "X e ata" / "assign to X" / "@X" / "X'e bildir"
  const at = text.match(/@([\w.-]+)/);
  if (at) return at[1];
  // English (try first — "assign to Ayse")
  const en = text.match(/(?:assign(?:ed)?|notify|remind)\s+to\s+([A-Z][a-zA-Z]+)/i);
  if (en) return en[1];
  // Turkish possessive: "Cagan'e", "Mehmet'e" — verb after
  const tr1 = text.match(/([A-ZŞĞÜÖÇİ][a-zşğüöçı]+)'[a-zışğüöç]{1,3}\s+(?:ata|atasın|atayacaksın|verecek|bildir|hatırlat|göster)/i);
  if (tr1) return tr1[1];
  // Turkish space form: "Cagan e ata"
  const tr2 = text.match(/([A-ZŞĞÜÖÇİ][a-zşğüöçı]+)\s+e\s+(?:ata|bildir|hatırlat)/i);
  if (tr2) return tr2[1];
  return null;
}

function extractDaysBefore(text: string): number | null {
  const m = text.match(/(\d+)\s*(?:gün|day)/i);
  if (m) return Number(m[1]);
  if (/bir hafta|1 hafta|a week/i.test(text)) return 7;
  return null;
}

// ---- Main parse --------------------------------------------------------

export function parseDirective(raw: string): { plan: PlanStep[] } {
  const text = raw.trim();
  if (!text) return { plan: [] };

  const plan: PlanStep[] = [];
  const statuses = firstMatch(text, STATUS_MAP);
  const priorities = firstMatch(text, PRIORITY_MAP);
  const tag = extractTag(text);
  const assignee = extractAssignee(text);
  const staleDays = extractDaysBefore(text);
  const isBug = /\bbug(?:lar[ıi]?)?\b/i.test(text);
  const bugTag = isBug ? ['bug'] : undefined;

  const filter: StepFilter = {};
  // "acil olan/tüm/bütün X" ise status filtresi ekleme — priority kullan.
  if (priorities.length && !/^acil olan|acil ne varsa/i.test(text) && statuses.length) filter.status = statuses;
  else if (statuses.length && !priorities.length) filter.status = statuses;
  if (priorities.length) filter.priority = priorities;
  if (bugTag) filter.tags = bugTag;
  if (staleDays !== null) filter.updated_before_days = staleDays;

  // --- Intent detection (order matters — more specific wins) ---

  // "assign …" | "… ata"
  if (assignee && /ata|assign|verecek|verilecek/i.test(text)) {
    plan.push({
      tool: 'assign_tasks',
      params: { filter, assignee_name: assignee },
      description: `${humanFilter(filter, isBug)} → ${assignee} kullanıcısına ata`,
    });
  }

  // "close all done" / "tamamlananları kapat" — needs status target
  if (/kapat|bitir|close/i.test(text) && !plan.length) {
    plan.push({
      tool: 'update_task_status',
      params: { filter, new_status: 'done' },
      description: `${humanFilter(filter, isBug)} → durum "done" yap`,
    });
  }

  // "reopen …" / "aç" → todo
  if (/aç|reopen/i.test(text) && !plan.length) {
    plan.push({
      tool: 'update_task_status',
      params: { filter, new_status: 'todo' },
      description: `${humanFilter(filter, isBug)} → durum "todo" yap`,
    });
  }

  // "tag ekle" / "etiketle" / "#tag ekle"
  if ((tag || /etiket/i.test(text)) && /ekle|tagla|etiketle/i.test(text) && !plan.some(s => s.tool === 'add_tag_to_tasks')) {
    plan.push({
      tool: 'add_tag_to_tasks',
      params: { filter, tag: tag ?? extractQuoted(text) ?? 'yeni' },
      description: `${humanFilter(filter, isBug)} → etiket "${tag ?? extractQuoted(text) ?? 'yeni'}" ekle`,
    });
  }

  // "bir hafta güncellenmeyen taskları X'e bildir"
  if (staleDays !== null && (/bildir|hatırlat|notify|remind/i.test(text)) && assignee) {
    plan.push({
      tool: 'notify_user',
      params: {
        user_name: assignee,
        title: `${staleDays} gündür güncellenmemiş task'lar`,
        body: `WorkHub'a girip ilerlemeleri güncelle.`,
      },
      description: `${assignee} kullanıcısına push at (${staleDays}g stale reminder)`,
    });
  }

  if (plan.length === 0) {
    plan.push({
      tool: 'noop',
      params: {},
      description: 'Direktif anlaşılamadı — daha spesifik yazmayı dene (ör. "acil bug\'ları Mehmet\'e ata")',
    });
  }

  return { plan };
}

function humanFilter(f: StepFilter, isBug: boolean): string {
  const parts: string[] = [];
  if (isBug) parts.push('bug etiketli');
  if (f.priority?.length) parts.push(f.priority.map(p => `${p} öncelikli`).join(' + '));
  if (f.status?.length) parts.push(f.status.map(s => `"${s}" durumundaki`).join(' + '));
  if (f.updated_before_days) parts.push(`${f.updated_before_days} gündür güncellenmeyen`);
  if (parts.length === 0) return 'Tüm task\'lar';
  return `${parts.join(', ')} task'lar`;
}
