import { DomainWorkspace } from "@/components/DomainWorkspace";
import { ProjectsListView } from "@/components/projects/ProjectsListView";

export default function Projects() {
  return (
    <DomainWorkspace
      domain="projects"
      title="Projects"
      subtitle="Program yönetimi çalışma alanı: proje sağlığı, gecikmeler, kapasite."
    >
      <ProjectsListView />
    </DomainWorkspace>
  );
}

