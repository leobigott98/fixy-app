"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { sessionCookieName } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AuthVariant = "login" | "signup" | "forgot-password";

type AuthFormProps = {
  variant: AuthVariant;
};

const copyByVariant = {
  login: {
    button: "Entrar al taller",
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
    button: "Crear cuenta",
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
    button: "Enviar enlace",
    footer: (
      <Link className="font-semibold text-[var(--primary-strong)]" href="/login">
        Volver al login
      </Link>
    ),
  },
};

export function AuthForm({ variant }: AuthFormProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);

  const schema = z.object({
    email: z.string().email("Ingresa un correo valido."),
    password:
      variant === "forgot-password"
        ? z.string().optional()
        : z.string().min(6, "Ingresa una clave de al menos 6 caracteres."),
    workshopName:
      variant === "signup"
        ? z.string().min(2, "Ingresa el nombre del taller.")
        : z.string().optional(),
    name:
      variant === "signup"
        ? z.string().min(2, "Ingresa tu nombre.")
        : z.string().optional(),
  });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (values) => {
    if (variant === "forgot-password") {
      setFeedback(`Enlace enviado a ${values.email}. En Sprint 1 se conecta con Supabase Auth.`);
      return;
    }

    document.cookie = `${sessionCookieName}=sprint-0; path=/; max-age=2592000; SameSite=Lax`;
    setFeedback("Acceso demo activado. En Sprint 1 esto se reemplaza por Supabase Auth real.");

    startTransition(() => {
      router.push("/app/dashboard");
    });
  });

  return (
    <Card className="bg-white/88">
      <CardContent className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          {variant === "signup" ? (
            <>
              <Field
                label="Nombre del encargado"
                error={errors.name?.message}
                input={<Input placeholder="Ej. Luis Mendoza" {...register("name")} />}
              />
              <Field
                label="Nombre del taller"
                error={errors.workshopName?.message}
                input={<Input placeholder="Ej. Fixy Garage" {...register("workshopName")} />}
              />
            </>
          ) : null}

          <Field
            label="Correo"
            error={errors.email?.message}
            input={<Input placeholder="taller@fixy.app" {...register("email")} />}
          />

          {variant !== "forgot-password" ? (
            <Field
              label="Clave"
              error={errors.password?.message}
              input={<Input type="password" placeholder="******" {...register("password")} />}
            />
          ) : null}

          {variant === "login" ? (
            <div className="flex justify-end">
              <Link
                className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
                href="/forgot-password"
              >
                Olvide mi clave
              </Link>
            </div>
          ) : null}

          {feedback ? (
            <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
              {feedback}
            </div>
          ) : null}

          <Button variant="primary" className="w-full" disabled={isSubmitting} type="submit">
            {copyByVariant[variant].button}
          </Button>
        </form>

        <div className="text-center text-sm text-[var(--muted)]">{copyByVariant[variant].footer}</div>
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
