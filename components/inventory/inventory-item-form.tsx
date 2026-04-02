"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Boxes, Package, TriangleAlert } from "lucide-react";

import { saveInventoryItemAction } from "@/app/actions/inventory";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  inventoryItemSchema,
  type InventoryItemFormValues,
} from "@/lib/inventory/schema";
import { formatCurrencyDisplay } from "@/lib/utils";

type InventoryItemFormProps = {
  initialValues: InventoryItemFormValues;
  preferredCurrency: "USD" | "VES" | "USD_VES";
  mode: "create" | "edit";
  itemId?: string;
};

export function InventoryItemForm({
  initialValues,
  preferredCurrency,
  mode,
  itemId,
}: InventoryItemFormProps) {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: initialValues,
  });

  const stockQuantity = Number(watch("stockQuantity") || 0);
  const lowStockThreshold = Number(watch("lowStockThreshold") || 0);
  const cost = Number(watch("cost") || 0);
  const referenceSalePrice = Number(watch("referenceSalePrice") || 0);

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveInventoryItemAction(values, itemId);

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) {
          setError(field as keyof InventoryItemFormValues, { message: messages[0] });
        }
      });

      return;
    }

    setFormMessage(result.message);

    startTransition(() => {
      router.push("/app/inventory" as Route);
      router.refresh();
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="bg-white/88">
        <CardHeader>
          <Badge variant="primary">{mode === "create" ? "Nuevo repuesto" : "Editar repuesto"}</Badge>
          <CardTitle>
            {mode === "create" ? "Inventario simple y util" : "Actualiza el repuesto sin perder contexto"}
          </CardTitle>
          <CardDescription>
            Stock, costo y precio de referencia claros para conectar inventario con presupuestos y ordenes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nombre"
                error={errors.name?.message}
                input={<Input placeholder="Ej. Filtro de aceite" {...register("name")} />}
              />
              <Field
                label="SKU"
                error={errors.sku?.message}
                input={<Input placeholder="Opcional" {...register("sku")} />}
              />
              <Field
                label="Stock actual"
                error={errors.stockQuantity?.message}
                input={<Input placeholder="0" {...register("stockQuantity")} />}
              />
              <Field
                label="Minimo"
                error={errors.lowStockThreshold?.message}
                input={<Input placeholder="0" {...register("lowStockThreshold")} />}
              />
              <Field
                label="Costo"
                error={errors.cost?.message}
                input={<Input placeholder="0" {...register("cost")} />}
              />
              <Field
                label="Precio referencia"
                error={errors.referenceSalePrice?.message}
                input={<Input placeholder="0" {...register("referenceSalePrice")} />}
              />
            </div>

            <Field
              label="Descripcion"
              error={errors.description?.message}
              input={<Textarea placeholder="Opcional. Marca, compatibilidad o detalle util." {...register("description")} />}
            />

            <Field
              label="Notas"
              error={errors.notes?.message}
              input={<Textarea placeholder="Opcional. Observaciones internas del taller." {...register("notes")} />}
            />

            {formMessage ? (
              <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
                {formMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button disabled={isSubmitting} type="submit" variant="primary">
                {mode === "create" ? "Guardar repuesto" : "Guardar cambios"}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/app/inventory">Volver a inventario</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Resumen</Badge>
            <CardTitle className="text-white">Visibilidad rapida de este repuesto</CardTitle>
            <CardDescription className="text-white/74">
              Suficiente para cotizar mejor y evitar perder piezas sin armar un sistema pesado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow label="Stock actual" value={String(stockQuantity)} />
            <SummaryRow label="Alerta" value={stockQuantity <= lowStockThreshold ? "Bajo minimo" : "En rango"} />
            <SummaryRow label="Costo" value={formatCurrencyDisplay(cost, preferredCurrency)} />
            <SummaryRow label="Precio ref." value={formatCurrencyDisplay(referenceSalePrice, preferredCurrency)} />
          </CardContent>
        </Card>

        <Card className="bg-white/86">
          <CardContent className="space-y-3 px-5 py-5">
            {[
              {
                icon: <Package className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />,
                text: "Este repuesto puede seleccionarse directo en presupuestos y ordenes.",
              },
              {
                icon: <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />,
                text: "La alerta de bajo stock se activa cuando el stock llega al minimo o menos.",
              },
              {
                icon: <Boxes className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />,
                text: "Al completar una orden, el stock se ajusta segun los repuestos vinculados.",
              },
            ].map((item) => (
              <div key={item.text} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6">
                {item.icon}
                <span>{item.text}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  input,
}: {
  label: string;
  error?: string;
  input: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <div className="text-sm font-medium text-[var(--foreground)]">{label}</div>
      {input}
      {error ? <div className="text-sm text-[#b42318]">{error}</div> : null}
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/8 p-4">
      <div className="text-sm text-white/72">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
