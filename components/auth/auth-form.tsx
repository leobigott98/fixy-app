"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BadgeCheck, KeyRound, Link2, Shield, Smartphone } from "lucide-react";
import { z } from "zod";

import { prepareOtpAccessAction } from "@/app/actions/auth-access";
import { AuthNotice } from "@/components/auth/auth-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  getAuthNoticeFromQueryKey,
  normalizeAuthMessage,
  type AuthNotice as AuthNoticeValue,
} from "@/lib/auth/auth-feedback";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  isEmailIdentifier,
  normalizeLoginIdentifier,
  normalizeSessionEmail,
  normalizeSessionPhone,
} from "@/lib/auth/session-utils";

type AuthVariant = "login" | "signup";
type SignupAccountType = "workshop" | "car_owner";
type AuthMethod = "password" | "email_otp" | "sms_otp";
type OtpPhase = "request" | "verify";

type AuthFormProps = {
  variant: AuthVariant;
};

type SignupDraft = {
  accountType: SignupAccountType;
  authMethod: AuthMethod;
  name: string;
  workshopName?: string;
  email: string;
  phone: string;
  password?: string;
};

type FormValues = {
  accountType?: SignupAccountType;
  authMethod: AuthMethod;
  passwordIdentity?: "email" | "phone";
  identifier?: string;
  name?: string;
  workshopName?: string;
  email?: string;
  phone?: string;
  password?: string;
  code?: string;
};

const RESEND_COOLDOWN_SECONDS = 45;

const loginSchema = z.object({
  authMethod: z.enum(["password", "email_otp", "sms_otp"]),
  identifier: z.string().trim().min(4, "Ingresa tu correo o telefono."),
  password: z.string().trim(),
  code: z.string().trim().optional(),
});

const signupSchema = z
  .object({
    accountType: z.enum(["workshop", "car_owner"]),
    authMethod: z.enum(["password", "email_otp", "sms_otp"]),
    passwordIdentity: z.enum(["email", "phone"]),
    name: z.string().trim().min(2, "Ingresa tu nombre."),
    workshopName: z.string().trim(),
    email: z.string().trim().email("Ingresa un correo valido."),
    phone: z
      .string()
      .trim()
      .refine((value) => value.replace(/\D+/g, "").length >= 7, "Ingresa un telefono valido."),
    password: z.string().trim(),
    code: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.accountType === "workshop" && values.workshopName.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresa el nombre del taller.",
        path: ["workshopName"],
      });
    }

    if (values.accountType === "workshop" && values.authMethod === "sms_otp") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Para talleres mantenemos el alta principal por correo.",
        path: ["authMethod"],
      });
    }

    if (values.accountType === "workshop" && values.passwordIdentity === "phone") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Los talleres deben usar correo como acceso principal con contrasena.",
        path: ["passwordIdentity"],
      });
    }

    if (values.authMethod === "password" && values.password.trim().length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Usa una contrasena de al menos 8 caracteres.",
        path: ["password"],
      });
    }
  });

const copyByVariant = {
  login: {
    submitPassword: "Entrar con contrasena",
    submitRequest: "Enviar acceso",
    submitVerify: "Validar y entrar",
    footer: (
      <>
        Aun no tienes cuenta?{" "}
        <Link className="font-semibold text-[var(--primary-strong)]" href="/signup">
          Crear cuenta
        </Link>
      </>
    ),
  },
  signup: {
    submitPassword: "Crear cuenta",
    submitRequest: "Enviar acceso de registro",
    submitVerify: "Verificar y continuar",
    footer: (
      <>
        Ya tienes cuenta?{" "}
        <Link className="font-semibold text-[var(--primary-strong)]" href="/login">
          Iniciar sesion
        </Link>
      </>
    ),
  },
};

function getEmailRedirect(nextDestination: string) {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextDestination)}`;
}

function getSignupNextDestination(
  accountType: SignupAccountType,
  name: string,
  phone: string,
  workshopName?: string,
) {
  const params = new URLSearchParams();

  if (name.trim()) {
    params.set(accountType === "car_owner" ? "fullName" : "ownerName", name.trim());
  }

  if (phone.trim()) {
    params.set("phone", phone.trim());
  }

  if (accountType === "workshop" && workshopName?.trim()) {
    params.set("workshopName", workshopName.trim());
  }

  return `${accountType === "car_owner" ? "/app/owner/onboarding" : "/app/onboarding"}${
    params.toString() ? `?${params.toString()}` : ""
  }`;
}

function getAvailableMethods(variant: AuthVariant, accountType?: SignupAccountType): AuthMethod[] {
  if (variant === "login") {
    return ["password", "email_otp", "sms_otp"];
  }

  if (accountType === "workshop") {
    return ["password", "email_otp"];
  }

  return ["password", "email_otp", "sms_otp"];
}

function getDefaultMethod(variant: AuthVariant, accountType?: SignupAccountType): AuthMethod {
  return getAvailableMethods(variant, accountType)[0] ?? "password";
}

function buildSignupMetadata(signupDraft: SignupDraft) {
  return {
    account_type: signupDraft.accountType,
    full_name: signupDraft.name,
    workshop_name: signupDraft.workshopName,
    contact_email: signupDraft.email,
    contact_phone: signupDraft.phone,
  };
}

export function AuthForm({ variant }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [notice, setNotice] = useState<AuthNoticeValue | null>(null);
  const [ignoreQueryNotice, setIgnoreQueryNotice] = useState(false);
  const [phase, setPhase] = useState<OtpPhase>("request");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [pendingOtpTarget, setPendingOtpTarget] = useState<{
    identifier: string;
    channel: "email" | "sms";
    signupDraft?: SignupDraft;
  } | null>(null);

  const isSignup = variant === "signup";
  const schema = isSignup ? signupSchema : loginSchema;

  const {
    register,
    handleSubmit,
    getValues,
    watch,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: isSignup
      ? {
          accountType: "workshop",
          authMethod: "password",
          passwordIdentity: "email",
          name: "",
          workshopName: "",
          email: "",
          phone: "",
          password: "",
          code: "",
        }
      : {
          authMethod: "password",
          identifier: "",
          password: "",
          code: "",
        },
  });

  const accountType = isSignup ? watch("accountType") : undefined;
  const authMethod = watch("authMethod");
  const passwordIdentity = isSignup ? watch("passwordIdentity") : undefined;
  const availableMethods = getAvailableMethods(variant, accountType);
  const queryNotice = useMemo(
    () => getAuthNoticeFromQueryKey(searchParams.get("auth")),
    [searchParams],
  );
  const visibleNotice = notice ?? (!ignoreQueryNotice ? queryNotice : null);

  useEffect(() => {
    if (!availableMethods.includes(authMethod)) {
      setValue("authMethod", getDefaultMethod(variant, accountType), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    if (variant === "signup" && accountType === "workshop" && passwordIdentity === "phone") {
      setValue("passwordIdentity", "email", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [accountType, authMethod, availableMethods, passwordIdentity, setValue, variant]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  function beginInteraction() {
    setIgnoreQueryNotice(true);
    setNotice(null);
  }

  function showNoticeFromMessage(message: string) {
    setNotice(normalizeAuthMessage(message));
  }

  function startCooldown() {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function requestOtp(identifier: string, channel: "email" | "sms", signupDraft?: SignupDraft) {
    const emailRedirectTo = signupDraft
      ? getEmailRedirect(
          getSignupNextDestination(
            signupDraft.accountType,
            signupDraft.name,
            signupDraft.phone,
            signupDraft.workshopName,
          ),
        )
      : getEmailRedirect("/app");

    if (!signupDraft) {
      const preparation = await prepareOtpAccessAction(identifier);

      if (!preparation.success) {
        showNoticeFromMessage(preparation.message ?? "No se pudo preparar el acceso.");
        return;
      }
    }

    const payload =
      channel === "email"
        ? {
            email: identifier,
            options: {
              shouldCreateUser: Boolean(signupDraft),
              emailRedirectTo,
              data: signupDraft ? buildSignupMetadata(signupDraft) : undefined,
            },
          }
        : {
            phone: identifier,
            options: {
              shouldCreateUser: Boolean(signupDraft),
              data: signupDraft ? buildSignupMetadata(signupDraft) : undefined,
            },
          };

    const { error } = await supabase.auth.signInWithOtp(payload);

    if (error) {
      showNoticeFromMessage(error.message);
      return;
    }

    setPendingOtpTarget({
      identifier,
      channel,
      signupDraft,
    });
    setPhase("verify");
    startCooldown();
    setNotice({
      tone: "success",
      message:
        channel === "email"
          ? `Te enviamos un magic link o codigo a ${identifier}.`
          : `Te enviamos un codigo por SMS a ${identifier}.`,
    });
  }

  async function handlePasswordLogin(values: FormValues) {
    const identifier = normalizeLoginIdentifier(values.identifier ?? "");
    const preparation = await prepareOtpAccessAction(identifier);

    if (!preparation.success) {
      showNoticeFromMessage(preparation.message ?? "No se pudo preparar el acceso.");
      return;
    }

    const payload = isEmailIdentifier(identifier)
      ? { email: identifier, password: values.password ?? "" }
      : { phone: identifier, password: values.password ?? "" };

    const { error } = await supabase.auth.signInWithPassword(payload);

    if (error) {
      showNoticeFromMessage(error.message);
      return;
    }

    startTransition(() => {
      router.push("/app" as Route);
      router.refresh();
    });
  }

  async function handlePasswordSignup(values: FormValues) {
    const signupDraft: SignupDraft = {
      accountType: values.accountType ?? "workshop",
      authMethod: values.authMethod,
      name: values.name?.trim() ?? "",
      workshopName: values.workshopName?.trim() || undefined,
      email: normalizeSessionEmail(values.email ?? ""),
      phone: normalizeSessionPhone(values.phone ?? ""),
      password: values.password?.trim(),
    };
    const nextDestination = getSignupNextDestination(
      signupDraft.accountType,
      signupDraft.name,
      signupDraft.phone,
      signupDraft.workshopName,
    );
    const emailRedirectTo = getEmailRedirect(nextDestination);
    const usePhonePassword =
      signupDraft.accountType === "car_owner" && values.passwordIdentity === "phone";
    const { data, error } = await supabase.auth.signUp(
      usePhonePassword
        ? {
            phone: signupDraft.phone,
            password: signupDraft.password ?? "",
            options: {
              data: buildSignupMetadata(signupDraft),
            },
          }
        : {
            email: signupDraft.email,
            password: signupDraft.password ?? "",
            options: {
              emailRedirectTo,
              data: buildSignupMetadata(signupDraft),
            },
          },
    );

    if (error) {
      showNoticeFromMessage(error.message);
      return;
    }

    if (data.session) {
      startTransition(() => {
        router.push(nextDestination as Route);
        router.refresh();
      });
      return;
    }

    if (usePhonePassword) {
      setPendingOtpTarget({
        identifier: signupDraft.phone,
        channel: "sms",
        signupDraft,
      });
      setPhase("verify");
      startCooldown();
      setNotice({
        tone: "success",
        message: "Cuenta creada. Ingresa el codigo SMS que recibiste para terminar de entrar.",
      });
      return;
    }

    setNotice({
      tone: "success",
      message: "Cuenta creada. Revisa tu correo y abre el enlace mas reciente para continuar.",
    });
  }

  async function verifyOtpCode(values: FormValues) {
    const token = values.code?.trim() ?? "";

    if (!token || !pendingOtpTarget) {
      setError("code", { message: "Ingresa el codigo." });
      return;
    }

    const { error } = await supabase.auth.verifyOtp(
      pendingOtpTarget.channel === "email"
        ? {
            email: pendingOtpTarget.identifier,
            token,
            type: "email",
          }
        : {
            phone: pendingOtpTarget.identifier,
            token,
            type: "sms",
          },
    );

    if (error) {
      showNoticeFromMessage(error.message);
      return;
    }

    setNotice({
      tone: "success",
      message: "Codigo validado. Entrando a Fixy...",
    });

    const nextDestination = pendingOtpTarget.signupDraft
      ? getSignupNextDestination(
          pendingOtpTarget.signupDraft.accountType,
          pendingOtpTarget.signupDraft.name,
          pendingOtpTarget.signupDraft.phone,
          pendingOtpTarget.signupDraft.workshopName,
        )
      : "/app";

    startTransition(() => {
      router.push(nextDestination as Route);
      router.refresh();
    });
  }

  const onSubmit = handleSubmit(async (rawValues) => {
    const values = rawValues as FormValues;
    beginInteraction();

    if (phase === "verify") {
      await verifyOtpCode(values);
      return;
    }

    if (!isSignup) {
      if (values.authMethod === "password") {
        await handlePasswordLogin(values);
        return;
      }

      const identifier =
        values.authMethod === "email_otp"
          ? normalizeSessionEmail(values.identifier ?? "")
          : normalizeSessionPhone(values.identifier ?? "");
      await requestOtp(identifier, values.authMethod === "email_otp" ? "email" : "sms");
      return;
    }

    const signupDraft: SignupDraft = {
      accountType: values.accountType ?? "workshop",
      authMethod: values.authMethod,
      name: values.name?.trim() ?? "",
      workshopName: values.workshopName?.trim() || undefined,
      email: normalizeSessionEmail(values.email ?? ""),
      phone: normalizeSessionPhone(values.phone ?? ""),
      password: values.password?.trim(),
    };

    if (values.authMethod === "password") {
      await handlePasswordSignup(values);
      return;
    }

    const otpIdentifier = values.authMethod === "email_otp" ? signupDraft.email : signupDraft.phone;

    await requestOtp(
      otpIdentifier,
      values.authMethod === "email_otp" ? "email" : "sms",
      signupDraft,
    );
  });

  const footer = phase === "verify" && pendingOtpTarget ? (
    <div className="flex items-center justify-center gap-3">
      <button
        className="font-semibold text-[var(--primary-strong)] disabled:text-[var(--muted)]"
        disabled={resendCooldown > 0}
        onClick={async () => {
          beginInteraction();
          const values = getValues();

          if (!isSignup) {
            const identifier =
              authMethod === "email_otp"
                ? normalizeSessionEmail(values.identifier ?? "")
                : normalizeSessionPhone(values.identifier ?? "");
            await requestOtp(identifier, authMethod === "email_otp" ? "email" : "sms");
            return;
          }

          const signupDraft: SignupDraft = {
            accountType: values.accountType ?? "workshop",
            authMethod: values.authMethod,
            name: values.name?.trim() ?? "",
            workshopName: values.workshopName?.trim() || undefined,
            email: normalizeSessionEmail(values.email ?? ""),
            phone: normalizeSessionPhone(values.phone ?? ""),
            password: values.password?.trim(),
          };

          await requestOtp(
            values.authMethod === "email_otp" ? signupDraft.email : signupDraft.phone,
            values.authMethod === "email_otp" ? "email" : "sms",
            signupDraft,
          );
        }}
        type="button"
      >
        {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : "Reenviar acceso"}
      </button>
      <span className="text-[var(--line)]">|</span>
      <button
        className="font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
        onClick={() => {
          setPhase("request");
          setPendingOtpTarget(null);
          setValue("code", "");
          setNotice(null);
        }}
        type="button"
      >
        Cambiar acceso
      </button>
    </div>
  ) : (
    copyByVariant[variant].footer
  );

  return (
    <Card className="bg-white/88">
      <CardContent className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] px-4 py-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              {phase === "request" ? "Paso 1" : "Paso 2"}
            </div>
            <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">
              {phase === "request" ? "Elige como quieres entrar" : "Confirma el acceso"}
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[var(--secondary)]">
            <BadgeCheck className="size-3.5" />
            {isSignup ? "Alta guiada" : "Acceso seguro"}
          </div>
        </div>

        {visibleNotice ? <AuthNotice message={visibleNotice.message} tone={visibleNotice.tone} /> : null}

        {phase === "verify" && pendingOtpTarget ? (
          <div className="rounded-2xl border border-[rgba(29,78,216,0.14)] bg-[rgba(29,78,216,0.06)] px-4 py-3 text-sm leading-6 text-[#1d4ed8]">
            {pendingOtpTarget.channel === "email"
              ? `Enviamos el acceso a ${pendingOtpTarget.identifier}. Si abriste el magic link, no hace falta escribir codigo.`
              : `Enviamos un codigo por SMS a ${pendingOtpTarget.identifier}.`}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={onSubmit}>
          {isSignup ? (
            <Field
              label="Tipo de cuenta"
              error={errors.accountType?.message}
              input={
                <>
                  <Select {...register("accountType")}>
                    <option value="workshop">Taller</option>
                    <option value="car_owner">Propietario de carro</option>
                  </Select>
                  <div className="text-xs leading-5 text-[var(--muted)]">
                    {accountType === "car_owner"
                      ? "Tendras garage, citas, historial y seguimiento de servicios."
                      : "Mantendras onboarding de taller, equipo y operaciones."}
                  </div>
                </>
              }
            />
          ) : null}

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-[var(--foreground)]">Metodo de acceso</div>
              <div className="text-xs text-[var(--muted)]">Puedes cambiarlo luego</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {availableMethods.map((method) => (
                <button
                  key={method}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    authMethod === method
                      ? "border-[rgba(249,115,22,0.35)] bg-[rgba(249,115,22,0.08)]"
                      : "border-[var(--line)] bg-white/70"
                  }`}
                  onClick={() => {
                    beginInteraction();
                    setValue("authMethod", method, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 font-semibold">
                      {method === "password" ? (
                        <KeyRound className="size-4" />
                      ) : method === "email_otp" ? (
                        <Link2 className="size-4" />
                      ) : (
                        <Smartphone className="size-4" />
                      )}
                      {method === "password"
                        ? "Contrasena"
                        : method === "email_otp"
                          ? "Magic link o codigo"
                          : "Codigo SMS"}
                    </div>
                    {(variant === "login" && method === "password") ||
                    (variant === "signup" && accountType === "car_owner" && method === "email_otp") ||
                    (variant === "signup" && accountType === "workshop" && method === "password") ? (
                      <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--secondary)]">
                        {variant === "login"
                          ? "Directo"
                          : accountType === "car_owner"
                            ? "Simple"
                            : "Recomendado"}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    {method === "password"
                      ? "Acceso clasico y rapido."
                      : method === "email_otp"
                        ? "Correo sin clave."
                        : "Telefono con OTP."}
                  </div>
                </button>
              ))}
            </div>
            {errors.authMethod?.message ? (
              <div className="text-sm text-[#b42318]">{errors.authMethod.message}</div>
            ) : null}
          </div>

          {isSignup ? (
            <>
              <Field
                label={accountType === "car_owner" ? "Nombre completo" : "Nombre del encargado"}
                error={errors.name?.message}
                input={
                  <Input
                    disabled={phase === "verify"}
                    placeholder={accountType === "car_owner" ? "Ej. Andrea Perez" : "Ej. Luis Mendoza"}
                    {...register("name")}
                  />
                }
              />
              {accountType === "workshop" ? (
                <Field
                  label="Nombre del taller"
                  error={errors.workshopName?.message}
                  input={
                    <Input
                      disabled={phase === "verify"}
                      placeholder="Ej. Fixy Garage"
                      {...register("workshopName")}
                    />
                  }
                />
              ) : null}
              <Field
                label="Correo"
                error={errors.email?.message}
                input={
                  <Input
                    disabled={phase === "verify"}
                    placeholder="nombre@correo.com"
                    {...register("email")}
                  />
                }
              />
              <Field
                label="Telefono"
                error={errors.phone?.message}
                input={
                  <Input
                    disabled={phase === "verify"}
                    placeholder="Ej. 0414-1234567"
                    {...register("phone")}
                  />
                }
              />
              {authMethod === "password" ? (
                <Field
                  label="Usar contrasena con"
                  error={errors.passwordIdentity?.message}
                  input={
                    <Select
                      disabled={phase === "verify" || accountType === "workshop"}
                      {...register("passwordIdentity")}
                    >
                      <option value="email">Correo</option>
                      <option value="phone">Telefono</option>
                    </Select>
                  }
                />
              ) : null}
            </>
          ) : (
            <Field
              label={authMethod === "sms_otp" ? "Telefono" : "Correo o telefono"}
              error={errors.identifier?.message}
              input={
                <Input
                  disabled={phase === "verify"}
                  placeholder={authMethod === "sms_otp" ? "0414-1234567" : "taller@fixy.app o 0414-1234567"}
                  {...register("identifier")}
                />
              }
            />
          )}

          {authMethod === "password" ? (
            <Field
              label="Contrasena"
              error={errors.password?.message}
              input={
                <Input
                  disabled={phase === "verify"}
                  placeholder="Minimo 8 caracteres"
                  type="password"
                  {...register("password")}
                />
              }
            />
          ) : null}

          {phase === "verify" ? (
            <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm leading-6 text-[var(--muted)]">
                  Si abriste el enlace desde tu correo, Fixy deberia continuar automaticamente. Si recibiste codigo, escribelo aqui.
                </div>
                <button
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                  onClick={() => {
                    setPhase("request");
                    setPendingOtpTarget(null);
                    setValue("code", "");
                    setNotice(null);
                  }}
                  type="button"
                >
                  <ArrowLeft className="size-4" />
                  Cambiar
                </button>
              </div>

              <Field
                label={pendingOtpTarget?.channel === "email" ? "Codigo opcional" : "Codigo"}
                error={errors.code?.message}
                input={
                  <Input
                    inputMode="numeric"
                    placeholder={
                      pendingOtpTarget?.channel === "email"
                        ? "Solo si recibiste un codigo"
                        : "123456"
                    }
                    {...register("code")}
                  />
                }
              />
            </div>
          ) : null}

          {!isSignup && authMethod === "password" && phase === "request" ? (
            <div className="flex justify-end">
              <Link
                className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                href="/forgot-password"
              >
                Recuperar contrasena
              </Link>
            </div>
          ) : null}

          <Button className="w-full" disabled={isSubmitting} type="submit" variant="primary">
            {phase === "verify"
              ? copyByVariant[variant].submitVerify
              : authMethod === "password"
                ? copyByVariant[variant].submitPassword
                : copyByVariant[variant].submitRequest}
          </Button>
        </form>

        {!isSignup ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
            <div className="flex items-center gap-2 font-semibold text-[var(--foreground)]">
              <Shield className="size-4 text-[var(--secondary)]" />
              Acceso pensado para no perder tiempo
            </div>
            <div className="mt-1">
              Puedes entrar con contrasena, correo sin clave o SMS. Si usas magic link, abre siempre el correo mas reciente y evita pedir varios seguidos.
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
            <div className="flex items-center gap-2 font-semibold text-[var(--foreground)]">
              <Shield className="size-4 text-[var(--secondary)]" />
              Registro con menos friccion
            </div>
            <div className="mt-1">
              Si eres propietario, el magic link suele ser la opcion mas simple. Si administras un taller, la contrasena por correo suele ser la mas estable.
            </div>
          </div>
        )}

        <div className="text-center text-sm text-[var(--muted)]">{footer}</div>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  error,
  input,
}: {
  label: string;
  error?: string;
  input: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <div className="text-sm font-medium text-[var(--foreground)]">{label}</div>
      {input}
      {error ? <div className="text-sm text-[#b42318]">{error}</div> : null}
    </label>
  );
}
