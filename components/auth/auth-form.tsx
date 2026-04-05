"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { prepareOtpAccessAction } from "@/app/actions/auth-access";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isEmailIdentifier, normalizeLoginIdentifier } from "@/lib/auth/session-utils";

type AuthVariant = "login" | "signup" | "forgot-password";

type AuthFormProps = {
  variant: AuthVariant;
};

type OtpPhase = "request" | "verify";
type SignupAccountType = "workshop" | "car_owner";

const copyByVariant = {
  login: {
    requestButton: "Enviar codigo",
    verifyButton: "Entrar al taller",
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
    requestButton: "Enviar codigo de registro",
    verifyButton: "Verificar y continuar",
    footer: (
      <>
        Ya tienes cuenta?{" "}
        <Link className="font-semibold text-[var(--primary-strong)]" href="/login">
          Iniciar sesion
        </Link>
      </>
    ),
  },
  "forgot-password": {
    requestButton: "Recibir codigo",
    verifyButton: "Verificar codigo",
    footer: (
      <Link className="font-semibold text-[var(--primary-strong)]" href="/login">
        Volver al login
      </Link>
    ),
  },
};

export function AuthForm({ variant }: AuthFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [phase, setPhase] = useState<OtpPhase>("request");
  const [pendingIdentifier, setPendingIdentifier] = useState<string>("");
  const [signupDraft, setSignupDraft] = useState<{
    accountType?: SignupAccountType;
    name?: string;
    workshopName?: string;
    phone?: string;
  }>({});

  const schema = z
    .object({
      accountType:
        variant === "signup"
          ? z.enum(["workshop", "car_owner"])
          : z.enum(["workshop", "car_owner"]).optional(),
      identifier:
        variant === "signup"
          ? z.string().email("Ingresa un correo valido.")
          : z.string().trim().min(4, "Ingresa tu correo o telefono."),
      workshopName:
        variant === "signup" ? z.string().trim() : z.string().optional(),
      name:
        variant === "signup"
          ? z.string().trim().min(2, "Ingresa tu nombre.")
          : z.string().optional(),
      phone:
        variant === "signup"
          ? z
              .string()
              .trim()
              .refine(
                (value) => value.replace(/\D+/g, "").length >= 7,
                "Ingresa un telefono valido.",
              )
          : z.string().optional(),
      code: z.string().trim().optional(),
    })
    .superRefine((values, ctx) => {
      if (variant !== "signup") {
        return;
      }

      if (
        values.accountType === "workshop" &&
        (!values.workshopName || values.workshopName.trim().length < 2)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Ingresa el nombre del taller.",
          path: ["workshopName"],
        });
      }
    });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    getValues,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      accountType: "workshop",
      identifier: "",
      workshopName: "",
      name: "",
      phone: "",
      code: "",
    },
  });
  const signupAccountType = watch("accountType");

  async function requestCode(values: FormValues) {
    const identifier = normalizeLoginIdentifier(values.identifier);
    const isEmail = isEmailIdentifier(identifier);
    const accountType = (values.accountType ?? "workshop") as SignupAccountType;
    const signupParams = new URLSearchParams();

    if (variant === "signup" && values.name?.trim()) {
      signupParams.set(accountType === "car_owner" ? "fullName" : "ownerName", values.name.trim());
    }

    if (variant === "signup" && accountType === "workshop" && values.workshopName?.trim()) {
      signupParams.set("workshopName", values.workshopName.trim());
    }

    if (variant === "signup" && values.phone?.trim()) {
      signupParams.set("phone", values.phone.trim());
    }

    const nextDestination =
      variant === "signup"
        ? `${accountType === "car_owner" ? "/app/owner/onboarding" : "/app/onboarding"}${
            signupParams.toString() ? `?${signupParams.toString()}` : ""
          }`
        : "/app";
    const emailRedirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            nextDestination,
          )}`
        : undefined;

    if (variant !== "signup") {
      const preparation = await prepareOtpAccessAction(identifier);

      if (!preparation.success) {
        setFeedback(preparation.message ?? "No se pudo preparar el acceso.");
        return;
      }
    }

    const { error } = await supabase.auth.signInWithOtp(
      isEmail
        ? {
            email: identifier,
            options: {
              shouldCreateUser: variant === "signup",
              emailRedirectTo,
              data:
                variant === "signup"
                  ? {
                      full_name: values.name?.trim(),
                      workshop_name:
                        accountType === "workshop" ? values.workshopName?.trim() : undefined,
                      phone: values.phone?.trim(),
                      account_type: accountType,
                    }
                  : undefined,
            },
          }
        : {
            phone: identifier,
            options: {
              shouldCreateUser: false,
            },
          },
    );

    if (error) {
      setFeedback(error.message);
      return;
    }

    setPendingIdentifier(identifier);
    setSignupDraft({
      accountType,
      name: values.name?.trim(),
      workshopName: values.workshopName?.trim(),
      phone: values.phone?.trim(),
    });
    setPhase("verify");
    setFeedback(
      isEmail
        ? `Te enviamos un enlace o codigo a ${values.identifier}. Si usas el enlace, Fixy te llevara directo al acceso.`
        : `Te enviamos un codigo por SMS a ${values.identifier}.`,
    );
  }

  async function verifyCode(values: FormValues) {
    const token = values.code?.trim() ?? "";

    if (!token) {
      setError("code", { message: "Ingresa el codigo." });
      return;
    }

    const isEmail = isEmailIdentifier(pendingIdentifier);
    const { error } = await supabase.auth.verifyOtp(
      isEmail
        ? {
            email: pendingIdentifier,
            token,
            type: "email",
          }
        : {
            phone: pendingIdentifier,
            token,
            type: "sms",
          },
    );

    if (error) {
      setFeedback(error.message);
      return;
    }

    setFeedback("Codigo validado. Entrando a Fixy...");

    startTransition(() => {
      if (variant === "signup") {
        const params = new URLSearchParams();

        if (signupDraft.name) {
          params.set(
            signupDraft.accountType === "car_owner" ? "fullName" : "ownerName",
            signupDraft.name,
          );
        }

        if (signupDraft.workshopName) {
          params.set("workshopName", signupDraft.workshopName);
        }

        if (signupDraft.phone) {
          params.set("phone", signupDraft.phone);
        }

        router.push(
          `${
            signupDraft.accountType === "car_owner" ? "/app/owner/onboarding" : "/app/onboarding"
          }?${params.toString()}` as Route,
        );
      } else {
        router.push("/app" as Route);
      }

      router.refresh();
    });
  }

  const onSubmit = handleSubmit(async (values) => {
    setFeedback(null);

    if (phase === "request") {
      await requestCode(values);
      return;
    }

    await verifyCode(values);
  });

  const footer = phase === "verify" ? (
    <button
      className="font-semibold text-[var(--primary-strong)]"
      onClick={async () => {
        await requestCode(getValues());
      }}
      type="button"
    >
      Reenviar codigo
    </button>
  ) : (
    copyByVariant[variant].footer
  );

  return (
    <Card className="bg-white/88">
      <CardContent className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          {variant === "signup" ? (
            <>
              <Field
                label="Tipo de cuenta"
                error={errors.accountType?.message}
                input={
                  <Select {...register("accountType")}>
                    <option value="workshop">Taller</option>
                    <option value="car_owner">Propietario de carro</option>
                  </Select>
                }
              />
              <Field
                label={signupAccountType === "car_owner" ? "Nombre completo" : "Nombre del encargado"}
                error={errors.name?.message}
                input={
                  <Input
                    placeholder={
                      signupAccountType === "car_owner" ? "Ej. Andrea Perez" : "Ej. Luis Mendoza"
                    }
                    {...register("name")}
                  />
                }
              />
              {signupAccountType === "workshop" ? (
                <Field
                  label="Nombre del taller"
                  error={errors.workshopName?.message}
                  input={<Input placeholder="Ej. Fixy Garage" {...register("workshopName")} />}
                />
              ) : null}
              <Field
                label="Telefono"
                error={errors.phone?.message}
                input={<Input placeholder="Ej. 0414-1234567" {...register("phone")} />}
              />
            </>
          ) : null}

          <Field
            label={variant === "signup" ? "Correo" : "Correo o telefono"}
            error={errors.identifier?.message}
            input={
              <Input
                disabled={phase === "verify"}
                placeholder={
                  variant === "signup" ? "nombre@correo.com" : "taller@fixy.app o 04141234567"
                }
                {...register("identifier")}
              />
            }
          />

          {phase === "verify" ? (
            <Field
              label={isEmailIdentifier(pendingIdentifier) ? "Codigo opcional" : "Codigo"}
              error={errors.code?.message}
              input={
                <Input
                  inputMode="numeric"
                  placeholder={isEmailIdentifier(pendingIdentifier) ? "Si recibiste codigo, escríbelo aquí" : "123456"}
                  {...register("code")}
                />
              }
            />
          ) : null}

          {variant === "login" && phase === "request" ? (
            <div className="flex justify-end">
              <Link
                className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                href="/forgot-password"
              >
                Reenviar codigo de acceso
              </Link>
            </div>
          ) : null}

          {feedback ? (
            <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
              {feedback}
            </div>
          ) : null}

          <Button variant="primary" className="w-full" disabled={isSubmitting} type="submit">
            {phase === "request"
              ? copyByVariant[variant].requestButton
              : copyByVariant[variant].verifyButton}
          </Button>
        </form>

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
