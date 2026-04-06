import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignupPage() {
  return (
    <AuthShell
      title="Crear cuenta"
      description="Crea tu cuenta como taller o propietario de vehiculo y elige desde el inicio la forma de acceso que te genere menos friccion."
    >
      <AuthForm variant="signup" />
    </AuthShell>
  );
}
