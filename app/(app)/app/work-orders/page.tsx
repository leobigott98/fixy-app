import { ModuleScaffoldPage } from "@/components/shared/module-scaffold-page";
import { moduleContent } from "@/lib/modules";

export default function WorkOrdersPage() {
  return <ModuleScaffoldPage {...moduleContent["work-orders"]} />;
}
