import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AssetDetailView } from "@/components/assets/AssetDetailView";

export default function AssetDetail() {
  const { assetId } = useParams<{ assetId: string }>();
  return (
    <AppLayout>
      <div className="p-4 lg:p-6">
        {assetId && <AssetDetailView assetId={assetId} />}
      </div>
    </AppLayout>
  );
}
