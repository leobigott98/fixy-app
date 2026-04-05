import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      title="Entrar a Fixy"
      description="Ingresa con correo o telefono y valida el codigo para abrir tu espacio operativo segun tu rol."
    >
      <AuthForm variant="login" />
    </AuthShell>
  );
}
