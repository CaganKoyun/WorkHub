import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildShortcuts, type ShortcutDef } from '@/lib/keybinds';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GlobalSearch } from '@/components/GlobalSearch';
import { Keyboard } from 'lucide-react';

/**
 * App-scope shortcut host. Mounts a global keydown listener and the
 * shortcuts overlay dialog. Also owns the Cmd+K palette state (was
 * ad-hoc before) so shortcuts trigger it.
 */
export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const bundle = useMemo(() => buildShortcuts({
    navigate,
    openPalette: () => setPaletteOpen(true),
    openHelp: () => setHelpOpen(true),
    newIssue: () => navigate('/tasks?new=1'),
  }), [navigate]);

  useEffect(() => bundle.install(), [bundle]);

  return (
    <>
      {children}
      <GlobalSearch open={paletteOpen} onOpenChange={setPaletteOpen} />
      <HelpOverlay open={helpOpen} onOpenChange={setHelpOpen} shortcuts={bundle.shortcuts} />
    </>
  );
}

function HelpOverlay({ open, onOpenChange, shortcuts }: {
  open: boolean; onOpenChange: (o: boolean) => void; shortcuts: ShortcutDef[];
}) {
  const grouped = useMemo(() => {
    const map = new Map<ShortcutDef['category'], ShortcutDef[]>();
    for (const s of shortcuts) {
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return [...map.entries()];
  }, [shortcuts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <Keyboard className="h-4 w-4" /> Klavye kısayolları
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {grouped.map(([cat, items]) => (
            <section key={cat}>
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-1.5">{cat}</div>
              <div className="rounded-md border border-border/60 divide-y divide-border/40">
                {items.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-1.5 text-[12.5px]">
                    <span>{s.label}</span>
                    <span className="font-mono text-[11px] rounded border border-border bg-secondary/40 px-1.5 py-0.5 text-muted-foreground">
                      {s.keys}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
          <p className="text-[11px] text-muted-foreground pt-1">
            Kısayolları input veya editör içindeyken çalıştırmaz — <code className="font-mono">⌘K</code> ve <code className="font-mono">?</code> hariç.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
