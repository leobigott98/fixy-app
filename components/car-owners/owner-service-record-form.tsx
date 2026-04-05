"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, type ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, ClipboardList, DollarSign, Wrench } from "lucide-react";

import { createOwnerServiceRecordAction } from "@/app/actions/car-owners";
import { UploadPicker } from "@/components/uploads/upload-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ownerCurrencyOptions,
  ownerServiceRecordFormSchema,
  type OwnerServiceRecordFormValues,
} from "@/lib/car-owners/schema";

type OwnerServiceRecordFormProps = {
  initialValues: OwnerServiceRecordFormValues;
  vehicleOptions: Array<{
    id: string;
    label: string;
  }>;
  workshopOptions: Array<{
    slug: string;
    name: string;
    city: string;
  }>;
};

export function OwnerServiceRecordForm({
  initialValues,
  vehicleOptions,
  workshopOptions,
}: OwnerServiceRecordFormProps) {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialValues.photoUrls);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OwnerServiceRecordFormValues>({
    resolver: zodResolver(ownerServiceRecordFormSchema),
    defaultValues: initialValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await createOwnerServiceRecordAction({
      ...values,
      photoUrls,
    });

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) {
          setError(field as keyof OwnerServiceRecordFormValues, { message: messages[0] });
        }
      });

      return;
    }

    setFormMessage(result.message);

    startTransition(() => {
      router.push("/app/history" as Route);
      router.refresh();
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
      <Card className="bg-white/88">
        <CardHeader>
          <Badge variant="primary">Nuevo registro</Badge>
          <CardTitle>Guarda reparaciones y servicios con contexto real</CardTitle>
          <CardDescription>
            Puedes usarlo para historial manual, mantenimientos, cambios de repuesto y entregas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Carro"
                error={errors.ownerVehicleId?.message}
                input={
                  <Select {...register("ownerVehicleId")}>
                    <option value="">Selecciona un carro</option>
                    {vehicleOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                }
              />
              <Field
                label="Taller"
                error={errors.workshopSlug?.message}
                input={
                  <Select {...register("workshopSlug")}>
                    <option value="">Elegir luego o manual</option>
                    {workshopOptions.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {`${item.name} · ${item.city}`}
                      </option>
                    ))}
                  </Select>
                }
              />
              <Field
                label="Nombre del taller"
                error={errors.workshopName?.message}
                input={<Input placeholder="Ej. Fixy Garage" {...register("workshopName")} />}
              />
              <Field
                label="Mecanico"
                error={errors.mechanicName?.message}
                input={<Input placeholder="Ej. Jose Ramirez" {...register("mechanicName")} />}
              />
              <Field
                label="Fecha del servicio"
                error={errors.serviceDate?.message}
                input={<Input type="date" {...register("serviceDate")} />}
              />
              <Field
                label="Fecha de entrega"
                error={errors.deliveredAt?.message}
                input={<Input type="date" {...register("deliveredAt")} />}
              />
              <Field
                label="Tipo de servicio"
                error={errors.serviceType?.message}
                input={<Input placeholder="Ej. Cambio de frenos" {...register("serviceType")} />}
              />
              <Field
                label="Partes usadas"
                error={errors.partsUsed?.message}
                input={<Input placeholder="Ej. Pastillas, discos, liquido" {...register("partsUsed")} />}
              />
              <Field
                label="Costo"
                error={errors.totalCost?.message}
                input={<Input placeholder="Ej. 180" {...register("totalCost")} />}
              />
              <Field
                label="Moneda"
                error={errors.currency?.message}
                input={
                  <Select {...register("currency")}>
                    {ownerCurrencyOptions.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </Select>
                }
              />
              <Field
                label="Horas invertidas"
                error={errors.durationHours?.message}
                input={<Input placeholder="Ej. 4.5" {...register("durationHours")} />}
              />
            </div>

            <Field
              label="Trabajo realizado"
              error={errors.description?.message}
              input={
                <Textarea
                  placeholder="Resume lo que se hizo, el resultado y cualquier contexto util."
                  {...register("description")}
                />
              }
            />

            <Field
              label="Notas adicionales"
              error={errors.notes?.message}
              input={<Textarea placeholder="Observaciones, garantias, recomendaciones." {...register("notes")} />}
            />

            <UploadPicker
              accept="image/jpeg,image/webp,image/png"
              buttonLabel="Subir evidencia"
              canTakePhoto
              cameraLabel="Tomar foto"
              helper="Fotos de antes, despues, factura o piezas usadas."
              label="Fotos del servicio"
              maxFiles={12}
              multiple
              onChange={setPhotoUrls}
              scope="owner_service_photo"
              values={photoUrls}
            />

            {formMessage ? (
              <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
                {formMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button disabled={isSubmitting} type="submit" variant="primary">
                Guardar en historial
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href={"/app/history" as Route}>Volver a historial</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Lectura rapida</Badge>
            <CardTitle className="text-white">{watch("serviceType") || "Servicio registrado"}</CardTitle>
            <CardDescription className="text-white/74">
              {watch("workshopName") || "Agrega el taller para que el historial quede completo."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Fecha", watch("serviceDate") || "Pendiente"],
              ["Costo", watch("totalCost") || "Pendiente"],
              ["Horas", watch("durationHours") || "Pendiente"],
              ["Fotos", photoUrls.length ? `${photoUrls.length} cargadas` : "Opcionales"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white/8 p-4">
                <div className="text-sm text-white/64">{label}</div>
                <div className="mt-1 font-semibold">{value}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white/86">
          <CardContent className="space-y-3 px-5 py-5">
            {[
              {
                icon: <ClipboardList className="size-4" />,
                text: "El historial queda ordenado por carro y por fecha, no por conversaciones sueltas.",
              },
              {
                icon: <DollarSign className="size-4" />,
                text: "Costo y moneda ayudan a medir cuanto te esta costando mantener cada carro.",
              },
              {
                icon: <Wrench className="size-4" />,
                text: "Partes usadas y mecanico dejan la reparacion mucho mas trazable.",
              },
              {
                icon: <Camera className="size-4" />,
                text: "Las fotos sirven como respaldo visual del trabajo y la entrega.",
              },
            ].map((item) => (
              <div key={item.text} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6">
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
