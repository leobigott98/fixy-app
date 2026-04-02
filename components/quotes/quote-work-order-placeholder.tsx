"use client";

import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export function QuoteWorkOrderPlaceholder() {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Button
        className="w-full sm:w-auto"
        onClick={() => {
          setMessage("Conversion a orden lista como siguiente paso. Este CTA se activa en el sprint de work orders reales.");
        }}
        variant="primary"
      >
        <ArrowRightLeft className="size-4" />
        Convertir a orden
      </Button>
      {message ? (
        <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
          {message}
        </div>
      ) : null}
    </div>
  );
}
