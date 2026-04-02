import { ModuleScaffoldPage } from "@/components/shared/module-scaffold-page";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { moduleContent } from "@/lib/modules";

export default async function QuotesPage() {
  await requireCurrentWorkshop();
  return <ModuleScaffoldPage {...moduleContent.quotes} />;
}
