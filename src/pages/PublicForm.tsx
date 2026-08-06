import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicForm, useSubmitForm } from '@/lib/forms-hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function PublicForm() {
  const { slug } = useParams<{ slug: string }>();
  const { data: form, isLoading } = usePublicForm(slug);
  const submit = useSubmitForm();
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  const setVal = (k: string, v: unknown) => setValues(prev => ({ ...prev, [k]: v }));

  const doSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setError(null);
    for (const f of form.fields) {
      if (f.required && (values[f.key] === undefined || values[f.key] === '' || values[f.key] === false)) {
        setError(`"${f.label}" alanı zorunlu.`); return;
      }
    }
    try {
      await submit.mutateAsync({ form, values, submitter_email: email || undefined });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message ?? 'Gönderilemedi.');
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg pt-24 space-y-3 px-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="mx-auto max-w-lg pt-32 text-center px-6">
        <XCircle className="mx-auto h-8 w-8 text-destructive/70" />
        <h1 className="mt-3 text-[18px] font-semibold">Form bulunamadı</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Link geçersiz olabilir veya form artık aktif değil.
        </p>
      </div>
    );
  }

  if (!form.is_open) {
    return (
      <div className="mx-auto max-w-lg pt-32 text-center px-6">
        <h1 className="text-[18px] font-semibold">Bu form şu anda kapalı</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Form sahibi cevap almayı durdurdu.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg pt-32 text-center px-6">
        <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
        <h1 className="mt-3 text-[18px] font-semibold">Gönderildi</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{form.submit_message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-10 px-6">
      <h1 className="text-[22px] font-semibold tracking-tight">{form.name}</h1>
      {form.description && (
        <p className="mt-1 text-[13px] text-muted-foreground">{form.description}</p>
      )}
      <form onSubmit={doSubmit} className="mt-5 space-y-4">
        {form.fields.map(f => (
          <div key={f.key} className="space-y-1.5">
            <Label className="text-[12.5px]">
              {f.label}
              {f.required && <span className="ml-1 text-destructive">*</span>}
            </Label>
            {f.kind === 'textarea' ? (
              <textarea
                value={String(values[f.key] ?? '')}
                onChange={e => setVal(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px]"
              />
            ) : f.kind === 'select' ? (
              <select
                value={String(values[f.key] ?? '')}
                onChange={e => setVal(f.key, e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] h-9"
              >
                <option value="">— seç —</option>
                {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.kind === 'checkbox' ? (
              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!values[f.key]}
                  onChange={e => setVal(f.key, e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                {f.placeholder ?? 'Kabul ediyorum'}
              </label>
            ) : (
              <Input
                type={f.kind === 'email' ? 'email' : f.kind === 'number' ? 'number' : 'text'}
                value={String(values[f.key] ?? '')}
                onChange={e => setVal(f.key, e.target.value)}
                placeholder={f.placeholder}
              />
            )}
          </div>
        ))}

        <div className="space-y-1.5">
          <Label className="text-[12.5px]">E-posta (opsiyonel — cevap için)</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="siz@ornek.com" />
        </div>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
            {error}
          </div>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={submit.isPending}>Gönder</Button>
        </div>
      </form>
    </div>
  );
}
