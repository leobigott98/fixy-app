import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

const supportedOtpTypes: EmailOtpType[] = [
  "signup",
  "magiclink",
  "recovery",
  "invite",
  "email",
  "email_change",
];

function isSupportedOtpType(value: string | null): value is EmailOtpType {
  return Boolean(value && supportedOtpTypes.includes(value as EmailOtpType));
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = requestUrl.searchParams.get("next") || "/app";
  const redirectUrl = new URL(next, request.url);
  const isRecoveryFlow = type === "recovery" || next.includes("/reset-password");
  const fallbackUrl = new URL(isRecoveryFlow ? "/forgot-password" : "/login", request.url);
  let response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (isRecoveryFlow && redirectUrl.pathname === "/reset-password") {
        redirectUrl.searchParams.set("auth", "reset-ready");
        response = NextResponse.redirect(redirectUrl);
      }
      return response;
    }

    fallbackUrl.searchParams.set("auth", isRecoveryFlow ? "recovery-link-expired" : "expired-link");
  }

  if (tokenHash && isSupportedOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      if (isRecoveryFlow && redirectUrl.pathname === "/reset-password") {
        redirectUrl.searchParams.set("auth", "reset-ready");
        response = NextResponse.redirect(redirectUrl);
      }
      return response;
    }

    fallbackUrl.searchParams.set("auth", isRecoveryFlow ? "recovery-link-expired" : "expired-link");
  }

  if (!code && !(tokenHash && isSupportedOtpType(type))) {
    fallbackUrl.searchParams.set("auth", "missing-link");
  }

  return NextResponse.redirect(fallbackUrl);
}
