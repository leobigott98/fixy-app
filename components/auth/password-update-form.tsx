"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { z } from "zod";

import { AuthNotice } from "@/components/auth/auth-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { normalizeAuthMessage, type AuthNotice as AuthNoticeValue } from "@/lib/auth/auth-feedback";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const schema = z
  .object({
    password: z.string().trim().min(8, "Usa una contrasena de al menos 8 caracteres."),
    confirmPassword: z.string().trim().min(8, "Confirma la contrasena."),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Las contrasenas no coinciden.",
        path: ["confirmPassword"],
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export function PasswordUpdateForm() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [notice, setNotice] = useState<AuthNoticeValue | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setNotice({
        tone: "error",
        message: "Tu sesion no esta activa. Entra de nuevo antes de cambiar la contrasena.",
      });
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      setNotice(normalizeAuthMessage(error.message));
      return;
    }

    reset();
    setNotice({
      tone: "success",
      message: "Contrasena actualizada. Ya puedes entrar usando correo y contrasena.",
    });
  });

  return (
    <Card className="bg-white/88">
      <CardContent className="space-y-5 px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">
            <KeyRound className="size-5" />
          </div>
          <div>
            <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
              Acceso con contrasena
            </div>
            <div className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Si entraste con magic link, puedes definir una contrasena aqui sin pedir correo de recuperacion.
            </div>
          </div>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="space-y-2">
            <div className="text-sm font-medium text-[var(--foreground)]">Nueva contrasena</div>
            <Input placeholder="Minimo 8 caracteres" type="password" {...register("password")} />
            {errors.password?.message ? (
              <div className="text-sm text-[#b42318]">{errors.password.message}</div>
            ) : null}
          </label>

          <label className="space-y-2">
            <div className="text-sm font-medium text-[var(--foreground)]">Confirmar contrasena</div>
            <Input placeholder="Repite tu contrasena" type="password" {...register("confirmPassword")} />
            {errors.confirmPassword?.message ? (
              <div className="text-sm text-[#b42318]">{errors.confirmPassword.message}</div>
            ) : null}
          </label>

          {notice ? <AuthNotice message={notice.message} tone={notice.tone} /> : null}

          <Button className="w-full" disabled={isSubmitting} type="submit" variant="primary">
            Guardar contrasena
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
