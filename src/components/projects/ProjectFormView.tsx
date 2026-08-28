import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateProject, useProject, useUpdateProject } from '@/lib/projects-hooks';
import { PROJECT_STATUS_LABELS, PRIORITY_LABELS } from '@/lib/projects-types';
import type { ProjectStatus, ProjectPriority } from '@/lib/projects-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const EMOJI_OPTIONS = ['📁','🚀','💼','🎯','⚡','🔧','🎨','📊','🧪','🌱'];
const COLOR_OPTIONS = ['#C6F432','#5EA8FF','#FBBF24','#4ADE80','#2DD4BF','#FF6B5E','#F5C6E8','#FFD9B0'];

export function ProjectFormView({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: existing } = useProject(mode === 'edit' ? id : undefined);
  const create = useCreateProject();
  const update = useUpdateProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('planned');
  const [priority, setPriority] = useState<ProjectPriority>('medium');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [color, setColor] = useState('#C6F432');
  const [icon, setIcon] = useState('📁');

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? '');
      setStatus(existing.status);
      setPriority(existing.priority);
      setStartDate(existing.start_date ?? '');
      setEndDate(existing.end_date ?? '');
      setColor(existing.color ?? '#C6F432');
      setIcon(existing.icon ?? '📁');
    }
  }, [existing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Proje adı gerekli'); return; }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      toast.error('Bitiş tarihi başlangıçtan önce olamaz');
      return;
    }
    const payload = {
      name: name.trim(),
      description,
      status,
      priority,
      start_date: startDate || null,
      end_date: endDate || null,
      color,
      icon,
    };
    try {
      if (mode === 'edit' && id) {
        await update.mutateAsync({ id, ...payload });
        toast.success('Proje güncellendi');
        navigate(`/projects/${id}`);
      } else {
        const p = await create.mutateAsync(payload);
        toast.success('Proje oluşturuldu');
        navigate(`/projects/${p.id}`);
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Hata');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold">{mode === 'edit' ? 'Projeyi düzenle' : 'Yeni proje'}</h1>

      <div className="space-y-2">
        <Label>Ad *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Proje adını girin" />
      </div>

      <div className="space-y-2">
        <Label>Açıklama</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Projenin kısa açıklaması" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Durum</Label>
          <Select value={status} onValueChange={v => setStatus(v as ProjectStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map(s => (
                <SelectItem key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Öncelik</Label>
          <Select value={priority} onValueChange={v => setPriority(v as ProjectPriority)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PRIORITY_LABELS) as ProjectPriority[]).map(p => (
                <SelectItem key={p} value={p}>{PRIORITY_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Başlangıç</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Bitiş</Label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>İkon</Label>
        <div className="flex flex-wrap gap-1.5">
          {EMOJI_OPTIONS.map(e => (
            <button key={e} type="button" onClick={() => setIcon(e)}
              className={`w-9 h-9 rounded border text-lg ${icon === e ? 'border-primary bg-accent' : 'border-border'}`}>{e}</button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Renk</Label>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_OPTIONS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`w-9 h-9 rounded border-2 ${color === c ? 'border-foreground' : 'border-transparent'}`}
              style={{ background: c }} />
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={create.isPending || update.isPending}>
          {mode === 'edit' ? 'Kaydet' : 'Oluştur'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => navigate(-1)}>İptal</Button>
      </div>
    </form>
  );
}
