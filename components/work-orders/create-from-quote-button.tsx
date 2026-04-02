"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { ArrowRightLeft } from "lucide-react";

import { createWorkOrderFromQuoteAction } from "@/app/actions/work-orders";
import { Button } from "@/components/ui/button";

type CreateFromQuoteButtonProps = {
  quoteId: string;
};

export function CreateFromQuoteButton({ quoteId }: CreateFromQuoteButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  return (
    <div className="space-y-3">
      <Button
        disabled={isPending}
        onClick={async () => {
          setIsPending(true);
          const result = await createWorkOrderFromQuoteAction(quoteId);
          setMessage(result.message);
          setIsPending(false);

          if (result.success && result.workOrderId) {
            startTransition(() => {
              router.push(`/app/work-orders/${result.workOrderId}` as Route);
              router.refresh();
            });
          }
        }}
        variant="primary"
      >
        <ArrowRightLeft className="size-4" />
        Crear orden desde aprobado
      </Button>
      {message ? (
        <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
          {message}
        </div>
      ) : null}
    </div>
  );
}
