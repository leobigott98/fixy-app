"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, type ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, CarFront, MapPin, MessageSquareText } from "lucide-react";

import { createOwnerAppointmentAction } from "@/app/actions/car-owners";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ownerAppointmentFormSchema,
  ownerPreferredContactOptions,
  type OwnerAppointmentFormValues,
} from "@/lib/car-owners/schema";

type OwnerAppointmentFormProps = {
  initialValues: OwnerAppointmentFormValues;
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

export function OwnerAppointmentForm({
  initialValues,
  vehicleOptions,
  workshopOptions,
}: OwnerAppointmentFormProps) {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OwnerAppointmentFormValues>({
    resolver: zodResolver(ownerAppointmentFormSchema),
    defaultValues: initialValues,
  });

  const selectedVehicle = vehicleOptions.find((item) => item.id === watch("ownerVehicleId"));
  const selectedWorkshop = workshopOptions.find((item) => item.slug === watch("workshopSlug"));

  const onSubmit = handleSubmit(async (values) => {
    const result = await createOwnerAppointmentAction(values);

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) {
          setError(field as keyof OwnerAppointmentFormValues, { message: messages[0] });
        }
      });

      return;
    }

    setFormMessage(result.message);

    startTransition(() => {
      router.push("/app/appointments" as Route);
      router.refresh();
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="bg-white/88">
        <CardHeader>
          <Badge variant="primary">Nueva cita</Badge>
          <CardTitle>Solicita una cita clara y sin friccion</CardTitle>
          <CardDescription>
            El taller recibe el contexto del carro, lo que necesitas y el horario que te sirve.
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
                    <option value="">Selecciona un taller</option>
                    {workshopOptions.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {`${item.name} · ${item.city}`}
                      </option>
                    ))}
                  </Select>
                }
              />
              <Field
                label="Fecha"
                error={errors.requestedDate?.message}
                input={<Input type="date" {...register("requestedDate")} />}
              />
              <Field
                label="Hora"
                error={errors.requestedTime?.message}
                input={<Input type="time" {...register("requestedTime")} />}
              />
              <Field
                label="Servicio"
                error={errors.serviceNeeded?.message}
                input={<Input placeholder="Ej. Diagnostico y frenos" {...register("serviceNeeded")} />}
              />
              <Field
                label="Contacto preferido"
                error={errors.contactChannel?.message}
                input={
                  <Select {...register("contactChannel")}>
                    {ownerPreferredContactOptions.map((option) => (
                      <option key={option} value={option}>
                        {option === "whatsapp"
                          ? "WhatsApp"
                          : option === "llamada"
                            ? "Llamada"
                            : "Correo"}
                      </option>
                    ))}
                  </Select>
                }
              />
            </div>

            <Field
              label="Describe lo que quieres resolver"
              error={errors.issueSummary?.message}
              input={
                <Textarea
                  placeholder="Ej. Hace ruido al frenar, tambien quiero revisar suspension delantera."
                  {...register("issueSummary")}
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
                Enviar solicitud
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href={"/app/appointments" as Route}>Volver a citas</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Previa</Badge>
            <CardTitle className="text-white">{selectedWorkshop?.name || "Tu proxima visita"}</CardTitle>
            <CardDescription className="text-white/74">
              {selectedVehicle?.label || "Selecciona primero el carro para armar el contexto."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Fecha", watch("requestedDate") || "Pendiente"],
              ["Hora", watch("requestedTime") || "Pendiente"],
              ["Servicio", watch("serviceNeeded") || "Pendiente"],
              ["Canal", watch("contactChannel") || "whatsapp"],
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
                icon: <CarFront className="size-4" />,
                text: "La solicitud sale con el carro correcto para evitar conversaciones repetidas.",
              },
              {
                icon: <MapPin className="size-4" />,
                text: "Puedes escoger taller desde discovery y agendar sin salir del app.",
              },
              {
                icon: <CalendarClock className="size-4" />,
                text: "La fecha y la hora quedan registradas tambien en tu historial de citas.",
              },
              {
                icon: <MessageSquareText className="size-4" />,
                text: "Mientras mas claro sea el resumen, mejor responde el taller.",
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
