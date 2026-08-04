import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProjectDetailView } from "@/components/projects/ProjectDetailView";

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  return (
    <AppLayout>
      <div className="p-4 lg:p-6">
        {id && <ProjectDetailView projectId={id} />}
      </div>
    </AppLayout>
  );
}
