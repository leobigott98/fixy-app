"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, ExternalLink, FileText, Share2 } from "lucide-react";

import {
  ensureQuotePublicShareAction,
  ensureWorkOrderPublicShareAction,
} from "@/app/actions/public-shares";
import { Button } from "@/components/ui/button";

type ClientShareToolsProps = {
  kind: "quote" | "workOrder";
  resourceId: string;
};

export function ClientShareTools({
  kind,
  resourceId,
}: ClientShareToolsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function ensureShare() {
    setIsPending(true);
    const result =
      kind === "quote"
        ? await ensureQuotePublicShareAction(resourceId)
        : await ensureWorkOrderPublicShareAction(resourceId);
    setIsPending(false);

    if (!result.success) {
      setMessage(result.message);
      return null;
    }

    if (!("path" in result) || !("documentPath" in result)) {
      setMessage("No se pudo preparar el link del cliente.");
      return null;
    }

    setMessage(result.message);
    router.refresh();
    return {
      fullPath: `${window.location.origin}${result.path}`,
      fullDocumentPath: `${window.location.origin}${result.documentPath}`,
    };
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          disabled={isPending}
          onClick={async () => {
            const share = await ensureShare();

            if (!share) {
              return;
            }

            if (navigator.share) {
              try {
                await navigator.share({
                  title: kind === "quote" ? "Presupuesto Fixy" : "Estado de orden Fixy",
                  url: share.fullPath,
                });
                setMessage("Link compartido.");
                return;
              } catch {
                // Fallback to clipboard below.
              }
            }

            await navigator.clipboard.writeText(share.fullPath);
            setMessage("Link copiado.");
          }}
          variant="primary"
        >
          <Share2 className="size-4" />
          Compartir con cliente
        </Button>

        <Button
          disabled={isPending}
          onClick={async () => {
            const share = await ensureShare();

            if (!share) {
              return;
            }

            await navigator.clipboard.writeText(share.fullPath);
            setMessage("Link copiado.");
          }}
          variant="outline"
        >
          <Copy className="size-4" />
          Copiar link
        </Button>

        <Button
          disabled={isPending}
          onClick={async () => {
            const share = await ensureShare();

            if (!share) {
              return;
            }

            window.open(share.fullPath, "_blank", "noopener,noreferrer");
          }}
          variant="outline"
        >
          <ExternalLink className="size-4" />
          Abrir vista cliente
        </Button>

        <Button
          disabled={isPending}
          onClick={async () => {
            const share = await ensureShare();

            if (!share) {
              return;
            }

            window.open(share.fullDocumentPath, "_blank", "noopener,noreferrer");
          }}
          variant="outline"
        >
          <FileText className="size-4" />
          PDF cliente
        </Button>
      </div>

      {message ? (
        <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
          {message}
        </div>
      ) : null}
    </div>
  );
}
