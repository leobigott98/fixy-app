import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { MfaForm } from "@/components/auth/mfa-form";
import { requireAppSession } from "@/lib/auth/session";
import { getCurrentWorkshopAccess } from "@/lib/data/workshops";
import { getRoleLabel } from "@/lib/permissions";

export default async function MfaPage() {
  const session = await requireAppSession();
  const access = await getCurrentWorkshopAccess();

  if (access && !["owner", "admin"].includes(access.role)) {
    redirect("/app/dashboard");
  }

  const roleLabel = access ? getRoleLabel(access.role) : session.user.role;

  return (
    <AuthShell
      title="Verificacion administrativa"
      description="Antes de abrir el panel administrativo, valida tu segundo factor desde una app autenticadora."
    >
      <MfaForm roleLabel={roleLabel} />
    </AuthShell>
  );
}
