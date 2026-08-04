import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useWhiteboards, useWhiteboard, useCreateWhiteboard, useUpdateWhiteboard,
  useDeleteWhiteboard, type Shape, type ShapeKind, type Whiteboard,
} from '@/lib/whiteboards-hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MousePointer2, Square, Circle, Type, ArrowRight, Trash2, Undo2, Redo2,
  Plus, PenSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Tool = 'select' | ShapeKind;

const COLORS = ['#e5e7eb', '#93c5fd', '#86efac', '#fde68a', '#fca5a5', '#c4b5fd'];

// ---- List page ------------------------------------------------------------

function BoardsList() {
  const { data, isLoading } = useWhiteboards();
  const create = useCreateWhiteboard();
  const del = useDeleteWhiteboard();
  const navigate = useNavigate();

  const addBoard = async () => {
    try {
      const b = await create.mutateAsync({});
      navigate(`/whiteboards/${b.id}`);
    } catch (e: any) { toast.error(e.message); }
  };

  const doDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" panosunu sil?`)) return;
    try { await del.mutateAsync(id); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight flex items-center gap-2">
            <PenSquare className="h-5 w-5 text-muted-foreground" /> Panolar
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Excalidraw tarzı serbest çizim panoları. Kutu, elips, metin, ok.
            Değişiklikler otomatik kaydolur.
          </p>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={addBoard} disabled={create.isPending}>
          <Plus className="h-3.5 w-3.5" /> Yeni pano
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (data ?? []).length === 0 ? (
        <div className="rounded-md border border-dashed border-border/60 py-14 text-center">
          <PenSquare className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-[13px] text-muted-foreground">Henüz pano yok.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {(data ?? []).map(b => (
            <div key={b.id} className="group rounded-md border border-border/60 bg-secondary/20 hover:bg-sidebar-accent/25 transition">
              <button
                onClick={() => navigate(`/whiteboards/${b.id}`)}
                className="block w-full text-left p-3"
              >
                <div className="h-20 rounded bg-background/60 border border-border/40 grid place-items-center text-[10px] text-muted-foreground mb-2">
                  {b.elements.length} eleman
                </div>
                <div className="text-[13px] font-medium truncate">{b.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  Son değişiklik: {new Date(b.updated_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </button>
              <div className="flex justify-end px-2 pb-2">
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={() => doDelete(b.id, b.name)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Editor ---------------------------------------------------------------

interface DragState {
  kind: 'draw' | 'move';
  startX: number;
  startY: number;
  origShape?: Shape;
  drafting?: Shape;
}

function svgPoint(svg: SVGSVGElement, e: React.PointerEvent) {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: e.clientX, y: e.clientY };
  const m = pt.matrixTransform(ctm.inverse());
  return { x: m.x, y: m.y };
}

function renderShape(s: Shape, isSelected: boolean, onPointerDown: (e: React.PointerEvent) => void) {
  const stroke = s.stroke ?? '#94a3b8';
  const strokeWidth = isSelected ? 2.5 : 1.5;
  const strokeColor = isSelected ? '#5E6AD2' : stroke;
  const fill = s.color ?? 'transparent';
  const common = {
    onPointerDown,
    className: 'cursor-move',
    stroke: strokeColor,
    strokeWidth,
  };
  if (s.kind === 'rect') {
    return <rect x={Math.min(s.x, s.x + (s.w ?? 0))} y={Math.min(s.y, s.y + (s.h ?? 0))} width={Math.abs(s.w ?? 0)} height={Math.abs(s.h ?? 0)} rx={4} fill={fill} {...common} />;
  }
  if (s.kind === 'ellipse') {
    const w = Math.abs(s.w ?? 0), h = Math.abs(s.h ?? 0);
    return <ellipse cx={s.x + (s.w ?? 0) / 2} cy={s.y + (s.h ?? 0) / 2} rx={w / 2} ry={h / 2} fill={fill} {...common} />;
  }
  if (s.kind === 'text') {
    return <text x={s.x} y={s.y + 16} fontSize={16} fill={s.stroke ?? '#e2e8f0'} onPointerDown={onPointerDown} className="cursor-move select-none">{s.text ?? ''}</text>;
  }
  if (s.kind === 'arrow') {
    return (
      <g onPointerDown={onPointerDown} className="cursor-move">
        <line x1={s.x} y1={s.y} x2={s.x2 ?? s.x} y2={s.y2 ?? s.y} stroke={strokeColor} strokeWidth={strokeWidth} />
        <polygon
          points={arrowHead(s.x, s.y, s.x2 ?? s.x, s.y2 ?? s.y)}
          fill={strokeColor}
        />
      </g>
    );
  }
  return null;
}

function arrowHead(x1: number, y1: number, x2: number, y2: number, size = 8) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const px = -uy, py = ux;
  const bx = x2 - ux * size, by = y2 - uy * size;
  return `${x2},${y2} ${bx + px * size / 2},${by + py * size / 2} ${bx - px * size / 2},${by - py * size / 2}`;
}

function BoardEditor({ board }: { board: Whiteboard }) {
  const update = useUpdateWhiteboard();
  const [tool, setTool] = useState<Tool>('select');
  const [color, setColor] = useState<string>(COLORS[1]);
  const [name, setName] = useState(board.name);
  const [elements, setElements] = useState<Shape[]>(board.elements);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const undoStack = useRef<Shape[][]>([]);
  const redoStack = useRef<Shape[][]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    setElements(board.elements);
    setName(board.name);
    setDirty(false);
    undoStack.current = []; redoStack.current = [];
  }, [board.id]);

  // Autosave
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        await update.mutateAsync({ id: board.id, name, elements });
        setDirty(false);
      } catch (e: any) {
        toast.error(e.message ?? 'Kaydedilemedi');
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [name, elements, dirty, board.id]);

  // Delete key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        pushUndo();
        setElements(prev => prev.filter(s => s.id !== selectedId));
        setSelectedId(null);
        setDirty(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); doRedo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  const pushUndo = () => {
    undoStack.current.push(elements);
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  };
  const doUndo = () => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(elements);
    setElements(prev);
    setDirty(true);
  };
  const doRedo = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(elements);
    setElements(next);
    setDirty(true);
  };

  const onCanvasDown = (e: React.PointerEvent) => {
    if (!svgRef.current) return;
    const p = svgPoint(svgRef.current, e);
    if (tool === 'select') {
      setSelectedId(null);
      return;
    }
    if (tool === 'text') {
      const t = prompt('Metin:');
      if (!t) return;
      pushUndo();
      const s: Shape = { id: crypto.randomUUID(), kind: 'text', x: p.x, y: p.y, text: t, stroke: '#e2e8f0' };
      setElements(prev => [...prev, s]);
      setSelectedId(s.id);
      setDirty(true);
      return;
    }
    const draft: Shape = tool === 'arrow'
      ? { id: crypto.randomUUID(), kind: 'arrow', x: p.x, y: p.y, x2: p.x, y2: p.y, stroke: color }
      : { id: crypto.randomUUID(), kind: tool, x: p.x, y: p.y, w: 0, h: 0, color: 'transparent', stroke: color };
    setDrag({ kind: 'draw', startX: p.x, startY: p.y, drafting: draft });
  };

  const onCanvasMove = (e: React.PointerEvent) => {
    if (!drag || !svgRef.current) return;
    const p = svgPoint(svgRef.current, e);
    if (drag.kind === 'draw' && drag.drafting) {
      const s = drag.drafting;
      if (s.kind === 'arrow') {
        s.x2 = p.x; s.y2 = p.y;
      } else {
        s.w = p.x - drag.startX;
        s.h = p.y - drag.startY;
      }
      setDrag({ ...drag });
    } else if (drag.kind === 'move' && drag.origShape) {
      const dx = p.x - drag.startX;
      const dy = p.y - drag.startY;
      const o = drag.origShape;
      setElements(prev => prev.map(s => {
        if (s.id !== o.id) return s;
        if (s.kind === 'arrow') return { ...s, x: o.x + dx, y: o.y + dy, x2: (o.x2 ?? 0) + dx, y2: (o.y2 ?? 0) + dy };
        return { ...s, x: o.x + dx, y: o.y + dy };
      }));
    }
  };

  const onCanvasUp = () => {
    if (drag?.kind === 'draw' && drag.drafting) {
      const d = drag.drafting;
      // Ignore accidental micro-drags
      const size = d.kind === 'arrow'
        ? Math.hypot((d.x2 ?? 0) - d.x, (d.y2 ?? 0) - d.y)
        : Math.hypot(d.w ?? 0, d.h ?? 0);
      if (size > 4) {
        pushUndo();
        setElements(prev => [...prev, d]);
        setSelectedId(d.id);
        setDirty(true);
      }
    }
    if (drag?.kind === 'move') setDirty(true);
    setDrag(null);
  };

  const startMove = (shape: Shape) => (e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedId(shape.id);
    if (tool !== 'select') return;
    if (!svgRef.current) return;
    const p = svgPoint(svgRef.current, e);
    pushUndo();
    setDrag({ kind: 'move', startX: p.x, startY: p.y, origShape: shape });
  };

  const tools: { id: Tool; icon: React.ElementType; label: string; hint: string }[] = [
    { id: 'select',  icon: MousePointer2, label: 'Seç',   hint: 'V' },
    { id: 'rect',    icon: Square,        label: 'Kutu',  hint: 'R' },
    { id: 'ellipse', icon: Circle,        label: 'Elips', hint: 'O' },
    { id: 'arrow',   icon: ArrowRight,    label: 'Ok',    hint: 'A' },
    { id: 'text',    icon: Type,          label: 'Metin', hint: 'T' },
  ];

  const draftingShape = drag?.kind === 'draw' ? drag.drafting : null;

  return (
    <div className="flex h-[calc(100vh-52px)] flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <Input
          value={name}
          onChange={e => { setName(e.target.value); setDirty(true); }}
          className="h-8 max-w-xs text-[13px] font-medium"
        />
        <div className="flex items-center gap-0.5 rounded-md border border-border/60 p-0.5">
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={`${t.label} (${t.hint})`}
              className={cn(
                'h-7 w-7 grid place-items-center rounded transition-colors',
                tool === t.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40',
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                'h-5 w-5 rounded-full border-2 transition',
                color === c ? 'border-primary scale-110' : 'border-border/40',
              )}
              style={{ backgroundColor: c }}
              title="Renk"
            />
          ))}
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={doUndo} title="Geri (⌘Z)">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={doRedo} title="İleri (⌘⇧Z)">
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
        {selectedId && (
          <Button
            size="icon" variant="ghost" className="h-7 w-7 text-destructive"
            onClick={() => { pushUndo(); setElements(prev => prev.filter(s => s.id !== selectedId)); setSelectedId(null); setDirty(true); }}
            title="Sil (Delete)"
          ><Trash2 className="h-3.5 w-3.5" /></Button>
        )}
        <span className={cn(
          'ml-auto text-[11px] transition-opacity',
          saving ? 'text-muted-foreground opacity-100'
            : dirty ? 'text-amber-500 opacity-100'
            : 'opacity-0',
        )}>
          {saving ? 'Kaydediliyor…' : dirty ? 'Kaydedilmedi' : ''}
        </span>
      </div>
      <div className="flex-1 bg-[#0b0d10] overflow-hidden">
        <svg
          ref={svgRef}
          className={cn('h-full w-full', tool === 'select' ? 'cursor-default' : 'cursor-crosshair')}
          onPointerDown={onCanvasDown}
          onPointerMove={onCanvasMove}
          onPointerUp={onCanvasUp}
          onPointerLeave={onCanvasUp}
        >
          <defs>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1f2937" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {elements.map(s => (
            <g key={s.id}>
              {renderShape(s, s.id === selectedId, startMove(s))}
            </g>
          ))}
          {draftingShape && renderShape(draftingShape, true, () => {})}
        </svg>
      </div>
    </div>
  );
}

// ---- Router shim ----------------------------------------------------------

export default function Whiteboards() {
  const { id } = useParams<{ id?: string }>();
  const { data: board, isLoading } = useWhiteboard(id);
  if (!id) return <BoardsList />;
  if (isLoading) {
    return <div className="p-6"><Skeleton className="h-96" /></div>;
  }
  if (!board) {
    return (
      <div className="mx-auto max-w-lg pt-24 text-center text-[13px] text-muted-foreground">
        Pano bulunamadı.
      </div>
    );
  }
  return <BoardEditor key={board.id} board={board} />;
}
