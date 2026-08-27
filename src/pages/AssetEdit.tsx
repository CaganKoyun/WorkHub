import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AssetFormView } from "@/components/assets/AssetFormView";
import { useAsset } from "@/lib/assets-hooks";
import { Skeleton } from "@/components/ui/skeleton";

export default function AssetEdit() {
  const { assetId } = useParams<{ assetId: string }>();
  const { data: asset, isLoading } = useAsset(assetId ?? "");

  return (
    <AppLayout>
      <div className="p-4 lg:p-6">
        {isLoading ? (
          <div className="mx-auto max-w-2xl space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : !asset ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Varlık bulunamadı</p>
          </div>
        ) : (
          <AssetFormView
            asset={{
              id: asset.id,
              name: asset.name,
              category_id: asset.category_id,
              serial_number: asset.serial_number,
              purchase_date: asset.purchase_date,
              purchase_cost: Number(asset.purchase_cost),
              condition: asset.condition,
              location: asset.location,
              notes: asset.notes,
              useful_life_years: asset.useful_life_years,
              residual_value_percent: Number(asset.residual_value_percent),
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
