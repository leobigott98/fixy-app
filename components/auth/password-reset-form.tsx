"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

export function PasswordResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [notice, setNotice] = useState<AuthNoticeValue | null>(null);
  const {
    register,
    handleSubmit,
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

    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      setNotice(normalizeAuthMessage(error.message));
      return;
    }

    setNotice({
      tone: "success",
      message: "Contrasena actualizada. Redirigiendo...",
    });
    router.push("/app");
    router.refresh();
  });

  const queryNotice = getAuthNoticeFromQueryKey(searchParams.get("auth"));
  const visibleNotice = notice ?? queryNotice;

  return (
    <Card className="bg-white/88">
      <CardContent className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
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

          {visibleNotice ? <AuthNotice message={visibleNotice.message} tone={visibleNotice.tone} /> : null}

          <Button className="w-full" disabled={isSubmitting} type="submit" variant="primary">
            Guardar nueva contrasena
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
