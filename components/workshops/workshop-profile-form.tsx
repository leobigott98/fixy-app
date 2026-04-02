"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, CheckCircle2, Clock3, Store } from "lucide-react";

import { saveWorkshopProfileAction } from "@/app/actions/workshops";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { currencyDisplayOptions, openingDaysOptions, workshopTypeOptions } from "@/lib/workshops/constants";
import { workshopProfileSchema, type WorkshopProfileInput } from "@/lib/workshops/schema";

type WorkshopProfileFormProps = {
  mode: "onboarding" | "settings";
  initialValues: WorkshopProfileInput;
};

export function WorkshopProfileForm({ mode, initialValues }: WorkshopProfileFormProps) {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WorkshopProfileInput>({
    resolver: zodResolver(workshopProfileSchema),
    defaultValues: initialValues,
  });

  const logoUrl = watch("logoUrl");
  const workshopName = watch("workshopName");
  const bayCount = watch("bayCount");

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveWorkshopProfileAction(values);

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (!messages?.[0]) {
          return;
        }

        setError(field as keyof WorkshopProfileInput, {
          message: messages[0],
        });
      });

      return;
    }

    setFormMessage(result.message);

    startTransition(() => {
      router.push(mode === "onboarding" ? "/app/dashboard" : "/app/settings");
      router.refresh();
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="bg-white/88">
        <CardHeader>
          <Badge variant="primary">{mode === "onboarding" ? "Paso 1" : "Perfil del taller"}</Badge>
          <CardTitle>
            {mode === "onboarding"
              ? "Configura la base de tu taller"
              : "Actualiza la informacion principal del taller"}
          </CardTitle>
          <CardDescription>
            Guarda la informacion operativa que alimenta dashboard, identidad del taller y
            proximos modulos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nombre del taller"
                error={errors.workshopName?.message}
                input={<Input placeholder="Ej. Fixy Garage" {...register("workshopName")} />}
              />
              <Field
                label="Encargado o admin"
                error={errors.ownerName?.message}
                input={<Input placeholder="Ej. Luis Mendoza" {...register("ownerName")} />}
              />
              <Field
                label="Telefono / WhatsApp"
                error={errors.whatsappPhone?.message}
                input={<Input placeholder="Ej. 0414-1234567" {...register("whatsappPhone")} />}
              />
              <Field
                label="Ciudad o zona"
                error={errors.city?.message}
                input={<Input placeholder="Ej. Caracas, Los Ruices" {...register("city")} />}
              />
              <Field
                label="Tipo de taller"
                error={errors.workshopType?.message}
                input={
                  <Select {...register("workshopType")}>
                    <option value="">Selecciona una opcion</option>
                    {workshopTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                }
              />
              <Field
                label="Moneda preferida"
                error={errors.currencyDisplay?.message}
                input={
                  <Select {...register("currencyDisplay")}>
                    <option value="">Selecciona una opcion</option>
                    {currencyDisplayOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                }
              />
            </div>

            <div className="grid gap-4 rounded-[28px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 sm:grid-cols-3">
              <Field
                label="Dias de trabajo"
                error={errors.openingDays?.message}
                input={
                  <Select {...register("openingDays")}>
                    <option value="">Selecciona una opcion</option>
                    {openingDaysOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                }
              />
              <Field
                label="Abre a las"
                error={errors.opensAt?.message}
                input={<Input type="time" {...register("opensAt")} />}
              />
              <Field
                label="Cierra a las"
                error={errors.closesAt?.message}
                input={<Input type="time" {...register("closesAt")} />}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Puestos o bahias disponibles"
                error={errors.bayCount?.message}
                input={
                  <Input
                    min={1}
                    type="number"
                    {...register("bayCount", { valueAsNumber: true })}
                  />
                }
              />
              <Field
                label="Logo URL opcional"
                error={errors.logoUrl?.message}
                input={<Input placeholder="https://..." {...register("logoUrl")} />}
              />
            </div>

            {formMessage ? (
              <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
                {formMessage}
              </div>
            ) : null}

            <Button className="w-full sm:w-auto" disabled={isSubmitting} type="submit" variant="primary">
              {mode === "onboarding" ? "Guardar y entrar al dashboard" : "Guardar cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Vista previa</Badge>
            <CardTitle className="text-white">Asi se vera tu base operativa</CardTitle>
            <CardDescription className="text-white/74">
              Fixy arranca con identidad clara, capacidad visible y datos listos para dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 rounded-[28px] bg-white/8 p-4">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-[22px] bg-white/10">
                {logoUrl ? (
                  <img
                    alt={workshopName || "Logo del taller"}
                    className="size-full object-cover"
                    src={logoUrl}
                  />
                ) : (
                  <Camera className="size-6 text-white/70" />
                )}
              </div>
              <div>
                <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                  {workshopName || "Tu taller"}
                </div>
                <div className="text-sm text-white/72">
                  {Number(bayCount) > 0 ? `${bayCount} puestos disponibles` : "Define tu capacidad inicial"}
                </div>
              </div>
            </div>

            {[
              "Dashboard con KPIs claros y espacio operativo real.",
              "Perfil del taller listo para clientes, vehiculos y presupuestos.",
              "Base preparada para branding, WhatsApp y seguimiento diario.",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl bg-white/8 p-4 text-sm leading-6">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-white" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white/86">
          <CardContent className="space-y-3 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">
                <Store className="size-5" />
              </div>
              <div>
                <div className="font-semibold">Primer setup practico</div>
                <div className="text-sm text-[var(--muted)]">
                  Lo justo para operar mejor sin caer en complejidad innecesaria.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] px-4 py-3 text-sm text-[var(--muted)]">
              <Clock3 className="size-4 text-[var(--primary-strong)]" />
              Luego seguimos con clientes, vehiculos, presupuestos y ordenes reales.
            </div>
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
