import { DomainWorkspace } from "@/components/DomainWorkspace";
import { AssetsListView } from "@/components/assets/AssetsListView";

export default function Assets() {
  return (
    <DomainWorkspace
      domain="assets"
      title="Assets"
      subtitle="Operasyon çalışma alanı: zimmet, lisans, bakım ve yenileme."
    >
      <AssetsListView />
    </DomainWorkspace>
  );
}
