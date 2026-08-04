import { DomainWorkspace } from "@/components/DomainWorkspace";
import { EmployeesListView } from "@/components/assets/EmployeesListView";

export default function Employees() {
  return (
    <DomainWorkspace
      domain="employees"
      title="Employees"
      subtitle="People çalışma alanı: kadro, departmanlar, onboarding."
    >
      <EmployeesListView />
    </DomainWorkspace>
  );
}
