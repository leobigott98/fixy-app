import { ModuleScaffoldPage } from "@/components/shared/module-scaffold-page";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { moduleContent } from "@/lib/modules";

export default async function WorkOrdersPage() {
  await requireCurrentWorkshop();
  return <ModuleScaffoldPage {...moduleContent["work-orders"]} />;
}
