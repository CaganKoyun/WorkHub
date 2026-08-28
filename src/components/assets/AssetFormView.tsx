import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateAsset, useUpdateAsset, useCategories } from '@/lib/assets-hooks';
import type { AssetCondition } from '@/lib/assets-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface AssetFormProps {
  asset?: {
    id: string; name: string; category_id: string | null; serial_number: string | null;
    purchase_date: string; purchase_cost: number; condition: AssetCondition;
    location: string | null; notes: string | null; useful_life_years: number; residual_value_percent: number;
  };
}

export function AssetFormView({ asset }: AssetFormProps = {}) {
  const navigate = useNavigate();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const { data: categories } = useCategories();

  const isEdit = !!asset;

  const [name, setName] = useState(asset?.name ?? '');
  const [categoryId, setCategoryId] = useState(asset?.category_id ?? '');
  const [serialNumber, setSerialNumber] = useState(asset?.serial_number ?? '');
  const [purchaseDate, setPurchaseDate] = useState(asset?.purchase_date ?? new Date().toISOString().split('T')[0]);
  const [purchaseCost, setPurchaseCost] = useState(asset ? String(asset.purchase_cost) : '');
  const [condition, setCondition] = useState<AssetCondition>(asset?.condition ?? 'good');
  const [location, setLocation] = useState(asset?.location ?? '');
  const [notes, setNotes] = useState(asset?.notes ?? '');
  const [usefulLife, setUsefulLife] = useState(asset ? String(asset.useful_life_years) : '3');
  const [residualPercent, setResidualPercent] = useState(asset ? String(asset.residual_value_percent) : '0');

  const handleCategoryChange = (id: string) => {
    setCategoryId(id);
    if (!isEdit) {
      const cat = categories?.find(c => c.id === id);
      if (cat) setUsefulLife(String(cat.default_useful_life_years));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const values = {
      name,
      category_id: categoryId || null,
      serial_number: serialNumber || null,
      purchase_date: purchaseDate,
      purchase_cost: parseFloat(purchaseCost) || 0,
      condition,
      location: location || null,
      notes: notes || null,
      useful_life_years: parseInt(usefulLife) || 3,
      residual_value_percent: parseFloat(residualPercent) || 0,
    };
    try {
      if (isEdit && asset) {
        await updateAsset.mutateAsync({ id: asset.id, ...values });
        toast.success('Varlık güncellendi');
        navigate(`/assets/${asset.id}`);
      } else {
        await createAsset.mutateAsync(values);
        toast.success('Varlık oluşturuldu');
        navigate('/assets');
      }
    } catch {
      toast.error(isEdit ? 'Varlık güncellenemedi' : 'Varlık oluşturulamadı');
    }
  };

  const isPending = isEdit ? updateAsset.isPending : createAsset.isPending;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">{isEdit ? 'Varlık Düzenle' : 'Varlık Ekle'}</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Ad *</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder='MacBook Pro 14"' />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select value={categoryId} onValueChange={handleCategoryChange}>
                  <SelectTrigger><SelectValue placeholder="Kategori seç" /></SelectTrigger>
                  <SelectContent>
                    {(categories ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="serial">Seri / Kimlik Numarası</Label>
                <Input id="serial" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="SN-12345" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Durum *</Label>
                <Select value={condition} onValueChange={v => setCondition(v as AssetCondition)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Mükemmel</SelectItem>
                    <SelectItem value="good">İyi</SelectItem>
                    <SelectItem value="fair">Orta</SelectItem>
                    <SelectItem value="poor">Kötü</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Satın Alma Tarihi *</Label>
                <Input id="purchaseDate" type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost">Satın Alma Maliyeti *</Label>
                <Input id="cost" type="number" step="0.01" min="0" value={purchaseCost} onChange={e => setPurchaseCost(e.target.value)} required placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="usefulLife">Faydalı Ömür (yıl)</Label>
                <Input id="usefulLife" type="number" min="1" value={usefulLife} onChange={e => setUsefulLife(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Konum</Label>
                <Input id="location" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ofis 2A, B Bina" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="residual">Hurda Değeri (%)</Label>
                <Input id="residual" type="number" min="0" max="100" step="1" value={residualPercent} onChange={e => setResidualPercent(e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opsiyonel notlar..." rows={3} />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="submit" disabled={isPending}>{isPending ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Kaydet'}</Button>
              <Button type="button" variant="outline" onClick={() => isEdit && asset ? navigate(`/assets/${asset.id}`) : navigate('/assets')}>İptal</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
