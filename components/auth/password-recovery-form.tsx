"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { AuthNotice } from "@/components/auth/auth-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getAuthNoticeFromQueryKey,
  normalizeAuthMessage,
  type AuthNotice as AuthNoticeValue,
} from "@/lib/auth/auth-feedback";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizeSessionEmail } from "@/lib/auth/session-utils";

const schema = z.object({
  email: z.string().trim().email("Ingresa un correo valido."),
});

type FormValues = z.infer<typeof schema>;

function getRecoveryRedirect() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
}

export function PasswordRecoveryForm({ initialNoticeKey }: { initialNoticeKey?: string | null }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [notice, setNotice] = useState<AuthNoticeValue | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);

    const { error } = await supabase.auth.resetPasswordForEmail(
      normalizeSessionEmail(values.email),
      {
        redirectTo: getRecoveryRedirect(),
      },
    );

    if (error) {
      setNotice(normalizeAuthMessage(error.message));
      return;
    }

    setNotice({
      tone: "success",
      message: "Te enviamos un correo para cambiar tu contrasena.",
    });
  });

  const queryNotice = getAuthNoticeFromQueryKey(initialNoticeKey ?? null);
  const visibleNotice = notice ?? queryNotice;

  return (
    <Card className="bg-white/88">
      <CardContent className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="space-y-2">
            <div className="text-sm font-medium text-[var(--foreground)]">Correo</div>
            <Input placeholder="nombre@correo.com" {...register("email")} />
            {errors.email?.message ? (
              <div className="text-sm text-[#b42318]">{errors.email.message}</div>
            ) : null}
          </label>

          {visibleNotice ? <AuthNotice message={visibleNotice.message} tone={visibleNotice.tone} /> : null}

          <Button className="w-full" disabled={isSubmitting} type="submit" variant="primary">
            Enviar correo de recuperacion
          </Button>
        </form>

        <div className="rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
          <div className="font-semibold text-[var(--foreground)]">Tip rapido</div>
          <div className="mt-1">
          Si tu acceso principal es por telefono, vuelve a{" "}
          <Link className="font-semibold text-[var(--primary-strong)]" href="/login">
            iniciar sesion
          </Link>{" "}
          y usa el metodo por SMS.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
