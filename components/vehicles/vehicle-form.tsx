"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CarFront, ContactRound, History, Wrench } from "lucide-react";

import { saveVehicleAction } from "@/app/actions/vehicles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  vehicleProfileFormSchema,
  type VehicleProfileFormValues,
} from "@/lib/vehicles/schema";

type VehicleFormProps = {
  mode: "create" | "edit";
  initialValues: VehicleProfileFormValues;
  clientOptions: Array<{
    id: string;
    fullName: string;
  }>;
  vehicleId?: string;
};

export function VehicleForm({
  mode,
  initialValues,
  clientOptions,
  vehicleId,
}: VehicleFormProps) {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VehicleProfileFormValues>({
    resolver: zodResolver(vehicleProfileFormSchema),
    defaultValues: initialValues,
  });

  const make = watch("make");
  const model = watch("model");
  const plate = watch("plate");
  const year = watch("year");
  const clientId = watch("clientId");
  const selectedOwner = clientOptions.find((client) => client.id === clientId);

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveVehicleAction(values, vehicleId);

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) {
          setError(field as keyof VehicleProfileFormValues, { message: messages[0] });
        }
      });

      return;
    }

    setFormMessage(result.message);

    startTransition(() => {
      router.push(`/app/vehicles/${result.vehicleId}` as Route);
      router.refresh();
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="bg-white/88">
        <CardHeader>
          <Badge variant="primary">{mode === "create" ? "Nuevo vehiculo" : "Editar vehiculo"}</Badge>
          <CardTitle>
            {mode === "create"
              ? "Registra un vehiculo y conectalo al cliente correcto"
              : "Actualiza la ficha del vehiculo"}
          </CardTitle>
          <CardDescription>
            La base queda lista para presupuestos, ordenes de trabajo e historial de reparacion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Cliente propietario"
                error={errors.clientId?.message}
                input={
                  <Select {...register("clientId")}>
                    <option value="">Selecciona un cliente</option>
                    {clientOptions.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.fullName}
                      </option>
                    ))}
                  </Select>
                }
              />
              <Field
                label="Placa"
                error={errors.plate?.message}
                input={<Input placeholder="Ej. AB123CD" {...register("plate")} />}
              />
              <Field
                label="Marca"
                error={errors.make?.message}
                input={<Input placeholder="Ej. Toyota" {...register("make")} />}
              />
              <Field
                label="Modelo"
                error={errors.model?.message}
                input={<Input placeholder="Ej. Corolla" {...register("model")} />}
              />
              <Field
                label="Anio"
                error={errors.year?.message}
                input={<Input placeholder="Ej. 2014" {...register("year")} />}
              />
              <Field
                label="Color opcional"
                error={errors.color?.message}
                input={<Input placeholder="Ej. Blanco" {...register("color")} />}
              />
              <Field
                label="Kilometraje opcional"
                error={errors.mileage?.message}
                input={<Input placeholder="Ej. 125000" {...register("mileage")} />}
              />
              <Field
                label="VIN opcional"
                error={errors.vin?.message}
                input={<Input placeholder="Ej. 1HGBH41JXMN109186" {...register("vin")} />}
              />
            </div>

            <Field
              label="Notas"
              error={errors.notes?.message}
              input={
                <Textarea
                  placeholder="Ej. Llego con falla de arranque, cliente reporta ruido frontal."
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
                {mode === "create" ? "Guardar vehiculo" : "Guardar cambios"}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/app/vehicles">Volver a vehiculos</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Ficha rapida</Badge>
            <CardTitle className="text-white">
              {[make, model, year].filter(Boolean).join(" ") || "Vehiculo del taller"}
            </CardTitle>
            <CardDescription className="text-white/74">
              {plate || "Agrega la placa"} - {selectedOwner?.fullName || "Selecciona el propietario"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Propietario", selectedOwner?.fullName || "Pendiente"],
              ["Presupuestos", "Se conectan desde el proximo sprint"],
              ["Ordenes", "Quedaran visibles por vehiculo"],
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
                icon: <ContactRound className="size-4" />,
                text: "La relacion cliente-vehiculo queda fuerte desde el primer registro.",
              },
              {
                icon: <Wrench className="size-4" />,
                text: "Se deja espacio claro para ordenes y seguimientos tecnicos.",
              },
              {
                icon: <History className="size-4" />,
                text: "El historial de reparaciones se podra montar sin rehacer esta ficha.",
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
