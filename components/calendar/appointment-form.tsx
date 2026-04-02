"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Clock3, Wrench } from "lucide-react";

import { saveAppointmentAction } from "@/app/actions/appointments";
import { appointmentStatusOptions, appointmentTypeOptions } from "@/lib/appointments/constants";
import { appointmentFormSchema, type AppointmentFormValues } from "@/lib/appointments/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type AppointmentFormProps = {
  initialValues: AppointmentFormValues;
  mode: "create" | "edit";
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
  };
  appointmentId?: string;
};

export function AppointmentForm({
  initialValues,
  mode,
  options,
  appointmentId,
}: AppointmentFormProps) {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: initialValues,
  });

  const clientId = useWatch({ control, name: "clientId" });
  const vehicleId = useWatch({ control, name: "vehicleId" });
  const selectedClient = options.clients.find((client) => client.id === clientId) ?? null;

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
  }, [vehicleId, vehicleOptions, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveAppointmentAction(values, appointmentId);

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) {
          setError(field as keyof AppointmentFormValues, { message: messages[0] });
        }
      });

      return;
    }

    setFormMessage(result.message);

    startTransition(() => {
      router.push(`/app/calendar?scope=day&date=${values.date}` as Route);
      router.refresh();
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="bg-white/88">
        <CardHeader>
          <Badge variant="primary">{mode === "create" ? "Nueva cita" : "Editar cita"}</Badge>
          <CardTitle>
            {mode === "create" ? "Agenda clara para el taller" : "Actualiza la cita sin perder contexto"}
          </CardTitle>
          <CardDescription>
            Lo justo para organizar ingresos y visitas del taller con visibilidad diaria real.
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
                label="Fecha"
                error={errors.date?.message}
                input={<Input type="date" {...register("date")} />}
              />
              <Field
                label="Hora"
                error={errors.time?.message}
                input={<Input type="time" {...register("time")} />}
              />
              <Field
                label="Tipo"
                error={errors.type?.message}
                input={
                  <Select {...register("type")}>
                    {appointmentTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
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
                    {appointmentStatusOptions.map((option) => (
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
                  placeholder="Ej. Llegar con documentacion, revisar frenos, visita por ruido en suspension."
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
                {mode === "create" ? "Guardar cita" : "Guardar cambios"}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/app/calendar">Volver al calendario</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Agenda</Badge>
            <CardTitle className="text-white">Cita lista para operacion diaria</CardTitle>
            <CardDescription className="text-white/74">
              El calendario acompana al taller con contexto claro, sin volverse el centro del producto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow label="Cliente" value={selectedClient?.fullName || "Pendiente"} />
            <SummaryRow label="WhatsApp" value={selectedClient?.whatsappPhone || "Opcional"} />
            <SummaryRow label="Modo" value={mode === "create" ? "Nueva cita" : "Edicion"} />
          </CardContent>
        </Card>

        <Card className="bg-white/86">
          <CardContent className="space-y-3 px-5 py-5">
            {[
              { icon: <CalendarDays className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />, text: "Sirve para ordenar ingresos y visitas, no para construir una suite de agenda pesada." },
              { icon: <Clock3 className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />, text: "Dia y hora quedan claros para lectura rapida en mobile." },
              { icon: <Wrench className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />, text: "Cliente y vehiculo quedan vinculados para que la recepcion no empiece desde cero." },
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
