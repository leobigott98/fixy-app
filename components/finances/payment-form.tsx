"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Wallet } from "lucide-react";

import { recordPaymentAction } from "@/app/actions/finances";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { paymentMethodOptions, paymentStatusOptions } from "@/lib/finances/constants";
import { paymentFormSchema, type PaymentFormValues } from "@/lib/finances/schema";
import { formatCurrencyDisplay } from "@/lib/utils";

type PaymentFormProps = {
  initialValues: PaymentFormValues;
  options: {
    clients: Array<{ id: string; fullName: string }>;
    workOrders: Array<{
      id: string;
      clientId: string | null;
      label: string;
      pendingBalance: number;
      totalAmount: number;
    }>;
  };
  preferredCurrency: "USD" | "VES" | "USD_VES";
};

function toAmount(value?: string) {
  const amount = Number(value ?? 0);
  return Number.isNaN(amount) ? 0 : amount;
}

export function PaymentForm({ initialValues, options, preferredCurrency }: PaymentFormProps) {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: initialValues,
  });

  const clientId = useWatch({ control, name: "clientId" });
  const workOrderId = useWatch({ control, name: "workOrderId" });
  const amountValue = useWatch({ control, name: "amount" });
  const status = useWatch({ control, name: "status" });
  const method = useWatch({ control, name: "method" });

  const workOrderOptions = useMemo(
    () => options.workOrders.filter((workOrder) => !clientId || workOrder.clientId === clientId),
    [clientId, options.workOrders],
  );

  const selectedWorkOrder = useMemo(
    () => options.workOrders.find((workOrder) => workOrder.id === workOrderId) ?? null,
    [options.workOrders, workOrderId],
  );

  useEffect(() => {
    if (selectedWorkOrder?.clientId && selectedWorkOrder.clientId !== clientId) {
      setValue("clientId", selectedWorkOrder.clientId);
    }
  }, [clientId, selectedWorkOrder, setValue]);

  useEffect(() => {
    if (!workOrderId) {
      return;
    }

    if (!workOrderOptions.some((workOrder) => workOrder.id === workOrderId)) {
      setValue("workOrderId", "");
    }
  }, [workOrderId, workOrderOptions, setValue]);

  const remainingAfterPayment = Math.max(
    Number(((selectedWorkOrder?.pendingBalance ?? 0) - toAmount(amountValue)).toFixed(2)),
    0,
  );

  const onSubmit = handleSubmit(async (values) => {
    const result = await recordPaymentAction(values);

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) {
          setError(field as keyof PaymentFormValues, { message: messages[0] });
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
          <Badge variant="primary">Nuevo pago</Badge>
          <CardTitle>Registra un cobro sin convertir Fixy en software contable</CardTitle>
          <CardDescription>
            Cliente, orden, metodo y estado visibles para saber rapido que entro y que sigue pendiente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Cliente"
                error={errors.clientId?.message}
                input={
                  <Select {...register("clientId")}>
                    <option value="">Selecciona un cliente</option>
                    {options.clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.fullName}
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
                    {workOrderOptions.map((workOrder) => (
                      <option key={workOrder.id} value={workOrder.id}>
                        {workOrder.label}
                      </option>
                    ))}
                  </Select>
                }
              />
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
                label="Estado"
                error={errors.status?.message}
                input={
                  <Select {...register("status")}>
                    {paymentStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                }
              />
              <Field
                label="Metodo"
                error={errors.method?.message}
                input={
                  <Select {...register("method")}>
                    {paymentMethodOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
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
                  placeholder="Ej. Cliente envio comprobante, pago parcial de inicial."
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
                Guardar pago
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
            <CardTitle className="text-white">Cobro claro y rapido</CardTitle>
            <CardDescription className="text-white/74">
              Pensado para caja diaria: cuanto entra, a que orden aplica y cuanto queda pendiente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow
              label="Saldo actual"
              value={formatCurrencyDisplay(selectedWorkOrder?.pendingBalance ?? 0, preferredCurrency)}
            />
            <SummaryRow
              label="Quedaria pendiente"
              value={formatCurrencyDisplay(remainingAfterPayment, preferredCurrency)}
            />
            <SummaryRow label="Estado" value={paymentStatusOptions.find((option) => option.value === status)?.label ?? status} />
            <SummaryRow label="Metodo" value={paymentMethodOptions.find((option) => option.value === method)?.label ?? method} />
          </CardContent>
        </Card>

        <Card className="bg-white/86">
          <CardContent className="space-y-3 px-5 py-5">
            {[
              "Puedes registrar pagos directos al cliente o vinculados a una orden.",
              "El saldo pendiente se calcula sin forzar una contabilidad pesada.",
              "Pago movil queda listo como default practico para el contexto local.",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6">
                <div className="text-[var(--primary-strong)]">
                  <Wallet className="size-4" />
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
