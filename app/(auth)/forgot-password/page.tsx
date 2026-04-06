import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";
import { AuthShell } from "@/components/auth/auth-shell";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    auth?: string | string[];
  }>;
};

function getFirstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Recuperar contrasena"
      description="Te enviamos un enlace para definir una nueva contrasena. Si tu acceso principal es por telefono, puedes entrar desde login usando SMS."
    >
      <PasswordRecoveryForm initialNoticeKey={getFirstParam(params.auth) ?? null} />
    </AuthShell>
  );
}
