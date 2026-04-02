"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState, type ReactNode } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Plus, Trash2, UserRound, Wrench } from "lucide-react";

import { saveWorkOrderAction } from "@/app/actions/work-orders";
import { UploadPicker } from "@/components/uploads/upload-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { workOrderStatusOptions } from "@/lib/work-orders/constants";
import { calculateWorkOrderTotal, workOrderFormSchema, type WorkOrderFormValues, type WorkOrderItemFormValues } from "@/lib/work-orders/schema";
import { formatCurrencyDisplay } from "@/lib/utils";

type WorkOrderFormProps = {
  mode: "create" | "edit";
  initialValues: WorkOrderFormValues;
  options: {
    clients: Array<{ id: string; fullName: string }>;
    vehicles: Array<{ id: string; clientId: string | null; label: string }>;
    approvedQuotes: Array<{ id: string; clientId: string | null; vehicleId: string | null; title: string }>;
    mechanics: Array<{ id: string; label: string; fullName: string }>;
  };
  preferredCurrency: "USD" | "VES" | "USD_VES";
  workOrderId?: string;
};

function createEmptyItem(itemType: "service" | "part"): WorkOrderItemFormValues {
  return {
    rowId: crypto.randomUUID(),
    itemType,
    description: "",
    quantity: "1",
    unitPrice: "",
  };
}

function toNumber(value?: string) {
  const number = Number(value ?? 0);
  return Number.isNaN(number) ? 0 : number;
}

export function WorkOrderForm({
  mode,
  initialValues,
  options,
  preferredCurrency,
  workOrderId,
}: WorkOrderFormProps) {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [referencePhotoUrls, setReferencePhotoUrls] = useState<string[]>(
    initialValues.referencePhotoUrls,
  );

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderFormSchema),
    defaultValues: initialValues,
  });

  const serviceItemsArray = useFieldArray({
    control,
    name: "serviceItems",
  });

  const partItemsArray = useFieldArray({
    control,
    name: "partItems",
  });

  const clientId = useWatch({ control, name: "clientId" });
  const vehicleId = useWatch({ control, name: "vehicleId" });
  const serviceItems = useWatch({ control, name: "serviceItems" }) ?? [];
  const partItems = useWatch({ control, name: "partItems" }) ?? [];
  const quoteId = useWatch({ control, name: "quoteId" });
  const assignedMechanicId = useWatch({ control, name: "assignedMechanicId" });

  const vehicleOptions = useMemo(
    () => options.vehicles.filter((vehicle) => !clientId || vehicle.clientId === clientId),
    [clientId, options.vehicles],
  );

  const quoteOptions = useMemo(
    () =>
      options.approvedQuotes.filter(
        (quote) =>
          (!clientId || quote.clientId === clientId) &&
          (!vehicleId || quote.vehicleId === vehicleId),
      ),
    [clientId, vehicleId, options.approvedQuotes],
  );

  const selectedMechanic = useMemo(
    () => options.mechanics.find((mechanic) => mechanic.id === assignedMechanicId) ?? null,
    [assignedMechanicId, options.mechanics],
  );

  useEffect(() => {
    if (!vehicleOptions.length) {
      if (vehicleId) {
        setValue("vehicleId", "");
      }
      return;
    }

    if (!vehicleOptions.some((vehicle) => vehicle.id === vehicleId)) {
      setValue("vehicleId", vehicleOptions[0]?.id ?? "");
    }
  }, [vehicleId, vehicleOptions, setValue]);

  useEffect(() => {
    if (!quoteOptions.length) {
      if (quoteId) {
        setValue("quoteId", "");
      }
      return;
    }

    if (quoteId && !quoteOptions.some((quote) => quote.id === quoteId)) {
      setValue("quoteId", "");
    }
  }, [quoteId, quoteOptions, setValue]);

  const total = useMemo(() => {
    const services = serviceItems.map((item, index) => ({
      itemType: "service" as const,
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

    return calculateWorkOrderTotal(services, parts);
  }, [partItems, serviceItems]);

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveWorkOrderAction(
      {
        ...values,
        referencePhotoUrls,
      },
      workOrderId,
    );

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) {
          setError(field as keyof WorkOrderFormValues, { message: messages[0] });
        }
      });

      return;
    }

    setFormMessage(result.message);

    startTransition(() => {
      router.push(`/app/work-orders/${result.workOrderId}` as Route);
      router.refresh();
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
      <Card className="bg-white/88">
        <CardHeader>
          <Badge variant="primary">{mode === "create" ? "Nueva orden" : "Editar orden"}</Badge>
          <CardTitle>
            {mode === "create"
              ? "Orden visual y operativa"
              : "Actualiza la orden sin perder el hilo del trabajo"}
          </CardTitle>
          <CardDescription>
            Pensada para mover el taller con claridad: etapa visible, servicios, repuestos y responsable.
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
                label="Presupuesto aprobado opcional"
                error={errors.quoteId?.message}
                input={
                  <Select {...register("quoteId")}>
                    <option value="">Sin presupuesto vinculado</option>
                    {quoteOptions.map((quote) => (
                      <option key={quote.id} value={quote.id}>
                        {quote.title}
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
                    {workOrderStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                }
              />
              <Field
                label="Titulo"
                error={errors.title?.message}
                input={<Input placeholder="Ej. Reparacion tren delantero" {...register("title")} />}
              />
              <Field
                label="Responsable"
                error={errors.assignedMechanicId?.message}
                input={
                  <Select {...register("assignedMechanicId")}>
                    <option value="">Sin asignar</option>
                    {options.mechanics.map((mechanic) => (
                      <option key={mechanic.id} value={mechanic.id}>
                        {mechanic.label}
                      </option>
                    ))}
                  </Select>
                }
              />
              <Field
                label="Promesa de entrega"
                error={errors.promisedDate?.message}
                input={<Input type="date" {...register("promisedDate")} />}
              />
            </div>

            <ItemsSection
              description="Tareas, servicios y avances principales del trabajo."
              errors={errors.serviceItems}
              fields={serviceItemsArray.fields}
              icon={<Wrench className="size-4" />}
              label="Servicios"
              onAdd={() => serviceItemsArray.append(createEmptyItem("service"))}
              onRemove={(index) => serviceItemsArray.remove(index)}
              register={register}
            />

            <ItemsSection
              description="Repuestos utilizados o necesarios dentro de la orden."
              errors={errors.partItems}
              fields={partItemsArray.fields}
              icon={<UserRound className="size-4" />}
              label="Repuestos usados"
              onAdd={() => partItemsArray.append(createEmptyItem("part"))}
              onRemove={(index) => partItemsArray.remove(index)}
              register={register}
              sectionName="partItems"
            />

            <Field
              label="Notas"
              error={errors.notes?.message}
              input={
                <Textarea
                  placeholder="Ej. Cliente autoriza diagnostico adicional, revisar ruido en suspension."
                  {...register("notes")}
                />
              }
            />

            <UploadPicker
              accept="image/jpeg,image/webp"
              buttonLabel="Subir referencias"
              canTakePhoto
              cameraLabel="Tomar foto"
              error={errors.referencePhotoUrls?.message}
              helper="Opcional. Agrega fotos del estado del vehiculo, piezas o hallazgos."
              label="Fotos de referencia"
              maxFiles={12}
              multiple
              onChange={setReferencePhotoUrls}
              scope="work_order_reference"
              values={referencePhotoUrls}
            />

            {formMessage ? (
              <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
                {formMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button disabled={isSubmitting} type="submit" variant="primary">
                {mode === "create" ? "Guardar orden" : "Guardar cambios"}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/app/work-orders">Volver a ordenes</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Vista operativa</Badge>
            <CardTitle className="text-white">Seguimiento listo para el board</CardTitle>
            <CardDescription className="text-white/74">
              La orden ya nace con etapa, responsable y costo visible para mover el taller mejor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow label="Servicios" value={String(serviceItems.length)} />
            <SummaryRow label="Repuestos" value={String(partItems.length)} />
            <SummaryRow label="Responsable" value={selectedMechanic?.fullName || "Sin asignar"} />
            <SummaryRow label="Referencias" value={String(referencePhotoUrls.length)} />
            <SummaryRow label="Promesa" value={useWatch({ control, name: "promisedDate" }) || "Sin fecha"} />
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="text-sm text-white/64">Total estimado</div>
              <div className="mt-2 font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight">
                {formatCurrencyDisplay(total, preferredCurrency)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/86">
          <CardContent className="space-y-3 px-5 py-5">
            {[
              "El board lee directamente estas etapas, sin reinterpretar estados.",
              "Puedes crear orden desde presupuesto aprobado o manualmente.",
              "Servicios y repuestos quedan separados para lectura operativa.",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />
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
  onAdd,
  onRemove,
  errors,
  icon,
  sectionName = "serviceItems",
}: {
  label: string;
  description: string;
  fields: Array<{ id: string }>;
  register: ReturnType<typeof useForm<WorkOrderFormValues>>["register"];
  onAdd: () => void;
  onRemove: (index: number) => void;
  errors: any;
  icon: ReactNode;
  sectionName?: "serviceItems" | "partItems";
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
            <div className="grid gap-3 sm:grid-cols-[1.2fr_0.45fr_0.55fr_auto]">
              <Field
                label="Descripcion"
                error={errors?.[index]?.description?.message}
                input={
                  <Input
                    placeholder={sectionName === "serviceItems" ? "Ej. Diagnostico y revision" : "Ej. Juego de pastillas"}
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
                  disabled={fields.length === 1 && sectionName === "serviceItems"}
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
