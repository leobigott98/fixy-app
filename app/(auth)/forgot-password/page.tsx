import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recuperar acceso"
      description="Deja preparado el flujo para recuperar clave. En Sprint 1 esto se conecta a Supabase Auth."
    >
      <AuthForm variant="forgot-password" />
    </AuthShell>
  );
}
