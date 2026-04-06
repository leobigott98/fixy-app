import { PasswordResetForm } from "@/components/auth/password-reset-form";
import { AuthShell } from "@/components/auth/auth-shell";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    auth?: string | string[];
  }>;
};

function getFirstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Nueva contrasena"
      description="Define una nueva contrasena para tu cuenta. Si el enlace vencio, vuelve a solicitar la recuperacion."
    >
      <PasswordResetForm initialNoticeKey={getFirstParam(params.auth) ?? null} />
    </AuthShell>
  );
}
