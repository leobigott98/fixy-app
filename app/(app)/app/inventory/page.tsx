import { ModuleScaffoldPage } from "@/components/shared/module-scaffold-page";
import { moduleContent } from "@/lib/modules";

export default function InventoryPage() {
  return <ModuleScaffoldPage {...moduleContent.inventory} />;
}
