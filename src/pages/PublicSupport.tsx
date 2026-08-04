import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSubmitTicket, TICKET_PRIORITY_LABELS, type TicketPriority } from '@/lib/tickets-hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Headphones } from 'lucide-react';

export default function PublicSupport() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const submit = useSubmitTicket();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [tracking, setTracking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!workspaceId) { setError('Geçersiz destek adresi.'); return; }
    if (!email.trim() || !subject.trim() || !body.trim()) {
      setError('E-posta, konu ve açıklama zorunlu.'); return;
    }
    try {
      const t = await submit.mutateAsync({
        workspace_id: workspaceId,
        subject: subject.trim(),
        body: body.trim(),
        requester_email: email.trim(),
        requester_name: name.trim() || undefined,
        priority,
      });
      setTracking(t.tracking_id);
    } catch (err: any) {
      setError(err.message ?? 'Gönderilemedi.');
    }
  };

  if (tracking) {
    return (
      <div className="mx-auto max-w-lg pt-24 text-center px-6">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
        <h1 className="mt-3 text-[18px] font-semibold">Talebiniz alındı</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Takip numaranız: <span className="font-mono">{tracking}</span>. Ekip en kısa
          sürede size dönecek.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-10 px-6">
      <div className="flex items-center gap-2">
        <Headphones className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-[20px] font-semibold tracking-tight">Destek talebi</h1>
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Sorununuzu kısaca özetleyin, ekibimiz talebinizi önceliğe göre yanıtlar.
      </p>
      <form onSubmit={doSubmit} className="mt-6 space-y-3">
        <div className="grid gap-1.5">
          <Label>E-posta *</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="siz@ornek.com" required />
        </div>
        <div className="grid gap-1.5">
          <Label>Ad (opsiyonel)</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Adınız" />
        </div>
        <div className="grid gap-1.5">
          <Label>Konu *</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Kısa özet" required />
        </div>
        <div className="grid gap-1.5">
          <Label>Öncelik</Label>
          <Select value={priority} onValueChange={v => setPriority(v as TicketPriority)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map(p => (
                <SelectItem key={p} value={p}>{TICKET_PRIORITY_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Açıklama *</Label>
          <textarea
            value={body} onChange={e => setBody(e.target.value)}
            rows={6}
            placeholder="Ne oldu? Ne bekliyordunuz?"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px]"
            required
          />
        </div>
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12.5px] text-destructive">
            {error}
          </div>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={submit.isPending}>Talebi gönder</Button>
        </div>
      </form>
    </div>
  );
}
