"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { approvePublicQuoteAction } from "@/app/actions/public-shares";
import { Button } from "@/components/ui/button";

type PublicQuoteApprovalCardProps = {
  token: string;
  canApprove: boolean;
  approvedAt?: string | null;
};

export function PublicQuoteApprovalCard({
  token,
  canApprove,
  approvedAt,
}: PublicQuoteApprovalCardProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  if (!canApprove) {
    return (
      <div className="rounded-[28px] border border-[rgba(21,128,61,0.16)] bg-[rgba(21,128,61,0.08)] p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 text-[var(--success)]" />
          <div>
            <div className="font-semibold text-[var(--foreground)]">Presupuesto ya actualizado</div>
            <div className="mt-1 text-sm leading-6 text-[var(--muted)]">
              {approvedAt
                ? `Este presupuesto fue aprobado el ${new Date(approvedAt).toLocaleDateString("es-VE")}.`
                : "Este presupuesto ya no admite aprobacion desde esta pagina."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-5">
      <div className="space-y-4">
        <div>
          <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
            Aprobar presupuesto
          </div>
          <div className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Si todo esta correcto, puedes aprobarlo aqui y el taller recibira la confirmacion de inmediato.
          </div>
        </div>

        <Button
          disabled={isPending}
          onClick={async () => {
            setIsPending(true);
            const result = await approvePublicQuoteAction(token);
            setIsPending(false);
            setMessage(result.message);

            if (result.success) {
              startTransition(() => {
                router.refresh();
              });
            }
          }}
          variant="primary"
        >
          <CheckCircle2 className="size-4" />
          Confirmar aprobacion
        </Button>

        {message ? (
          <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
            {message}
          </div>
        ) : null}
      </div>
    </div>
  );
}
