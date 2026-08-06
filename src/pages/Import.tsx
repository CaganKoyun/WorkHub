import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects, useAllProfiles, useCreateProject } from '@/lib/projects-hooks';
import { useCreateTask } from '@/lib/tasks-hooks';
import { useCreateCrmContact } from '@/lib/crm-hooks';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  parseCsv,
  guessTaskField, guessProjectField, guessContactField,
  IMPORT_TASK_FIELDS, IMPORT_PROJECT_FIELDS, IMPORT_CONTACT_FIELDS,
  normalizeStatus, normalizePriority, parseTags, normalizeDate,
  normalizeProjectStatus, normalizeLifecycle,
  type CsvParseResult, type ImportFieldDef,
} from '@/lib/csv';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type EntityType = 'tasks' | 'projects' | 'contacts';
type ColMap = Record<string, string>;
const NONE = '__none__';

interface ImportSummary {
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}

const ENTITY_TYPES: { key: EntityType; label: string; desc: string }[] = [
  { key: 'tasks',    label: 'Tasks',        desc: 'Gorev, issue, bug' },
  { key: 'projects', label: 'Projects',     desc: 'Proje kayitlari' },
  { key: 'contacts', label: 'CRM Contacts', desc: 'Musteri kontaklari' },
];

function fieldsFor(et: EntityType): ImportFieldDef[] {
  if (et === 'projects') return IMPORT_PROJECT_FIELDS;
  if (et === 'contacts') return IMPORT_CONTACT_FIELDS;
  return IMPORT_TASK_FIELDS;
}

function guesserFor(et: EntityType): (h: string) => string | null {
  if (et === 'projects') return guessProjectField;
  if (et === 'contacts') return guessContactField;
  return guessTaskField;
}

function requiredKey(et: EntityType): string {
  if (et === 'projects') return 'name';
  if (et === 'contacts') return 'full_name';
  return 'title';
}

export default function Import() {
  const nav = useNavigate();
  const { data: projects, isLoading: projLoading } = useProjects();
  const { data: profiles } = useAllProfiles();
  const createTask = useCreateTask();
  const createProject = useCreateProject();
  const createContact = useCreateCrmContact();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  const [entityType, setEntityType] = useState<EntityType>('tasks');
  const [csv, setCsv] = useState<CsvParseResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [colMap, setColMap] = useState<ColMap>({});
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const fields = fieldsFor(entityType);
  const guesser = guesserFor(entityType);
  const rKey = requiredKey(entityType);

  const applyLinearPreset = () => {
    if (!csv) return;
    const LINEAR: Record<string, string> = {
      title: 'title', description: 'description',
      'issue title': 'title', 'issue description': 'description',
      status: 'status', priority: 'priority',
      assignee: 'assignee', labels: 'tags',
      'due date': 'due_date', estimate: 'story_points',
      identifier: 'external_id', id: 'external_id',
    };
    const next: ColMap = {};
    for (const f of fields) next[f.key] = NONE;
    for (const header of csv.headers) {
      const key = LINEAR[header.trim().toLowerCase()] ?? guessTaskField(header);
      if (key && next[key] === NONE) next[key] = header;
    }
    setColMap(next);
    toast.success('Linear kolonları eşleştirildi');
  };

  const handleFile = async (file: File) => {
    setSummary(null);
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCsv(text);
    setCsv(parsed);

    const initial: ColMap = {};
    for (const f of fields) initial[f.key] = NONE;
    for (const header of parsed.headers) {
      const guess = guesser(header);
      if (guess && initial[guess] === NONE) initial[guess] = header;
    }
    setColMap(initial);
  };

  const handleEntityChange = (et: EntityType) => {
    setEntityType(et);
    setCsv(null);
    setFileName('');
    setSummary(null);
    setColMap({});
  };

  const profileMap = useMemo(() => {
    const byEmail = new Map<string, string>();
    const byName = new Map<string, string>();
    (profiles ?? []).forEach(p => {
      if (p.full_name) byName.set(p.full_name.toLowerCase(), p.user_id);
    });
    return { byEmail, byName };
  }, [profiles]);

  const resolveAssignee = (raw: string): string | null => {
    if (!raw) return null;
    const t = raw.toLowerCase().trim();
    return profileMap.byEmail.get(t) ?? profileMap.byName.get(t) ?? null;
  };

  const companyCache = useMemo(() => new Map<string, string>(), []);

  const resolveCompany = async (name: string): Promise<string | null> => {
    if (!name || !currentWorkspace) return null;
    const key = name.toLowerCase().trim();
    if (companyCache.has(key)) return companyCache.get(key)!;
    const { data } = await supabase
      .from('crm_companies')
      .select('id')
      .eq('workspace_id', currentWorkspace.id)
      .ilike('name', key)
      .limit(1)
      .single();
    if (data) {
      companyCache.set(key, data.id);
      return data.id;
    }
    const { data: created, error } = await supabase
      .from('crm_companies')
      .insert({
        workspace_id: currentWorkspace.id,
        name: name.trim(),
        lifecycle: 'lead' as any,
        created_by: user!.id,
        owner_id: user!.id,
      } as any)
      .select('id')
      .single();
    if (error || !created) return null;
    companyCache.set(key, (created as any).id);
    return (created as any).id;
  };

  const runImport = async () => {
    if (!csv) { toast.error('Dosya sec'); return; }
    if (entityType === 'tasks' && !projectId) { toast.error('Hedef proje sec'); return; }
    if (colMap[rKey] === NONE || !colMap[rKey]) {
      toast.error(`${rKey === 'full_name' ? 'Full name' : rKey === 'name' ? 'Name' : 'Title'} kolonu eslestirilmeli`);
      return;
    }

    const idx: Record<string, number> = {};
    for (const [field, header] of Object.entries(colMap)) {
      if (header === NONE) continue;
      const i = csv.headers.indexOf(header);
      if (i >= 0) idx[field] = i;
    }

    const errors: string[] = [];
    let imported = 0, skipped = 0, failed = 0;
    setRunning(true);
    setSummary(null);

    for (let r = 0; r < csv.rows.length; r++) {
      const row = csv.rows[r];
      try {
        if (entityType === 'tasks') {
          const title = idx.title != null ? (row[idx.title] ?? '').trim() : '';
          if (!title) { skipped++; continue; }
          const payload: any = { project_id: projectId, title };
          if (idx.description != null) payload.description = row[idx.description] || null;
          if (idx.status != null) { const s = normalizeStatus(row[idx.status] ?? ''); if (s) payload.status = s; }
          if (idx.priority != null) { const p = normalizePriority(row[idx.priority] ?? ''); if (p) payload.priority = p; }
          if (idx.assignee != null) { const uid = resolveAssignee(row[idx.assignee] ?? ''); if (uid) payload.assignee_id = uid; }
          if (idx.due_date != null) { const d = normalizeDate(row[idx.due_date] ?? ''); if (d) payload.due_date = d; }
          if (idx.tags != null) payload.tags = parseTags(row[idx.tags] ?? '');
          if (idx.story_points != null) { const n = Number(row[idx.story_points]); if (!isNaN(n)) payload.story_points = n; }
          if (idx.estimated_hours != null) { const n = Number(row[idx.estimated_hours]); if (!isNaN(n)) payload.estimated_hours = n; }
          await createTask.mutateAsync(payload);
          imported++;
        } else if (entityType === 'projects') {
          const name = idx.name != null ? (row[idx.name] ?? '').trim() : '';
          if (!name) { skipped++; continue; }
          const payload: any = { name };
          if (idx.description != null) payload.description = row[idx.description] || null;
          if (idx.status != null) { const s = normalizeProjectStatus(row[idx.status] ?? ''); if (s) payload.status = s; }
          if (idx.priority != null) { const p = normalizePriority(row[idx.priority] ?? ''); if (p) payload.priority = p; }
          if (idx.start_date != null) { const d = normalizeDate(row[idx.start_date] ?? ''); if (d) payload.start_date = d; }
          if (idx.end_date != null) { const d = normalizeDate(row[idx.end_date] ?? ''); if (d) payload.end_date = d; }
          await createProject.mutateAsync(payload);
          imported++;
        } else {
          const fullName = idx.full_name != null ? (row[idx.full_name] ?? '').trim() : '';
          const firstName = idx.first_name != null ? (row[idx.first_name] ?? '').trim() : '';
          const lastName = idx.last_name != null ? (row[idx.last_name] ?? '').trim() : '';
          const resolvedName = fullName || [firstName, lastName].filter(Boolean).join(' ');
          if (!resolvedName) { skipped++; continue; }

          const payload: any = { full_name: resolvedName };
          if (firstName) payload.first_name = firstName;
          if (lastName) payload.last_name = lastName;
          if (idx.email != null) payload.email = (row[idx.email] ?? '').trim() || null;
          if (idx.phone != null) payload.phone = (row[idx.phone] ?? '').trim() || null;
          if (idx.title != null) payload.title = (row[idx.title] ?? '').trim() || null;
          if (idx.lifecycle != null) {
            const lc = normalizeLifecycle(row[idx.lifecycle] ?? '');
            if (lc) payload.lifecycle = lc;
          }
          if (idx.tags != null) payload.tags = parseTags(row[idx.tags] ?? '');
          if (idx.source != null) payload.source = (row[idx.source] ?? '').trim() || null;
          if (idx.linkedin != null) payload.linkedin_url = (row[idx.linkedin] ?? '').trim() || null;
          if (idx.company != null) {
            const companyName = (row[idx.company] ?? '').trim();
            if (companyName) {
              const cid = await resolveCompany(companyName);
              if (cid) payload.company_id = cid;
            }
          }
          await createContact.mutateAsync(payload);
          imported++;
        }
      } catch (e: any) {
        failed++;
        if (errors.length < 8) errors.push(`Satir ${r + 2}: ${e.message ?? 'unknown error'}`);
      }
    }

    setRunning(false);
    setSummary({ imported, skipped, failed, errors });
    toast.success(`${imported} ${entityType === 'tasks' ? 'task' : entityType === 'projects' ? 'proje' : 'kontak'} ice alindi`);
  };

  const needsProject = entityType === 'tasks';

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight">Import Wizard</h1>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Linear, Asana, Jira, Trello, ClickUp, Monday veya Notion'dan CSV export'unuzu ice aktarin.
          Kolonlari otomatik eslestirmeye calisiyorum; onaylayip import'a baslatin.
        </p>
      </div>

      {/* Step 0 — entity type */}
      <div className="rounded-md border border-border/60 bg-card p-4">
        <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          0. Ne import edeceksin?
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ENTITY_TYPES.map(et => (
            <button
              key={et.key}
              type="button"
              onClick={() => handleEntityChange(et.key)}
              className={cn(
                "text-left border rounded-lg p-3 transition-colors text-sm",
                entityType === et.key ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50",
              )}
            >
              <div className="font-medium">{et.label}</div>
              <div className="text-[11px] text-muted-foreground">{et.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 1 — upload */}
      <div className="rounded-md border border-border/60 bg-card p-4">
        <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          1. CSV dosyasi
        </div>
        {!csv ? (
          <label className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/70 py-8 cursor-pointer hover:border-primary/60 transition-colors">
            <Upload className="h-5 w-5 text-muted-foreground/70" />
            <span className="text-[13px] text-muted-foreground">CSV dosyanı birak ya da sec</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </label>
        ) : (
          <div className="flex items-center gap-2 text-[13px]">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono">{fileName}</span>
            <span className="text-muted-foreground">·</span>
            <span className="tabular-nums text-muted-foreground">{csv.rows.length} satir · {csv.headers.length} kolon</span>
            <Button size="sm" variant="ghost" className="ml-auto h-7 text-[12px]" onClick={() => { setCsv(null); setFileName(''); setSummary(null); }}>
              Sifirla
            </Button>
          </div>
        )}
      </div>

      {/* Step 2 — target project (tasks only) */}
      {csv && needsProject && (
        <div className="rounded-md border border-border/60 bg-card p-4">
          <div className="mb-2 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            2. Hedef proje
          </div>
          {projLoading ? (
            <Skeleton className="h-8" />
          ) : (projects?.length ?? 0) === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Henuz proje yok. Once bir proje olustur, sonra tekrar don.
              <Button variant="link" className="px-1 h-auto" onClick={() => nav('/projects/new')}>Yeni proje →</Button>
            </p>
          ) : (
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Proje sec" /></SelectTrigger>
              <SelectContent>
                {(projects ?? []).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Step 3 — column map */}
      {csv && (
        <div className="rounded-md border border-border/60 bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
              {needsProject ? '3' : '2'}. Kolon eslestirme
            </div>
            {entityType === 'tasks' && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[12px]"
                onClick={() => applyLinearPreset()}
                title="Linear'in CSV export basliklarini otomatik eslestir"
              >
                Linear preset
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.key} className="space-y-1">
                <Label className="text-[12px] flex items-center gap-1">
                  {f.label}
                  {f.required && <span className="text-destructive">*</span>}
                </Label>
                <Select
                  value={colMap[f.key] ?? NONE}
                  onValueChange={v => setColMap({ ...colMap, [f.key]: v })}
                >
                  <SelectTrigger className="h-8 text-[12px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {csv.headers.map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4 — preview + run */}
      {csv && (
        <div className="rounded-md border border-border/60 bg-card p-4 space-y-3">
          <div className="text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
            {needsProject ? '4' : '3'}. Onizleme (ilk 5 satir)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="text-left text-muted-foreground">
                  {csv.headers.map(h => (
                    <th key={h} className="border-b border-border/60 px-2 py-1 font-medium">
                      {h}
                      {(() => {
                        const mapped = Object.entries(colMap).find(([, v]) => v === h)?.[0];
                        return mapped ? <span className="ml-1 text-[10px] text-primary">→ {mapped}</span> : null;
                      })()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {csv.rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-border/40 last:border-b-0">
                    {row.map((cell, j) => (
                      <td key={j} className="px-2 py-1 truncate max-w-[180px]">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              onClick={runImport}
              disabled={running || (needsProject && !projectId) || colMap[rKey] === NONE}
            >
              {running
                ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Ice aktariliyor…</>
                : `${csv.rows.length} satiri import et`
              }
            </Button>
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className={cn(
          "rounded-md border p-4",
          summary.failed > 0 ? "border-destructive/40 bg-destructive/5" : "border-[hsl(var(--status-done))/40] bg-[hsl(var(--status-done))/5]"
        )}>
          <div className="flex items-center gap-2 mb-2">
            {summary.failed > 0 ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-[hsl(var(--status-done))]" />}
            <h3 className="text-[14px] font-semibold">Import ozet</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-[13px]">
            <div><span className="text-muted-foreground">Import edilen:</span> <span className="font-mono font-semibold text-[hsl(var(--status-done))]">{summary.imported}</span></div>
            <div><span className="text-muted-foreground">Atlanan:</span> <span className="font-mono">{summary.skipped}</span></div>
            <div><span className="text-muted-foreground">Hatali:</span> <span className="font-mono text-destructive">{summary.failed}</span></div>
          </div>
          {summary.errors.length > 0 && (
            <details className="mt-3">
              <summary className="text-[12px] text-muted-foreground cursor-pointer">Hatalari goster</summary>
              <ul className="mt-2 space-y-1 text-[11.5px] font-mono">
                {summary.errors.map((e, i) => <li key={i} className="text-destructive">{e}</li>)}
              </ul>
            </details>
          )}
          {summary.imported > 0 && entityType === 'tasks' && (
            <Button size="sm" variant="link" className="mt-3 h-auto p-0" onClick={() => nav(`/projects/${projectId}`)}>
              Projeyi ac →
            </Button>
          )}
          {summary.imported > 0 && entityType === 'projects' && (
            <Button size="sm" variant="link" className="mt-3 h-auto p-0" onClick={() => nav('/projects')}>
              Projeleri gor →
            </Button>
          )}
          {summary.imported > 0 && entityType === 'contacts' && (
            <Button size="sm" variant="link" className="mt-3 h-auto p-0" onClick={() => nav('/crm')}>
              CRM'e git →
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
