"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DocumentPrintButton() {
  return (
    <Button onClick={() => window.print()} type="button" variant="primary">
      <Printer className="size-4" />
      Guardar PDF
    </Button>
  );
}
