import { DomainWorkspace } from "@/components/DomainWorkspace";
import { EmployeesListView } from "@/components/assets/EmployeesListView";

export default function Employees() {
  return (
    <DomainWorkspace
      domain="employees"
      title="Çalışanlar"
      subtitle="İnsan kaynakları çalışma alanı: kadro, departmanlar, işe alıştırma."
    >
      <EmployeesListView />
    </DomainWorkspace>
  );
}
