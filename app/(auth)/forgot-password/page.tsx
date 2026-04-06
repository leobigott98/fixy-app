import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recuperar contrasena"
      description="Te enviamos un enlace para definir una nueva contrasena. Si tu acceso principal es por telefono, puedes entrar desde login usando SMS."
    >
      <PasswordRecoveryForm />
    </AuthShell>
  );
}
