import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

type SignupPageProps = {
  searchParams: Promise<{
    auth?: string | string[];
  }>;
};

function getFirstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Crear cuenta"
      description="Crea tu cuenta como taller o propietario de vehiculo y elige desde el inicio la forma de acceso que te genere menos friccion."
    >
      <AuthForm initialNoticeKey={getFirstParam(params.auth) ?? null} variant="signup" />
    </AuthShell>
  );
}
