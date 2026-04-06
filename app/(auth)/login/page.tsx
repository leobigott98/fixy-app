import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

type LoginPageProps = {
  searchParams: Promise<{
    auth?: string | string[];
  }>;
};

function getFirstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Entrar a Fixy"
      description="Elige el metodo que te resulte mas comodo. Puedes entrar con contrasena, magic link o SMS segun como tengas configurada tu cuenta."
    >
      <AuthForm initialNoticeKey={getFirstParam(params.auth) ?? null} variant="login" />
    </AuthShell>
  );
}
