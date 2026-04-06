import { cn } from "@/lib/utils";
import type { AuthNoticeTone } from "@/lib/auth/auth-feedback";

type AuthNoticeProps = {
  tone: AuthNoticeTone;
  message: string;
  className?: string;
};

const toneClasses: Record<AuthNoticeTone, string> = {
  error: "border-[rgba(180,35,24,0.16)] bg-[rgba(180,35,24,0.08)] text-[#8f231c]",
  success: "border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] text-[var(--secondary)]",
  info: "border-[rgba(29,78,216,0.14)] bg-[rgba(29,78,216,0.07)] text-[#1d4ed8]",
};

export function AuthNotice({ tone, message, className }: AuthNoticeProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm leading-6",
        toneClasses[tone],
        className,
      )}
    >
      {message}
    </div>
  );
}
