import { useEffect, useMemo, useState } from 'react';
import {
  useCustomFieldDefs, useCustomFieldValues, useUpsertCustomFieldValue,
  type CustomFieldDef, type EntityType,
} from '@/lib/custom-fields-hooks';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Props {
  entityType: EntityType;
  entityId: string;
  className?: string;
}

/**
 * Renders every custom field defined for `entityType` and inline-saves
 * value changes. Use inside TaskDetailDialog etc. — form-side reuse can
 * follow later.
 */
export function CustomFieldRenderer({ entityType, entityId, className }: Props) {
  const { data: defs, isLoading: defsLoading } = useCustomFieldDefs(entityType);
  const { data: values } = useCustomFieldValues(entityType, entityId);
  const upsert = useUpsertCustomFieldValue();

  const byDef = useMemo(() => {
    const m = new Map<string, unknown>();
    (values ?? []).forEach(v => m.set(v.def_id, v.value));
    return m;
  }, [values]);

  if (defsLoading) return <Skeleton className="h-8" />;
  if ((defs?.length ?? 0) === 0) return null;

  const save = (def: CustomFieldDef, value: unknown) =>
    upsert.mutate({ def_id: def.id, entity_type: entityType, entity_id: entityId, value });

  return (
    <div className={cn('space-y-3', className)}>
      {(defs ?? []).map(def => (
        <FieldEditor key={def.id} def={def} value={byDef.get(def.id)} onSave={(v) => save(def, v)} />
      ))}
    </div>
  );
}

function FieldEditor({
  def, value, onSave,
}: { def: CustomFieldDef; value: unknown; onSave: (v: unknown) => void }) {
  const [local, setLocal] = useState<string>(() => stringify(value));

  useEffect(() => setLocal(stringify(value)), [value]);

  const commit = (raw: string) => {
    const parsed = parseFor(def, raw);
    if (JSON.stringify(parsed) !== JSON.stringify(value)) onSave(parsed);
  };

  return (
    <div className="grid grid-cols-[130px_1fr] items-center gap-3">
      <Label className="text-[11.5px] text-muted-foreground truncate">
        {def.name}
        {def.required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {renderControl(def, local, setLocal, commit)}
    </div>
  );
}

function stringify(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? '1' : '';
  if (Array.isArray(v)) return v.join(',');
  return String(v);
}

function parseFor(def: CustomFieldDef, raw: string): unknown {
  if (raw === '' || raw == null) return null;
  switch (def.kind) {
    case 'number':
    case 'currency':
    case 'percent': {
      const n = Number(raw);
      return isNaN(n) ? null : n;
    }
    case 'boolean': return raw === '1' || raw === 'true';
    case 'multi_select': return raw.split(',').map(s => s.trim()).filter(Boolean);
    default: return raw;
  }
}

function renderControl(
  def: CustomFieldDef,
  local: string,
  setLocal: (s: string) => void,
  commit: (s: string) => void,
) {
  const commonProps = {
    value: local,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setLocal(e.target.value),
    onBlur: () => commit(local),
    className: 'h-8 text-[12.5px]',
  };

  switch (def.kind) {
    case 'long_text':
      return <Textarea rows={3} {...commonProps} className="text-[12.5px]" />;
    case 'number':
    case 'percent':
      return <Input type="number" {...commonProps} />;
    case 'currency':
      return (
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted-foreground font-mono">{def.config.currency ?? 'USD'}</span>
          <Input type="number" step="0.01" {...commonProps} />
        </div>
      );
    case 'date':
      return <Input type="date" {...commonProps} />;
    case 'datetime':
      return <Input type="datetime-local" {...commonProps} />;
    case 'url':
      return <Input type="url" placeholder="https://…" {...commonProps} />;
    case 'email':
      return <Input type="email" placeholder="ada@example.com" {...commonProps} />;
    case 'boolean':
      return (
        <div>
          <label className="inline-flex items-center gap-2 text-[12.5px]">
            <input
              type="checkbox"
              checked={local === '1' || local === 'true'}
              onChange={e => { const v = e.target.checked ? '1' : ''; setLocal(v); commit(v); }}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            {def.config.placeholder ?? 'Evet'}
          </label>
        </div>
      );
    case 'select': {
      const opts = def.config.options ?? [];
      return (
        <Select value={local} onValueChange={v => { setLocal(v); commit(v); }}>
          <SelectTrigger className="h-8 text-[12.5px]"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            {opts.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    case 'multi_select': {
      const opts = def.config.options ?? [];
      const selected = new Set(local ? local.split(',') : []);
      return (
        <div className="flex flex-wrap gap-1">
          {opts.map(o => {
            const on = selected.has(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  const next = new Set(selected);
                  if (on) next.delete(o.value); else next.add(o.value);
                  const s = Array.from(next).join(',');
                  setLocal(s); commit(s);
                }}
                className={cn(
                  'h-6 rounded-full border px-2 text-[11px] transition-colors',
                  on
                    ? 'border-primary/50 bg-primary/15 text-primary'
                    : 'border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground'
                )}
              >{o.label}</button>
            );
          })}
        </div>
      );
    }
    default:
      return <Input {...commonProps} placeholder={def.config.placeholder ?? undefined} />;
  }
}
