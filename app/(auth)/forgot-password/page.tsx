import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recibir codigo de acceso"
      description="Si no te llego el codigo o necesitas entrar otra vez, vuelve a solicitarlo por correo o telefono."
    >
      <AuthForm variant="forgot-password" />
    </AuthShell>
  );
}
