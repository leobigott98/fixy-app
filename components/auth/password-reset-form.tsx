"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
type RecoverySessionStatus = "checking" | "ready" | "missing";

function getHashAuthError() {
  if (typeof window === "undefined" || !window.location.hash) {
    return null;
  }

  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const description = hashParams.get("error_description") ?? hashParams.get("error");

  return description;
}

function getHashSessionTokens() {
  if (typeof window === "undefined" || !window.location.hash) {
    return null;
  }

  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
  };
}

function getRecoveryQuery() {
  if (typeof window === "undefined") {
    return {
      code: null,
      tokenHash: null,
      type: null,
    };
  }

  const searchParams = new URLSearchParams(window.location.search);

  return {
    code: searchParams.get("code"),
    tokenHash: searchParams.get("token_hash"),
    type: searchParams.get("type"),
  };
}

function clearRecoveryUrl() {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.hash = "";
  url.searchParams.delete("code");
  url.searchParams.delete("token_hash");
  url.searchParams.delete("type");

  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}`,
  );
}

export function PasswordResetForm({ initialNoticeKey }: { initialNoticeKey?: string | null }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [notice, setNotice] = useState<AuthNoticeValue | null>(null);
  const [sessionStatus, setSessionStatus] = useState<RecoverySessionStatus>("checking");
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

  useEffect(() => {
    let isMounted = true;

    async function prepareRecoverySession() {
      const hashError = getHashAuthError();

      if (hashError) {
        if (isMounted) {
          setNotice(normalizeAuthMessage(hashError));
          setSessionStatus("missing");
        }
        clearRecoveryUrl();
        return;
      }

      const hashTokens = getHashSessionTokens();
      const recoveryQuery = getRecoveryQuery();

      if (hashTokens) {
        const { error } = await supabase.auth.setSession({
          access_token: hashTokens.accessToken,
          refresh_token: hashTokens.refreshToken,
        });

        clearRecoveryUrl();

        if (error) {
          if (isMounted) {
            setNotice(normalizeAuthMessage(error.message));
            setSessionStatus("missing");
          }
          return;
        }
      } else if (recoveryQuery.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(recoveryQuery.code);

        clearRecoveryUrl();

        if (error) {
          if (isMounted) {
            setNotice(normalizeAuthMessage(error.message));
            setSessionStatus("missing");
          }
          return;
        }
      } else if (recoveryQuery.tokenHash && recoveryQuery.type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: recoveryQuery.tokenHash,
          type: "recovery",
        });

        clearRecoveryUrl();

        if (error) {
          if (isMounted) {
            setNotice(normalizeAuthMessage(error.message));
            setSessionStatus("missing");
          }
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted) {
        setSessionStatus(session ? "ready" : "missing");

        if (!session) {
          setNotice({
            tone: "error",
            message: "El enlace no abrio una sesion valida. Solicita uno nuevo.",
          });
        }
      }
    }

    void prepareRecoverySession();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setSessionStatus("missing");
      setNotice({
        tone: "error",
        message: "Tu sesion de recuperacion no esta activa. Solicita un nuevo enlace antes de cambiar la contrasena.",
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

    setNotice({
      tone: "success",
      message: "Contrasena actualizada. Redirigiendo...",
    });
    router.push("/app");
    router.refresh();
  });

  const queryNotice = getAuthNoticeFromQueryKey(initialNoticeKey ?? null);
  const visibleNotice = notice ?? queryNotice;

  return (
    <Card className="bg-white/88">
      <CardContent className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
        <form className="space-y-4" onSubmit={onSubmit}>
          {sessionStatus === "checking" ? (
            <AuthNotice message="Validando el enlace de recuperacion..." tone="info" />
          ) : null}

          <label className="space-y-2">
            <div className="text-sm font-medium text-[var(--foreground)]">Nueva contrasena</div>
            <Input
              disabled={sessionStatus !== "ready"}
              placeholder="Minimo 8 caracteres"
              type="password"
              {...register("password")}
            />
            {errors.password?.message ? (
              <div className="text-sm text-[#b42318]">{errors.password.message}</div>
            ) : null}
          </label>

          <label className="space-y-2">
            <div className="text-sm font-medium text-[var(--foreground)]">Confirmar contrasena</div>
            <Input
              disabled={sessionStatus !== "ready"}
              placeholder="Repite tu contrasena"
              type="password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword?.message ? (
              <div className="text-sm text-[#b42318]">{errors.confirmPassword.message}</div>
            ) : null}
          </label>

          {visibleNotice ? <AuthNotice message={visibleNotice.message} tone={visibleNotice.tone} /> : null}

          <Button
            className="w-full"
            disabled={isSubmitting || sessionStatus !== "ready"}
            type="submit"
            variant="primary"
          >
            Guardar nueva contrasena
          </Button>
        </form>

        {sessionStatus === "missing" ? (
          <div className="text-center text-sm text-[var(--muted)]">
            <Link className="font-semibold text-[var(--primary-strong)]" href="/forgot-password">
              Solicitar un nuevo enlace
            </Link>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
