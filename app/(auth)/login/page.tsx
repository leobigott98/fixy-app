import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      title="Entrar a Fixy"
      description="Elige el metodo que te resulte mas comodo. Puedes entrar con contrasena, magic link o SMS segun como tengas configurada tu cuenta."
    >
      <AuthForm variant="login" />
    </AuthShell>
  );
}
