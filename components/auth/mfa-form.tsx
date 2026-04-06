"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldCheck, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizeSessionPhone } from "@/lib/auth/session-utils";

type MfaFormProps = {
  roleLabel: string;
  preferredPhone?: string | null;
};

type TOTPEnrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

type VerifiedFactor = {
  id: string;
  friendlyName?: string;
};

type SmsChallenge = {
  factorId: string;
  challengeId: string;
};

type FactorOption = "totp" | "sms";

export function MfaForm({ roleLabel, preferredPhone }: MfaFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [message, setMessage] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [selectedFactor, setSelectedFactor] = useState<FactorOption>("totp");
  const [totpFactor, setTotpFactor] = useState<VerifiedFactor | null>(null);
  const [phoneFactor, setPhoneFactor] = useState<VerifiedFactor | null>(null);
  const [pendingPhoneFactorId, setPendingPhoneFactorId] = useState<string | null>(null);
  const [availablePhone, setAvailablePhone] = useState<string>(normalizeSessionPhone(preferredPhone ?? ""));
  const [enrollment, setEnrollment] = useState<TOTPEnrollment | null>(null);
  const [smsChallenge, setSmsChallenge] = useState<SmsChallenge | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadMfaState() {
      const [{ data: levels }, { data: factorsData, error: factorsError }, { data: userData }] =
        await Promise.all([
          supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
          supabase.auth.mfa.listFactors(),
          supabase.auth.getUser(),
        ]);

      if (!isMounted) {
        return;
      }

      if (levels?.currentLevel === "aal2") {
        router.push("/app");
        router.refresh();
        return;
      }

      if (factorsError) {
        setMessage(factorsError.message);
        return;
      }

      const verifiedTotpFactor = factorsData.totp[0] ?? null;
      const verifiedPhoneFactor = factorsData.phone[0] ?? null;
      const unverifiedPhoneFactor =
        factorsData.all.find(
          (factor) => factor.factor_type === "phone" && factor.status === "unverified",
        ) ?? null;
      const normalizedPhone = normalizeSessionPhone(
        userData.user?.phone ??
          (typeof userData.user?.user_metadata?.contact_phone === "string"
            ? userData.user.user_metadata.contact_phone
            : preferredPhone ?? ""),
      );

      setTotpFactor(
        verifiedTotpFactor
          ? {
              id: verifiedTotpFactor.id,
              friendlyName: verifiedTotpFactor.friendly_name,
            }
          : null,
      );
      setPhoneFactor(
        verifiedPhoneFactor
          ? {
              id: verifiedPhoneFactor.id,
              friendlyName: verifiedPhoneFactor.friendly_name,
            }
          : null,
      );
      setPendingPhoneFactorId(unverifiedPhoneFactor?.id ?? null);
      setAvailablePhone(normalizedPhone);

      if (!verifiedTotpFactor && (verifiedPhoneFactor || unverifiedPhoneFactor || normalizedPhone)) {
        setSelectedFactor("sms");
      }
    }

    void loadMfaState();

    return () => {
      isMounted = false;
    };
  }, [preferredPhone, router, supabase]);

  async function startTotpEnrollment() {
    setIsBusy(true);
    setMessage(null);

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Fixy Authenticator",
    });

    setIsBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSelectedFactor("totp");
    setEnrollment({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
    });
    setMessage("Escanea el QR en tu app autenticadora y luego valida el codigo de 6 digitos.");
  }

  async function verifyTotp() {
    const factorId = totpFactor?.id ?? enrollment?.factorId;

    if (!factorId || !code.trim()) {
      setMessage("Ingresa el codigo de tu app autenticadora.");
      return;
    }

    setIsBusy(true);
    setMessage(null);

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.trim(),
    });

    setIsBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  async function ensurePhoneFactor() {
    if (phoneFactor?.id) {
      return phoneFactor.id;
    }

    if (pendingPhoneFactorId) {
      return pendingPhoneFactorId;
    }

    if (!availablePhone) {
      setMessage("Necesitas un telefono valido en tu cuenta para usar MFA por SMS.");
      return null;
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "phone",
      friendlyName: "Fixy SMS",
      phone: availablePhone,
    });

    if (error) {
      setMessage(error.message);
      return null;
    }

    setPendingPhoneFactorId(data.id);
    return data.id;
  }

  async function sendSmsCode() {
    setIsBusy(true);
    setMessage(null);

    const factorId = await ensurePhoneFactor();

    if (!factorId) {
      setIsBusy(false);
      return;
    }

    const { data, error } = await supabase.auth.mfa.challenge({
      factorId,
      channel: "sms",
    });

    setIsBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSelectedFactor("sms");
    setSmsChallenge({
      factorId,
      challengeId: data.id,
    });
    setMessage(`Te enviamos un codigo SMS a ${availablePhone}.`);
  }

  async function verifySmsCode() {
    if (!smsChallenge || !code.trim()) {
      setMessage("Ingresa el codigo recibido por SMS.");
      return;
    }

    setIsBusy(true);
    setMessage(null);

    const { error } = await supabase.auth.mfa.verify({
      factorId: smsChallenge.factorId,
      challengeId: smsChallenge.challengeId,
      code: code.trim(),
    });

    setIsBusy(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <Card className="bg-white/88">
      <CardContent className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
        <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6 text-[var(--muted)]">
          Tu rol actual es <strong>{roleLabel}</strong>. Antes de abrir el panel administrativo,
          valida un segundo factor por app autenticadora o por SMS.
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className={`rounded-2xl border p-4 text-left transition ${
              selectedFactor === "totp"
                ? "border-[rgba(249,115,22,0.35)] bg-[rgba(249,115,22,0.08)]"
                : "border-[var(--line)] bg-white/70"
            }`}
            onClick={() => setSelectedFactor("totp")}
            type="button"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <ShieldCheck className="size-4" />
              App autenticadora
            </div>
            <div className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Google Authenticator, Authy o 1Password.
            </div>
          </button>

          <button
            className={`rounded-2xl border p-4 text-left transition ${
              selectedFactor === "sms"
                ? "border-[rgba(249,115,22,0.35)] bg-[rgba(249,115,22,0.08)]"
                : "border-[var(--line)] bg-white/70"
            } ${!availablePhone && !phoneFactor && !pendingPhoneFactorId ? "opacity-60" : ""}`}
            onClick={() => setSelectedFactor("sms")}
            type="button"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <Smartphone className="size-4" />
              Codigo SMS
            </div>
            <div className="mt-1 text-sm leading-6 text-[var(--muted)]">
              {availablePhone
                ? `Usaremos ${availablePhone} para enviarte el codigo.`
                : "Necesitas un telefono valido en tu cuenta para esta opcion."}
            </div>
          </button>
        </div>

        {selectedFactor === "totp" ? (
          totpFactor ? (
            <div className="space-y-4">
              <div className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--secondary)]" />
                <div className="text-sm leading-6 text-[var(--muted)]">
                  Ya tienes una app autenticadora conectada. Ingresa el codigo actual para entrar.
                </div>
              </div>
              <Input
                inputMode="numeric"
                onChange={(event) => setCode(event.target.value)}
                placeholder="Codigo de 6 digitos"
                value={code}
              />
              <Button className="w-full" disabled={isBusy} onClick={verifyTotp} variant="primary">
                Verificar codigo
              </Button>
            </div>
          ) : enrollment ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
                <img
                  alt="QR de autenticador"
                  className="mx-auto max-h-56 w-full object-contain"
                  src={enrollment.qrCode}
                />
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6 text-[var(--muted)]">
                Clave manual:{" "}
                <span className="font-semibold text-[var(--foreground)]">{enrollment.secret}</span>
              </div>
              <Input
                inputMode="numeric"
                onChange={(event) => setCode(event.target.value)}
                placeholder="Codigo de 6 digitos"
                value={code}
              />
              <Button className="w-full" disabled={isBusy} onClick={verifyTotp} variant="primary">
                Activar app autenticadora
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                <KeyRound className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />
                <div className="text-sm leading-6 text-[var(--muted)]">
                  Configura una app autenticadora para reducir dependencia de SMS y proteger mejor el
                  acceso administrativo.
                </div>
              </div>
              <Button className="w-full" disabled={isBusy} onClick={startTotpEnrollment} variant="primary">
                Configurar app autenticadora
              </Button>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
              <Smartphone className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />
              <div className="text-sm leading-6 text-[var(--muted)]">
                Valida un codigo por SMS para completar el segundo paso. Esta opcion es util si
                quieres menos friccion al principio.
              </div>
            </div>

            <Button
              className="w-full"
              disabled={isBusy || (!availablePhone && !phoneFactor && !pendingPhoneFactorId)}
              onClick={sendSmsCode}
              variant="secondary"
            >
              Enviar codigo SMS
            </Button>

            <Input
              inputMode="numeric"
              onChange={(event) => setCode(event.target.value)}
              placeholder="Codigo recibido por SMS"
              value={code}
            />

            <Button
              className="w-full"
              disabled={isBusy || !smsChallenge}
              onClick={verifySmsCode}
              variant="primary"
            >
              Verificar codigo SMS
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
