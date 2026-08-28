import { DomainWorkspace } from "@/components/DomainWorkspace";
import { MyTasksView } from "@/components/tasks/MyTasksView";

export default function Tasks() {
  return (
    <DomainWorkspace
      domain="tasks"
      title="Görevlerim"
      subtitle="Kişisel çalışma alanı: bugünün planı, bloklanan işler, öncelikler."
    >
      <MyTasksView />
    </DomainWorkspace>
  );
}
