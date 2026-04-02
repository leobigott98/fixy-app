import { ModuleScaffoldPage } from "@/components/shared/module-scaffold-page";
import { moduleContent } from "@/lib/modules";

export default function SettingsPage() {
  return <ModuleScaffoldPage {...moduleContent.settings} />;
}
