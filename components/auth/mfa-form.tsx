"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type MfaFormProps = {
  roleLabel: string;
};

type TOTPEnrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export function MfaForm({ roleLabel }: MfaFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<TOTPEnrollment | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadMfaState() {
      const [{ data: levels }, { data: factorsData, error: factorsError }] = await Promise.all([
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
        supabase.auth.mfa.listFactors(),
      ]);

      if (!isMounted) {
        return;
      }

      if (levels?.currentLevel === "aal2") {
        router.push("/app/dashboard");
        router.refresh();
        return;
      }

      if (factorsError) {
        setMessage(factorsError.message);
        return;
      }

      const verifiedTotpFactor = factorsData.totp.find((factor) => factor.status === "verified");
      setVerifiedFactorId(verifiedTotpFactor?.id ?? null);
    }

    void loadMfaState();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  async function startEnrollment() {
    setIsBusy(true);
    setMessage(null);

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Fixy Admin",
    });

    setIsBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
    setMessage("Escanea el codigo QR en tu app autenticadora y luego ingresa el codigo de 6 digitos.");
  }

  async function verifyCurrentStep() {
    const targetFactorId = verifiedFactorId ?? enrollment?.factorId;

    if (!targetFactorId || !code.trim()) {
      setMessage("Ingresa el codigo de tu app autenticadora.");
      return;
    }

    setIsBusy(true);
    setMessage(null);

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: targetFactorId,
      code: code.trim(),
    });

    setIsBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/app/dashboard");
    router.refresh();
  }

  return (
    <Card className="bg-white/88">
      <CardContent className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
        <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6 text-[var(--muted)]">
          Tu rol actual es <strong>{roleLabel}</strong>. En Fixy, owner y admin deben completar un segundo paso con app autenticadora para abrir el panel.
        </div>

        {verifiedFactorId ? (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--secondary)]" />
              <div className="text-sm leading-6 text-[var(--muted)]">
                Ya tienes 2-step verification configurado. Solo falta validar el codigo actual para entrar.
              </div>
            </div>
            <Input
              inputMode="numeric"
              onChange={(event) => setCode(event.target.value)}
              placeholder="Codigo de 6 digitos"
              value={code}
            />
            <Button className="w-full" disabled={isBusy} onClick={verifyCurrentStep} variant="primary">
              Verificar codigo
            </Button>
          </div>
        ) : enrollment ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
              <img alt="QR de autenticador" className="mx-auto max-h-56 w-full object-contain" src={enrollment.qrCode} />
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6 text-[var(--muted)]">
              Clave manual: <span className="font-semibold text-[var(--foreground)]">{enrollment.secret}</span>
            </div>
            <Input
              inputMode="numeric"
              onChange={(event) => setCode(event.target.value)}
              placeholder="Codigo de 6 digitos"
              value={code}
            />
            <Button className="w-full" disabled={isBusy} onClick={verifyCurrentStep} variant="primary">
              Activar 2-step verification
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
              <Smartphone className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />
              <div className="text-sm leading-6 text-[var(--muted)]">
                Configura una app tipo Google Authenticator, 1Password o Authy para proteger el acceso administrativo.
              </div>
            </div>
            <Button className="w-full" disabled={isBusy} onClick={startEnrollment} variant="primary">
              Configurar autenticador
            </Button>
          </div>
        )}

        {message ? (
          <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
            {message}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
