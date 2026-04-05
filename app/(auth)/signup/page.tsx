import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignupPage() {
  return (
    <AuthShell
      title="Crear cuenta"
      description="Crea tu cuenta en Fixy como taller o como propietario de vehiculo y entra con una experiencia moderna, clara y lista para moverse desde el telefono."
    >
      <AuthForm variant="signup" />
    </AuthShell>
  );
}
