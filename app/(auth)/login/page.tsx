import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      title="Entrar a Fixy"
      description="Ingresa a tu taller para ver presupuesto, ordenes y estado operativo desde una sola base."
    >
      <AuthForm variant="login" />
    </AuthShell>
  );
}
