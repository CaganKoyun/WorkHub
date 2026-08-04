import { AppLayout } from "@/components/AppLayout";
import { ProjectFormView } from "@/components/projects/ProjectFormView";

export default function ProjectNew() {
  return (
    <AppLayout>
      <div className="p-4 lg:p-6">
        <ProjectFormView mode="create" />
      </div>
    </AppLayout>
  );
}
