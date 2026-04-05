"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageCircleMore, SendHorizontal } from "lucide-react";

import { submitMarketplaceInquiryAction } from "@/app/actions/marketplace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  marketplaceInquirySchema,
  marketplaceInquiryServiceOptions,
  marketplacePreferredContactOptions,
  type MarketplaceInquiryInput,
} from "@/lib/marketplace/schema";

type WorkshopInquiryFormProps = {
  workshopSlug: string;
  workshopName: string;
  defaultService?: string;
};

export function WorkshopInquiryForm({
  workshopSlug,
  workshopName,
  defaultService,
}: WorkshopInquiryFormProps) {
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [whatsappHref, setWhatsappHref] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MarketplaceInquiryInput>({
    resolver: zodResolver(marketplaceInquirySchema),
    defaultValues: {
      requesterName: "",
      requesterPhone: "",
      requesterCity: "",
      requestedService: marketplaceInquiryServiceOptions.includes(
        defaultService as (typeof marketplaceInquiryServiceOptions)[number],
      )
        ? (defaultService as (typeof marketplaceInquiryServiceOptions)[number])
        : "Diagnostico general",
      vehicleReference: "",
      preferredContact: "whatsapp",
      message: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await submitMarketplaceInquiryAction(workshopSlug, values);

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (!messages?.[0]) {
          return;
        }

        setError(field as keyof MarketplaceInquiryInput, {
          message: messages[0],
        });
      });

      return;
    }

    setFormMessage(result.message);
    setWhatsappHref(result.whatsappHref);
    reset({
      requesterName: "",
      requesterPhone: "",
      requesterCity: "",
      requestedService: marketplaceInquiryServiceOptions.includes(
        defaultService as (typeof marketplaceInquiryServiceOptions)[number],
      )
        ? (defaultService as (typeof marketplaceInquiryServiceOptions)[number])
        : "Diagnostico general",
      vehicleReference: "",
      preferredContact: "whatsapp",
      message: "",
    });
  });

  return (
    <Card className="bg-white/92" id="solicitar">
      <CardHeader>
        <CardTitle>Solicitar atencion</CardTitle>
        <CardDescription>
          Deja tu solicitud para {workshopName}. Fixy prioriza leads claros y contacto directo,
          sin pagos ni flujos pesados todavia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              error={errors.requesterName?.message}
              label="Nombre"
              input={<Input placeholder="Ej. Andrea Perez" {...register("requesterName")} />}
            />
            <Field
              error={errors.requesterPhone?.message}
              label="Telefono o WhatsApp"
              input={<Input placeholder="Ej. 0414-1234567" {...register("requesterPhone")} />}
            />
            <Field
              error={errors.requesterCity?.message}
              label="Ubicacion"
              input={<Input placeholder="Ej. Caracas" {...register("requesterCity")} />}
            />
            <Field
              error={errors.requestedService?.message}
              label="Servicio que necesitas"
              input={
                <Select {...register("requestedService")}>
                  {marketplaceInquiryServiceOptions.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </Select>
              }
            />
            <Field
              error={errors.vehicleReference?.message}
              label="Vehiculo"
              input={
                <Input
                  placeholder="Ej. Toyota Corolla 2012"
                  {...register("vehicleReference")}
                />
              }
            />
            <Field
              error={errors.preferredContact?.message}
              label="Contacto preferido"
              input={
                <Select {...register("preferredContact")}>
                  {marketplacePreferredContactOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "whatsapp" ? "WhatsApp" : "Llamada"}
                    </option>
                  ))}
                </Select>
              }
            />
          </div>

          <Field
            error={errors.message?.message}
            label="Que necesitas resolver"
            input={
              <Textarea
                placeholder="Describe la falla, el mantenimiento o lo que te gustaria cotizar."
                {...register("message")}
              />
            }
          />

          {formMessage ? (
            <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm leading-6 text-[var(--secondary)]">
              {formMessage}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={isSubmitting} type="submit" variant="primary">
              <SendHorizontal className="size-4" />
              Enviar solicitud
            </Button>
            {whatsappHref ? (
              <Button asChild type="button" variant="secondary">
                <a href={whatsappHref} rel="noreferrer" target="_blank">
                  <MessageCircleMore className="size-4" />
                  Reforzar por WhatsApp
                </a>
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
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
