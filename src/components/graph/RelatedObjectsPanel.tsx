import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useObjectLinks, useCreateObjectLink, useDeleteObjectLink } from "@/lib/graph-hooks";
import { LINKABLE_LABELS, type LinkableType } from "@/lib/graph-types";
import { Link2, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface RelatedObjectsPanelProps {
  type: LinkableType;
  id: string;
  title?: string;
}

/**
 * Company Graph — shows every object linked to this record and lets the user add more.
 * Drop into any detail view: <RelatedObjectsPanel type="project" id={project.id} />
 */
export function RelatedObjectsPanel({ type, id, title = "Bağlı Kayıtlar" }: RelatedObjectsPanelProps) {
  const { data: links, isLoading } = useObjectLinks(type, id);
  const remove = useDeleteObjectLink();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Link2 className="h-4 w-4" /> {title}
            {links && links.length > 0 && (
              <Badge variant="secondary" className="ml-1">{links.length}</Badge>
            )}
          </CardTitle>
          <AddLinkPopover type={type} id={id} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Yükleniyor…</p>
        ) : !links || links.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Henüz bağlı kayıt yok. Bu kaydı bir müşteriye, hedefe, sözleşmeye veya başka bir nesneye bağlayabilirsiniz.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {links.map(link => {
              const isFrom = link.from_type === type && link.from_id === id;
              const otherType = isFrom ? link.to_type : link.from_type;
              const otherId = isFrom ? link.to_id : link.from_id;
              return (
                <li key={link.id} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {LINKABLE_LABELS[otherType] ?? otherType}
                  </Badge>
                  <span className="text-muted-foreground truncate flex-1 font-mono text-xs">
                    {otherId.slice(0, 8)}…
                  </span>
                  {link.link_kind && link.link_kind !== "related" && (
                    <Badge variant="secondary" className="text-[10px]">{link.link_kind}</Badge>
                  )}
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6"
                    onClick={() => remove.mutate(link.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AddLinkPopover({ type, id }: { type: LinkableType; id: string }) {
  const [open, setOpen] = useState(false);
  const [toType, setToType] = useState<LinkableType>("goal");
  const [toId, setToId] = useState("");
  const [linkKind, setLinkKind] = useState("related");
  const create = useCreateObjectLink();

  const submit = async () => {
    if (!toId.trim()) return;
    try {
      await create.mutateAsync({
        from_type: type, from_id: id,
        to_type: toType, to_id: toId.trim(),
        link_kind: linkKind || "related",
      });
      toast.success("Bağlantı eklendi");
      setToId("");
      setOpen(false);
    } catch (e) {
      toast.error("Eklenemedi: " + (e instanceof Error ? e.message : ""));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost">
          <Plus className="h-3.5 w-3.5 mr-1" /> Bağla
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2">
        <div>
          <label className="text-xs text-muted-foreground">Nesne tipi</label>
          <Select value={toType} onValueChange={(v) => setToType(v as LinkableType)}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(LINKABLE_LABELS) as LinkableType[]).map(t => (
                <SelectItem key={t} value={t}>{LINKABLE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Kayıt ID</label>
          <Input
            className="h-8 font-mono text-xs"
            value={toId} onChange={(e) => setToId(e.target.value)}
            placeholder="UUID yapıştırın"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">İlişki türü</label>
          <Input
            className="h-8" value={linkKind} onChange={(e) => setLinkKind(e.target.value)}
            placeholder="related / blocks / depends_on / …"
          />
        </div>
        <Button size="sm" className="w-full" onClick={submit} disabled={create.isPending || !toId.trim()}>
          Bağla
        </Button>
      </PopoverContent>
    </Popover>
  );
}
