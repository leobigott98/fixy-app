"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Boxes, PhoneCall, Truck } from "lucide-react";

import { saveSupplierAction } from "@/app/actions/suppliers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  buildSupplierFormDefaults,
  supplierFormSchema,
  type SupplierFormValues,
} from "@/lib/suppliers/schema";

type SupplierFormProps = {
  mode: "create" | "edit";
  initialValues?: SupplierFormValues;
  supplierId?: string;
};

export function SupplierForm({
  mode,
  initialValues,
  supplierId,
}: SupplierFormProps) {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: initialValues ?? buildSupplierFormDefaults(),
  });

  const supplierName = watch("name");
  const phone = watch("phone");

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveSupplierAction(values, supplierId);

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) {
          setError(field as keyof SupplierFormValues, { message: messages[0] });
        }
      });

      return;
    }

    setFormMessage(result.message);

    startTransition(() => {
      router.push("/app/suppliers" as Route);
      router.refresh();
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="bg-white/88">
        <CardHeader>
          <Badge variant="primary">
            {mode === "create" ? "Nuevo proveedor" : "Editar proveedor"}
          </Badge>
          <CardTitle>
            {mode === "create"
              ? "Base simple para compras del taller"
              : "Actualiza el proveedor sin complicar el flujo"}
          </CardTitle>
          <CardDescription>
            Nombre, telefono y contexto suficiente para conectar inventario, compras y reposicion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nombre"
                error={errors.name?.message}
                input={<Input placeholder="Ej. Repuestos El Motor" {...register("name")} />}
              />
              <Field
                label="Telefono"
                error={errors.phone?.message}
                input={<Input placeholder="Ej. 0414-5551212" {...register("phone")} />}
              />
            </div>

            <Field
              label="Notas"
              error={errors.notes?.message}
              input={
                <Textarea
                  placeholder="Opcional. Horario de entrega, condiciones, marcas que suele manejar."
                  {...register("notes")}
                />
              }
            />

            {formMessage ? (
              <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
                {formMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button disabled={isSubmitting} type="submit" variant="primary">
                {mode === "create" ? "Guardar proveedor" : "Guardar cambios"}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href={"/app/suppliers" as Route}>Volver a proveedores</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Resumen</Badge>
            <CardTitle className="text-white">{supplierName || "Proveedor del taller"}</CardTitle>
            <CardDescription className="text-white/74">
              Este contacto quedara listo para compras basicas y futuras ordenes de reposicion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow label="Telefono" value={phone || "Pendiente"} />
            <SummaryRow label="Compras" value="Listo para vincular" />
            <SummaryRow label="Inventario" value="Base preparada para reposicion" />
          </CardContent>
        </Card>

        <Card className="bg-white/86">
          <CardContent className="space-y-3 px-5 py-5">
            {[
              {
                icon: <Truck className="size-4" />,
                text: "Sirve para sostener compras sin convertir Fixy en un sistema de procurement pesado.",
              },
              {
                icon: <Boxes className="size-4" />,
                text: "Se conecta con inventario y ordenes de compra basicas.",
              },
              {
                icon: <PhoneCall className="size-4" />,
                text: "El telefono queda visible para reposicion y seguimiento rapido.",
              },
            ].map((item) => (
              <div
                key={item.text}
                className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6"
              >
                <div className="text-[var(--primary-strong)]">{item.icon}</div>
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
