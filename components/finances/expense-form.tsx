"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Receipt } from "lucide-react";

import { createExpenseAction } from "@/app/actions/finances";
import { UploadPicker } from "@/components/uploads/upload-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { expenseCategoryOptions } from "@/lib/finances/constants";
import { expenseFormSchema, type ExpenseFormValues } from "@/lib/finances/schema";
import { formatCurrencyDisplay } from "@/lib/utils";

type ExpenseFormProps = {
  initialValues: ExpenseFormValues;
  options: {
    workOrders: Array<{
      id: string;
      label: string;
    }>;
  };
  preferredCurrency: "USD" | "VES" | "USD_VES";
};

function toAmount(value?: string) {
  const amount = Number(value ?? 0);
  return Number.isNaN(amount) ? 0 : amount;
}

export function ExpenseForm({ initialValues, options, preferredCurrency }: ExpenseFormProps) {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [assetUrls, setAssetUrls] = useState<string[]>(initialValues.assetUrls);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: initialValues,
  });

  const amount = useWatch({ control, name: "amount" });
  const category = useWatch({ control, name: "category" });
  const workOrderId = useWatch({ control, name: "workOrderId" });

  const selectedWorkOrder = useMemo(
    () => options.workOrders.find((workOrder) => workOrder.id === workOrderId) ?? null,
    [options.workOrders, workOrderId],
  );

  const onSubmit = handleSubmit(async (values) => {
    const result = await createExpenseAction({
      ...values,
      assetUrls,
    });

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) {
          setError(field as keyof ExpenseFormValues, { message: messages[0] });
        }
      });

      return;
    }

    setFormMessage(result.message);

    startTransition(() => {
      router.push("/app/finances" as Route);
      router.refresh();
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.04fr_0.96fr]">
      <Card className="bg-white/88">
        <CardHeader>
          <Badge variant="primary">Nuevo gasto</Badge>
          <CardTitle>Registra salidas sin volver pesada la operacion</CardTitle>
          <CardDescription>
            Un registro ligero para ver rapidamente cuanto sale del taller y si esta ligado a una orden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Monto"
                error={errors.amount?.message}
                input={<Input placeholder="0" {...register("amount")} />}
              />
              <Field
                label="Fecha"
                error={errors.date?.message}
                input={<Input type="date" {...register("date")} />}
              />
              <Field
                label="Categoria"
                error={errors.category?.message}
                input={
                  <Select {...register("category")}>
                    {expenseCategoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                }
              />
              <Field
                label="Orden opcional"
                error={errors.workOrderId?.message}
                input={
                  <Select {...register("workOrderId")}>
                    <option value="">Sin orden vinculada</option>
                    {options.workOrders.map((workOrder) => (
                      <option key={workOrder.id} value={workOrder.id}>
                        {workOrder.label}
                      </option>
                    ))}
                  </Select>
                }
              />
            </div>

            <Field
              label="Notas"
              error={errors.notes?.message}
              input={
                <Textarea
                  placeholder="Ej. Compra de repuesto, pago de servicio, herramienta de apoyo."
                  {...register("notes")}
                />
              }
            />

            <UploadPicker
              accept="image/jpeg,image/webp,image/png,application/pdf"
              buttonLabel="Subir soporte"
              canTakePhoto
              cameraLabel="Tomar foto"
              error={errors.assetUrls?.message}
              helper="Opcional. Agrega factura, recibo, captura o evidencia del gasto."
              label="Archivos del gasto"
              maxFiles={8}
              multiple
              onChange={setAssetUrls}
              scope="expense_asset"
              values={assetUrls}
            />

            {formMessage ? (
              <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
                {formMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button disabled={isSubmitting} type="submit" variant="primary">
                Guardar gasto
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/app/finances">Volver a finanzas</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Resumen</Badge>
            <CardTitle className="text-white">Salida clara para el taller</CardTitle>
            <CardDescription className="text-white/74">
              Categoria, monto y orden vinculada visibles para no perder trazabilidad operativa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow
              label="Monto"
              value={formatCurrencyDisplay(toAmount(amount), preferredCurrency)}
            />
            <SummaryRow
              label="Categoria"
              value={expenseCategoryOptions.find((option) => option.value === category)?.label ?? category}
            />
            <SummaryRow label="Orden" value={selectedWorkOrder?.label ?? "Sin orden vinculada"} />
            <SummaryRow label="Soportes" value={String(assetUrls.length)} />
          </CardContent>
        </Card>

        <Card className="bg-white/86">
          <CardContent className="space-y-3 px-5 py-5">
            {[
              "Puedes cargar gastos generales o amarrarlos a una orden especifica.",
              "El overview mensual usa estos gastos para dar una utilidad estimada simple.",
              "La categoria deja el dato legible sin convertirlo en plan contable.",
              "Si tienes factura o foto del gasto, queda adjunta al registro.",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6">
                <div className="text-[var(--primary-strong)]">
                  <Receipt className="size-4" />
                </div>
                <span>{item}</span>
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
