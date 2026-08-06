import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useForms, useCreateForm, useUpdateForm, useDeleteForm, useFormSubmissions,
  FIELD_KIND_LABELS,
  type FormDef, type FormField, type FormFieldKind, type FormTargetKind,
} from '@/lib/forms-hooks';
import { useProjects } from '@/lib/projects-hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Trash2, ExternalLink, Copy, ClipboardList, ChevronRight, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FieldDraft extends FormField { _id: string }

interface FormDraft {
  name: string;
  description: string;
  fields: FieldDraft[];
  is_public: boolean;
  target_kind: FormTargetKind;
  target_project_id: string | null;
}

const EMPTY_DRAFT: FormDraft = {
  name: '',
  description: '',
  fields: [{ _id: '1', key: 'name', label: 'İsim', kind: 'text', required: true }],
  is_public: true,
  target_kind: 'none',
  target_project_id: null,
};

function slugifyKey(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `f_${Date.now()}`;
}

function EditDialog({ open, onOpenChange, initial }: {
  open: boolean; onOpenChange: (o: boolean) => void; initial?: FormDef | null;
}) {
  const create = useCreateForm();
  const update = useUpdateForm();
  const { data: projects } = useProjects();
  const [draft, setDraft] = useState<FormDraft>(() => initial ? {
    name: initial.name,
    description: initial.description ?? '',
    fields: initial.fields.map((f, i) => ({ ...f, _id: String(i) })),
    is_public: initial.is_public,
    target_kind: initial.target_kind,
    target_project_id: initial.target_project_id,
  } : EMPTY_DRAFT);

  const addField = () => setDraft(d => ({
    ...d, fields: [...d.fields, { _id: crypto.randomUUID(), key: `field_${d.fields.length + 1}`, label: '', kind: 'text' }],
  }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) { toast.error('Ad zorunlu'); return; }
    if (draft.fields.length === 0) { toast.error('En az bir alan ekle'); return; }
    if (draft.target_kind === 'task' && !draft.target_project_id) {
      toast.error('Task hedefi için proje seç'); return;
    }
    const fields: FormField[] = draft.fields.map(f => ({
      key: slugifyKey(f.key || f.label),
      label: f.label.trim() || f.key,
      kind: f.kind,
      required: !!f.required,
      options: f.kind === 'select'
        ? (f.options ?? []).map(o => o.trim()).filter(Boolean)
        : undefined,
      placeholder: f.placeholder,
    }));
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      fields,
      is_public: draft.is_public,
      target_kind: draft.target_kind,
      target_project_id: draft.target_kind === 'task' ? draft.target_project_id : null,
    };
    try {
      if (initial) await update.mutateAsync({ id: initial.id, ...payload });
      else await create.mutateAsync(payload);
      toast.success(initial ? 'Form güncellendi' : 'Form oluşturuldu');
      onOpenChange(false);
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? 'Formu düzenle' : 'Yeni form'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-2">
            <Label>Ad</Label>
            <Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} autoFocus placeholder="Örn: Destek talebi" />
          </div>
          <div className="grid gap-2">
            <Label>Açıklama</Label>
            <Input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="Formun ne için olduğunu kısaca yaz" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Alanlar</Label>
              <Button type="button" size="sm" variant="ghost" className="h-6 gap-1 px-1.5 text-[11.5px]" onClick={addField}>
                <Plus className="h-3 w-3" /> Alan
              </Button>
            </div>
            <div className="space-y-2">
              {draft.fields.map((f, i) => (
                <div key={f._id} className="rounded-md border border-border/60 p-2 space-y-1.5">
                  <div className="grid grid-cols-[2fr_1fr_auto] gap-1.5">
                    <Input
                      value={f.label} onChange={e => setDraft(d => ({
                        ...d, fields: d.fields.map((x, xi) => xi === i ? { ...x, label: e.target.value } : x),
                      }))}
                      placeholder="Etiket"
                      className="h-8"
                    />
                    <Select value={f.kind} onValueChange={v => setDraft(d => ({
                      ...d, fields: d.fields.map((x, xi) => xi === i ? { ...x, kind: v as FormFieldKind } : x),
                    }))}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(FIELD_KIND_LABELS) as FormFieldKind[]).map(k => (
                          <SelectItem key={k} value={k}>{FIELD_KIND_LABELS[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                      onClick={() => setDraft(d => ({ ...d, fields: d.fields.filter((_, xi) => xi !== i) }))}
                    ><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  {f.kind === 'select' && (
                    <textarea
                      value={(f.options ?? []).join('\n')}
                      onChange={e => setDraft(d => ({
                        ...d, fields: d.fields.map((x, xi) => xi === i
                          ? { ...x, options: e.target.value.split('\n') } : x),
                      }))}
                      placeholder="Satır başına 1 seçenek"
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-2 py-1 text-[12px]"
                    />
                  )}
                  <label className="flex items-center gap-1.5 text-[11.5px] cursor-pointer text-muted-foreground">
                    <input
                      type="checkbox" checked={!!f.required}
                      onChange={e => setDraft(d => ({
                        ...d, fields: d.fields.map((x, xi) => xi === i ? { ...x, required: e.target.checked } : x),
                      }))}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    Zorunlu
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Cevap ne olsun?</Label>
            <Select value={draft.target_kind} onValueChange={v => setDraft(d => ({ ...d, target_kind: v as FormTargetKind }))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sadece kaydet</SelectItem>
                <SelectItem value="task">Bir task oluştur</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {draft.target_kind === 'task' && (
            <div className="grid gap-2">
              <Label>Hedef proje</Label>
              <Select value={draft.target_project_id ?? ''} onValueChange={v => setDraft(d => ({ ...d, target_project_id: v || null }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Proje seç…" /></SelectTrigger>
                <SelectContent>
                  {(projects ?? []).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <label className="flex items-center gap-2 text-[12.5px] cursor-pointer">
            <input
              type="checkbox" checked={draft.is_public}
              onChange={e => setDraft(d => ({ ...d, is_public: e.target.checked }))}
              className="h-4 w-4 accent-primary"
            />
            Herkese açık — link üzerinden giriş kabul edilir
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {initial ? 'Kaydet' : 'Oluştur'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormRow({ form }: { form: FormDef }) {
  const update = useUpdateForm();
  const del = useDeleteForm();
  const { data: subs } = useFormSubmissions(form.id);
  const [editOpen, setEditOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const url = `${window.location.origin}/f/${form.slug}`;

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url); toast.success('Link kopyalandı'); }
    catch { toast.error('Kopyalanamadı'); }
  };

  const toggleOpen = async () => {
    try { await update.mutateAsync({ id: form.id, is_open: !form.is_open }); }
    catch (e: any) { toast.error(e.message); }
  };

  const doDelete = async () => {
    if (!confirm(`"${form.name}" formunu ve tüm cevaplarını sil?`)) return;
    try { await del.mutateAsync(form.id); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="rounded-md border border-border/60 bg-secondary/20">
      <div className="flex items-center gap-3 px-3 py-2">
        <button onClick={() => setExpanded(v => !v)} className="h-5 w-5 grid place-items-center rounded hover:bg-secondary/60">
          <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium truncate">{form.name}</span>
            {!form.is_open && <span className="text-[10px] uppercase tracking-wider text-muted-foreground rounded border border-border px-1.5 py-0.5">kapalı</span>}
            {form.target_kind === 'task' && <span className="text-[10px] uppercase tracking-wider text-primary/80 rounded border border-primary/40 px-1.5 py-0.5">→ task</span>}
          </div>
          <div className="text-[11.5px] text-muted-foreground truncate">
            {form.fields.length} alan • {form.submission_count} cevap
          </div>
        </div>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11.5px]" onClick={copyLink} title="Public linki kopyala">
          <Copy className="h-3 w-3" /> Link
        </Button>
        <Link to={`/f/${form.slug}`} target="_blank" className="inline-flex items-center gap-1 rounded-md px-2 h-7 hover:bg-secondary/60 text-[11.5px]">
          <ExternalLink className="h-3 w-3" /> Aç
        </Link>
        <Button size="sm" variant="ghost" className="h-7 text-[12px]" onClick={toggleOpen}>
          {form.is_open ? 'Kapat' : 'Aç'}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-[12px]" onClick={() => setEditOpen(true)}>Düzenle</Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={doDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
      {expanded && (
        <div className="border-t border-border/40 bg-background/60 px-3 py-2">
          <div className="text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Son cevaplar</div>
          {(subs ?? []).length === 0 ? (
            <div className="text-[12px] text-muted-foreground py-3">Henüz cevap yok.</div>
          ) : (
            <div className="divide-y divide-border/40 rounded-md border border-border/40 bg-background">
              {(subs ?? []).slice(0, 5).map(s => (
                <details key={s.id} className="px-2.5 py-1.5">
                  <summary className="cursor-pointer text-[12px] flex items-center gap-2">
                    <span className="text-muted-foreground">{new Date(s.created_at).toLocaleString('tr-TR')}</span>
                    {s.submitter_email && <span className="text-muted-foreground">— {s.submitter_email}</span>}
                    {s.task_id && <span className="text-[10.5px] text-primary/80 rounded border border-primary/40 px-1.5 py-0.5">task oluştu</span>}
                  </summary>
                  <pre className="mt-1.5 max-h-40 overflow-auto rounded-md bg-secondary/40 p-2 text-[11px] whitespace-pre-wrap">
                    {JSON.stringify(s.values, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </div>
      )}
      {editOpen && <EditDialog open={editOpen} onOpenChange={setEditOpen} initial={form} />}
    </div>
  );
}

export default function Forms() {
  const { data, isLoading } = useForms();
  const [createOpen, setCreateOpen] = useState(false);
  const totalSubmissions = useMemo(
    () => (data ?? []).reduce((s, f) => s + f.submission_count, 0),
    [data],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-muted-foreground" /> Formlar
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Public link ile dış paydaşlardan (destek, iş başvurusu, feedback) veri
            topla. İstersen her cevap otomatik olarak seçtiğin projede bir task açar.
            Toplam {totalSubmissions} cevap alındı.
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Yeni form
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 py-14 text-center">
          <Eye className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-[13px] text-muted-foreground">
            Henüz form yok. Yukarıdan ilkini oluştur.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {(data ?? []).map(f => <FormRow key={f.id} form={f} />)}
        </div>
      )}

      {createOpen && <EditDialog open={createOpen} onOpenChange={setCreateOpen} initial={null} />}
    </div>
  );
}
