"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState, type ReactNode } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Boxes, PackagePlus, ReceiptText, Trash2, Truck } from "lucide-react";

import { savePurchaseOrderAction } from "@/app/actions/purchase-orders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getPurchaseOrderStatusLabel,
  purchaseOrderStatusOptions,
} from "@/lib/purchase-orders/constants";
import {
  buildPurchaseOrderFormDefaults,
  purchaseOrderFormSchema,
  type PurchaseOrderFormValues,
} from "@/lib/purchase-orders/schema";
import { formatCurrencyDisplay } from "@/lib/utils";

type PurchaseOrderFormProps = {
  mode: "create" | "edit";
  initialValues?: PurchaseOrderFormValues;
  purchaseOrderId?: string;
  preferredCurrency: "USD" | "VES" | "USD_VES";
  options: {
    suppliers: Array<{
      id: string;
      label: string;
    }>;
    inventoryItems: Array<{
      id: string;
      name: string;
      label: string;
      cost: number;
    }>;
  };
};

export function PurchaseOrderForm({
  mode,
  initialValues,
  purchaseOrderId,
  preferredCurrency,
  options,
}: PurchaseOrderFormProps) {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: initialValues ?? buildPurchaseOrderFormDefaults(),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const items = watch("items");
  const supplierId = watch("supplierId");
  const status = watch("status");
  const selectedSupplier = options.suppliers.find((supplier) => supplier.id === supplierId) ?? null;

  const totalAmount = useMemo(
    () =>
      items.reduce((total, item) => {
        const quantity = Number(item.quantity || 0);
        const unitCost = Number(item.unitCost || 0);
        return total + quantity * unitCost;
      }, 0),
    [items],
  );

  const onSubmit = handleSubmit(async (values) => {
    const result = await savePurchaseOrderAction(values, purchaseOrderId);

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) {
          setError(field as keyof PurchaseOrderFormValues, { message: messages[0] });
        }
      });

      return;
    }

    setFormMessage(result.message);

    startTransition(() => {
      router.push("/app/purchase-orders" as Route);
      router.refresh();
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
      <Card className="bg-white/88">
        <CardHeader>
          <Badge variant="primary">
            {mode === "create" ? "Nueva compra" : "Editar compra"}
          </Badge>
          <CardTitle>
            {mode === "create"
              ? "Compra ligera, lista para crecer"
              : "Actualiza la orden de compra sin romper el flujo"}
          </CardTitle>
          <CardDescription>
            Suficiente para proveedor, items, monto y estado. Nada de procurement corporativo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Proveedor"
                error={errors.supplierId?.message}
                input={
                  <Select {...register("supplierId")}>
                    <option value="">Selecciona un proveedor</option>
                    {options.suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.label}
                      </option>
                    ))}
                  </Select>
                }
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
                    {purchaseOrderStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                }
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-[var(--foreground)]">Items</div>
                  <div className="text-sm text-[var(--muted)]">
                    Describe repuestos o usa una referencia de inventario si ya existe.
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    append({
                      rowId: crypto.randomUUID(),
                      inventoryItemId: "",
                      description: "",
                      quantity: "1",
                      unitCost: "",
                    })
                  }
                >
                  <PackagePlus className="size-4" />
                  Agregar item
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4"
                  >
                    <div className="grid gap-3 lg:grid-cols-[1.1fr_1.4fr_0.45fr_0.55fr_auto]">
                      <Field
                        label="Repuesto ligado"
                        error={errors.items?.[index]?.inventoryItemId?.message}
                        input={
                          <Select
                            {...register(`items.${index}.inventoryItemId`)}
                            onChange={(event) => {
                              const nextId = event.target.value;
                              setValue(`items.${index}.inventoryItemId`, nextId, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });

                              const selectedItem = options.inventoryItems.find((item) => item.id === nextId);

                              if (selectedItem) {
                                const currentDescription = watch(`items.${index}.description`);
                                const currentCost = watch(`items.${index}.unitCost`);

                                if (!currentDescription) {
                                  setValue(`items.${index}.description`, selectedItem.name, {
                                    shouldDirty: true,
                                  });
                                }

                                if (!currentCost) {
                                  setValue(
                                    `items.${index}.unitCost`,
                                    String(selectedItem.cost || ""),
                                    { shouldDirty: true },
                                  );
                                }
                              }
                            }}
                          >
                            <option value="">Manual</option>
                            {options.inventoryItems.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.label}
                              </option>
                            ))}
                          </Select>
                        }
                      />
                      <Field
                        label="Descripcion"
                        error={errors.items?.[index]?.description?.message}
                        input={<Input placeholder="Ej. Pastillas de freno delanteras" {...register(`items.${index}.description`)} />}
                      />
                      <Field
                        label="Cant."
                        error={errors.items?.[index]?.quantity?.message}
                        input={<Input placeholder="1" {...register(`items.${index}.quantity`)} />}
                      />
                      <Field
                        label="Costo unit."
                        error={errors.items?.[index]?.unitCost?.message}
                        input={<Input placeholder="0" {...register(`items.${index}.unitCost`)} />}
                      />
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-[var(--muted)]">
                      Subtotal:{" "}
                      <span className="font-medium text-[var(--foreground)]">
                        {formatCurrencyDisplay(
                          Number(items[index]?.quantity || 0) * Number(items[index]?.unitCost || 0),
                          preferredCurrency,
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Field
              label="Notas"
              error={errors.notes?.message}
              input={
                <Textarea
                  placeholder="Opcional. Condiciones de entrega, referencia bancaria, detalle util."
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
                {mode === "create" ? "Guardar compra" : "Guardar cambios"}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href={"/app/purchase-orders" as Route}>Volver a compras</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Resumen</Badge>
            <CardTitle className="text-white">
              {selectedSupplier?.label || "Orden de compra"}
            </CardTitle>
            <CardDescription className="text-white/74">
              Seguimiento simple para saber que se pidio, a quien y por cuanto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow
              label="Estado"
              value={getPurchaseOrderStatusLabel(status)}
            />
            <SummaryRow
              label="Items"
              value={String(items.length)}
            />
            <SummaryRow
              label="Total"
              value={formatCurrencyDisplay(totalAmount, preferredCurrency)}
            />
          </CardContent>
        </Card>

        <Card className="bg-white/86">
          <CardContent className="space-y-3 px-5 py-5">
            {[
              {
                icon: <Truck className="size-4" />,
                text: "La compra queda ligada al proveedor, no a un flujo corporativo pesado.",
              },
              {
                icon: <Boxes className="size-4" />,
                text: "Los items pueden referenciar inventario para preparar una reposicion futura.",
              },
              {
                icon: <ReceiptText className="size-4" />,
                text: "El monto total se calcula automatico desde cantidades y costos.",
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
