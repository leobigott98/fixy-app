"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CarFront, MessageCircleMore, Phone, ReceiptText } from "lucide-react";

import { saveClientAction } from "@/app/actions/clients";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { clientProfileSchema, type ClientProfileInput } from "@/lib/clients/schema";

type ClientFormProps = {
  mode: "create" | "edit";
  initialValues: ClientProfileInput;
  clientId?: string;
};

export function ClientForm({ mode, initialValues, clientId }: ClientFormProps) {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClientProfileInput>({
    resolver: zodResolver(clientProfileSchema),
    defaultValues: initialValues,
  });

  const fullName = watch("fullName");
  const whatsappPhone = watch("whatsappPhone");

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveClientAction(values, clientId);

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) {
          setError(field as keyof ClientProfileInput, { message: messages[0] });
        }
      });

      return;
    }

    setFormMessage(result.message);

    startTransition(() => {
      router.push(`/app/clients/${result.clientId}` as Route);
      router.refresh();
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="bg-white/88">
        <CardHeader>
          <Badge variant="primary">{mode === "create" ? "Nuevo cliente" : "Editar cliente"}</Badge>
          <CardTitle>
            {mode === "create"
              ? "Registra un cliente sin friccion"
              : "Actualiza la informacion del cliente"}
          </CardTitle>
          <CardDescription>
            Base limpia para relacionar vehiculos, presupuestos y ordenes sin duplicar contexto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nombre completo"
                error={errors.fullName?.message}
                input={<Input placeholder="Ej. Jose Perez" {...register("fullName")} />}
              />
              <Field
                label="Telefono"
                error={errors.phone?.message}
                input={<Input placeholder="Ej. 0212-5551234" {...register("phone")} />}
              />
              <Field
                label="WhatsApp"
                error={errors.whatsappPhone?.message}
                input={<Input placeholder="Ej. 0414-1234567" {...register("whatsappPhone")} />}
              />
              <Field
                label="Correo opcional"
                error={errors.email?.message}
                input={<Input placeholder="cliente@email.com" {...register("email")} />}
              />
            </div>

            <Field
              label="Notas"
              error={errors.notes?.message}
              input={
                <Textarea
                  placeholder="Ej. Prefiere mensajes por WhatsApp, aprueba primero el diagnostico."
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
                {mode === "create" ? "Guardar cliente" : "Guardar cambios"}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/app/clients">Volver a clientes</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Vista rapida</Badge>
            <CardTitle className="text-white">
              {fullName || "Perfil del cliente"}
            </CardTitle>
            <CardDescription className="text-white/74">
              Este perfil luego concentrara vehiculos, presupuestos, ordenes y contexto de cobro.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["WhatsApp", whatsappPhone || "Pendiente"],
              ["Vehiculos", "Listos para vincular"],
              ["Historial", "Se activa al crear presupuestos y ordenes"],
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
                text: "Podras crear vehiculos directamente desde el detalle del cliente.",
              },
              {
                icon: <ReceiptText className="size-4" />,
                text: "Queda listo para el flujo de presupuestos de Sprint 3.",
              },
              {
                icon: <MessageCircleMore className="size-4" />,
                text: "WhatsApp se mantiene visible para operaciones rapidas.",
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
