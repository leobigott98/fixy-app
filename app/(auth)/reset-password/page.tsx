import { PasswordResetForm } from "@/components/auth/password-reset-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Nueva contrasena"
      description="Define una nueva contrasena para tu cuenta. Si el enlace vencio, vuelve a solicitar la recuperacion."
    >
      <PasswordResetForm />
    </AuthShell>
  );
}
