"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState, type ReactNode } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CarFront, ClipboardList, Plus, Trash2, Wrench } from "lucide-react";

import { saveQuoteAction } from "@/app/actions/quotes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { quoteStatusOptions } from "@/lib/quotes/constants";
import { calculateQuoteTotals, quoteFormSchema, type QuoteFormValues, type QuoteItemFormValues } from "@/lib/quotes/schema";
import { formatCurrencyDisplay } from "@/lib/utils";

type QuoteFormProps = {
  mode: "create" | "edit";
  initialValues: QuoteFormValues;
  options: {
    clients: Array<{
      id: string;
      fullName: string;
      whatsappPhone: string | null;
    }>;
    vehicles: Array<{
      id: string;
      clientId: string | null;
      label: string;
    }>;
    inventoryItems: Array<{
      id: string;
      label: string;
      name: string;
      stockQuantity: number;
      referenceSalePrice: number;
    }>;
  };
  preferredCurrency: "USD" | "VES" | "USD_VES";
  quoteId?: string;
};

function createEmptyItem(itemType: "labor" | "part"): QuoteItemFormValues {
  return {
    rowId: crypto.randomUUID(),
    inventoryItemId: "",
    itemType,
    description: "",
    quantity: "1",
    unitPrice: "",
  };
}

function toNumber(value?: string) {
  if (!value) {
    return 0;
  }

  const number = Number(value);
  return Number.isNaN(number) ? 0 : number;
}

export function QuoteForm({ mode, initialValues, options, preferredCurrency, quoteId }: QuoteFormProps) {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: initialValues,
  });

  const laborItemsArray = useFieldArray({
    control,
    name: "laborItems",
  });

  const partItemsArray = useFieldArray({
    control,
    name: "partItems",
  });

  const clientId = useWatch({ control, name: "clientId" });
  const vehicleId = useWatch({ control, name: "vehicleId" });
  const laborItems = useWatch({ control, name: "laborItems" }) ?? [];
  const partItems = useWatch({ control, name: "partItems" }) ?? [];
  const selectedClient = options.clients.find((client) => client.id === clientId);

  const vehicleOptions = useMemo(
    () => options.vehicles.filter((vehicle) => !clientId || vehicle.clientId === clientId),
    [clientId, options.vehicles],
  );

  useEffect(() => {
    if (!vehicleOptions.length) {
      if (vehicleId) {
        setValue("vehicleId", "");
      }

      return;
    }

    const isCurrentVehicleValid = vehicleOptions.some((vehicle) => vehicle.id === vehicleId);

    if (!isCurrentVehicleValid) {
      setValue("vehicleId", vehicleOptions[0]?.id ?? "");
    }
  }, [clientId, vehicleId, vehicleOptions, setValue]);

  const totals = useMemo(() => {
    const labor = laborItems.map((item, index) => ({
      itemType: "labor" as const,
      description: item.description,
      quantity: toNumber(item.quantity),
      unitPrice: toNumber(item.unitPrice),
      lineTotal: Number((toNumber(item.quantity) * toNumber(item.unitPrice)).toFixed(2)),
      sortOrder: index,
    }));

    const parts = partItems.map((item, index) => ({
      itemType: "part" as const,
      description: item.description,
      quantity: toNumber(item.quantity),
      unitPrice: toNumber(item.unitPrice),
      lineTotal: Number((toNumber(item.quantity) * toNumber(item.unitPrice)).toFixed(2)),
      sortOrder: index,
    }));

    return calculateQuoteTotals(labor, parts);
  }, [laborItems, partItems]);

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveQuoteAction(values, quoteId);

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) {
          setError(field as keyof QuoteFormValues, { message: messages[0] });
        }
      });

      return;
    }

    setFormMessage(result.message);

    startTransition(() => {
      router.push(`/app/quotes/${result.quoteId}` as Route);
      router.refresh();
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
      <Card className="bg-white/88">
        <CardHeader>
          <Badge variant="primary">{mode === "create" ? "Nuevo presupuesto" : "Editar presupuesto"}</Badge>
          <CardTitle>
            {mode === "create"
              ? "Cotiza rapido y con claridad"
              : "Actualiza el presupuesto sin perder ritmo"}
          </CardTitle>
          <CardDescription>
            Mano de obra y repuestos separados, totales visibles y una lectura clara para el cliente.
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
                label="Vehiculo"
                error={errors.vehicleId?.message}
                input={
                  <Select {...register("vehicleId")}>
                    <option value="">Selecciona un vehiculo</option>
                    {vehicleOptions.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.label}
                      </option>
                    ))}
                  </Select>
                }
              />
              <Field
                label="Estado"
                error={errors.status?.message}
                input={
                  <Select {...register("status")}>
                    {quoteStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                }
              />
              <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                <div className="text-sm text-[var(--muted)]">WhatsApp del cliente</div>
                <div className="mt-2 font-medium">
                  {selectedClient?.whatsappPhone || "Disponible cuando el cliente tenga WhatsApp"}
                </div>
              </div>
            </div>

            <ItemsSection
              description="Servicios, diagnostico, mano de obra o tareas del taller."
              errors={errors.laborItems}
              fields={laborItemsArray.fields}
              icon={<Wrench className="size-4" />}
              label="Mano de obra"
              onAdd={() => laborItemsArray.append(createEmptyItem("labor"))}
              onRemove={(index) => laborItemsArray.remove(index)}
              register={register}
              setValue={setValue}
            />

            <ItemsSection
              description="Repuestos, insumos o piezas necesarias para el trabajo."
              errors={errors.partItems}
              fields={partItemsArray.fields}
              icon={<CarFront className="size-4" />}
              label="Repuestos"
              onAdd={() => partItemsArray.append(createEmptyItem("part"))}
              onRemove={(index) => partItemsArray.remove(index)}
              register={register}
              setValue={setValue}
              sectionName="partItems"
              inventoryItems={options.inventoryItems}
            />

            <Field
              label="Notas"
              error={errors.notes?.message}
              input={
                <Textarea
                  placeholder="Ej. Incluye diagnostico inicial, tiempo estimado y condiciones del trabajo."
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
                {mode === "create" ? "Guardar presupuesto" : "Guardar cambios"}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/app/quotes">Volver a presupuestos</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Resumen en vivo</Badge>
            <CardTitle className="text-white">Totales claros desde el primer paso</CardTitle>
            <CardDescription className="text-white/74">
              El presupuesto debe ser rapido de armar y facil de leer para el cliente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow
              label="Mano de obra"
              value={formatCurrencyDisplay(totals.laborSubtotal, preferredCurrency)}
            />
            <SummaryRow
              label="Repuestos"
              value={formatCurrencyDisplay(totals.partsSubtotal, preferredCurrency)}
            />
            <SummaryRow
              label="Subtotal"
              value={formatCurrencyDisplay(totals.subtotal, preferredCurrency)}
            />
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-sm text-white/64">Total</div>
              <div className="mt-2 font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight">
                {formatCurrencyDisplay(totals.total, preferredCurrency)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/86">
          <CardContent className="space-y-3 px-5 py-5">
            {[
              "Cliente y vehiculo arriba para no perder contexto.",
              "Items separados por mano de obra y repuestos para lectura mas profesional.",
              "Si el repuesto ya existe en inventario, puedes traerlo directo con precio de referencia.",
              "Totales visibles siempre para cotizar mas rapido desde el telefono.",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6">
                <ClipboardList className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ItemsSection({
  label,
  description,
  fields,
  register,
  setValue,
  onAdd,
  onRemove,
  errors,
  icon,
  sectionName = "laborItems",
  inventoryItems,
}: {
  label: string;
  description: string;
  fields: Array<{ id: string }>;
  register: ReturnType<typeof useForm<QuoteFormValues>>["register"];
  setValue: ReturnType<typeof useForm<QuoteFormValues>>["setValue"];
  onAdd: () => void;
  onRemove: (index: number) => void;
  errors: any;
  icon: ReactNode;
  sectionName?: "laborItems" | "partItems";
  inventoryItems?: Array<{
    id: string;
    label: string;
    name: string;
    stockQuantity: number;
    referenceSalePrice: number;
  }>;
}) {
  return (
    <div className="space-y-4 rounded-[28px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <span className="text-[var(--primary-strong)]">{icon}</span>
            {label}
          </div>
          <div className="mt-1 text-sm text-[var(--muted)]">{description}</div>
        </div>
        <Button onClick={onAdd} type="button" variant="outline">
          <Plus className="size-4" />
          Agregar item
        </Button>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
            <div
              className={
                sectionName === "partItems"
                  ? "grid gap-3 sm:grid-cols-[0.9fr_1.15fr_0.45fr_0.55fr_auto]"
                  : "grid gap-3 sm:grid-cols-[1.2fr_0.45fr_0.55fr_auto]"
              }
            >
              {sectionName === "partItems" ? (
                <Field
                  label="Inventario"
                  error={errors?.[index]?.inventoryItemId?.message}
                  input={(() => {
                    const inventoryField = register(`${sectionName}.${index}.inventoryItemId`);

                    return (
                      <Select
                        {...inventoryField}
                        onChange={(event) => {
                          inventoryField.onChange(event);
                          const selectedItem = inventoryItems?.find((item) => item.id === event.target.value);

                          if (!selectedItem) {
                            return;
                          }

                          setValue(`${sectionName}.${index}.description`, selectedItem.name, {
                            shouldDirty: true,
                          });
                          setValue(
                            `${sectionName}.${index}.unitPrice`,
                            String(selectedItem.referenceSalePrice || ""),
                            { shouldDirty: true },
                          );
                        }}
                      >
                        <option value="">Repuesto libre</option>
                        {(inventoryItems ?? []).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </Select>
                    );
                  })()}
                />
              ) : null}
              <Field
                label="Descripcion"
                error={errors?.[index]?.description?.message}
                input={
                  <Input
                    placeholder={sectionName === "laborItems" ? "Ej. Cambio de aceite y filtro" : "Ej. Filtro de aceite"}
                    {...register(`${sectionName}.${index}.description`)}
                  />
                }
              />
              <Field
                label="Cantidad"
                error={errors?.[index]?.quantity?.message}
                input={<Input placeholder="1" {...register(`${sectionName}.${index}.quantity`)} />}
              />
              <Field
                label="Precio unitario"
                error={errors?.[index]?.unitPrice?.message}
                input={<Input placeholder="0" {...register(`${sectionName}.${index}.unitPrice`)} />}
              />
              <div className="flex items-end">
                <Button
                  disabled={fields.length === 1 && sectionName === "laborItems"}
                  onClick={() => onRemove(index)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <input type="hidden" {...register(`${sectionName}.${index}.rowId`)} />
            <input type="hidden" {...register(`${sectionName}.${index}.itemType`)} />
            {sectionName === "laborItems" ? (
              <input type="hidden" {...register(`${sectionName}.${index}.inventoryItemId`)} />
            ) : null}
          </div>
        ))}
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
