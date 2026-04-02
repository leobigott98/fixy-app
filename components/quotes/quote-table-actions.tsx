"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { Archive, RotateCcw, SquarePen, Trash2 } from "lucide-react";

import { updateQuoteLifecycleAction } from "@/app/actions/quotes";
import { Button } from "@/components/ui/button";

type QuoteTableActionsProps = {
  quoteId: string;
  editHref: Route;
  detailHref: Route;
  isArchived: boolean;
};

export function QuoteTableActions({
  quoteId,
  editHref,
  detailHref,
  isArchived,
}: QuoteTableActionsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function handleLifecycle(action: "archive" | "restore" | "delete") {
    if (
      action === "delete" &&
      !window.confirm("Este presupuesto dejara de aparecer en Fixy. Continuar?")
    ) {
      return;
    }

    const result = await updateQuoteLifecycleAction(quoteId, action);
    setMessage(result.message);

    if (result.success) {
      startTransition(() => {
        router.refresh();
      });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={detailHref}>Ver</Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link href={editHref}>
          <SquarePen className="size-4" />
          Editar
        </Link>
      </Button>
      {isArchived ? (
        <Button onClick={() => void handleLifecycle("restore")} size="sm" type="button" variant="outline">
          <RotateCcw className="size-4" />
          Reactivar
        </Button>
      ) : (
        <Button onClick={() => void handleLifecycle("archive")} size="sm" type="button" variant="outline">
          <Archive className="size-4" />
          Archivar
        </Button>
      )}
      <Button onClick={() => void handleLifecycle("delete")} size="sm" type="button" variant="ghost">
        <Trash2 className="size-4" />
        Eliminar
      </Button>
      {message ? <div className="w-full text-xs text-[var(--muted)]">{message}</div> : null}
    </div>
  );
}
