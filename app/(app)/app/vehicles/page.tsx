import { ModuleScaffoldPage } from "@/components/shared/module-scaffold-page";
import { moduleContent } from "@/lib/modules";

export default function VehiclesPage() {
  return <ModuleScaffoldPage {...moduleContent.vehicles} />;
}
