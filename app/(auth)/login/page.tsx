import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      title="Entrar a Fixy"
      description="Ingresa a tu taller con correo o telefono para ver tu espacio operativo segun tu rol."
    >
      <AuthForm variant="login" />
    </AuthShell>
  );
}
