import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignupPage() {
  return (
    <AuthShell
      title="Crear cuenta"
      description="Registra tu taller con un codigo al correo y entra a una experiencia moderna, clara y lista para crecer."
    >
      <AuthForm variant="signup" />
    </AuthShell>
  );
}
