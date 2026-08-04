import { AppLayout } from "@/components/AppLayout";
import { AssetFormView } from "@/components/assets/AssetFormView";

export default function AssetNew() {
  return (
    <AppLayout>
      <div className="p-4 lg:p-6">
        <AssetFormView />
      </div>
    </AppLayout>
  );
}
