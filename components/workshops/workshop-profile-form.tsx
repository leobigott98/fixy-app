"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Camera,
  CheckCircle2,
  Clock3,
  Globe,
  ImagePlus,
  MapPin,
  MessageCircleMore,
  PhoneCall,
  ShieldCheck,
  Store,
} from "lucide-react";

import { saveWorkshopProfileAction } from "@/app/actions/workshops";
import { UploadPicker } from "@/components/uploads/upload-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  currencyDisplayOptions,
  openingDaysOptions,
  publicProfileVisibilityOptions,
  workshopServiceOptions,
  workshopTypeOptions,
} from "@/lib/workshops/constants";
import {
  buildWorkshopPublicPath,
  slugifyWorkshopPublicSlug,
  workshopProfileSchema,
  type WorkshopProfileInput,
} from "@/lib/workshops/schema";

type WorkshopProfileFormProps = {
  mode: "onboarding" | "settings";
  initialValues: WorkshopProfileInput;
};

export function WorkshopProfileForm({ mode, initialValues }: WorkshopProfileFormProps) {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [logoUrls, setLogoUrls] = useState<string[]>(
    initialValues.logoUrl ? [initialValues.logoUrl] : [],
  );
  const [galleryUrls, setGalleryUrls] = useState<string[]>(initialValues.galleryImageUrls);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<WorkshopProfileInput>({
    resolver: zodResolver(workshopProfileSchema),
    defaultValues: initialValues,
  });

  const workshopName = watch("workshopName");
  const workshopType = watch("workshopType");
  const bayCount = watch("bayCount");
  const city = watch("city");
  const whatsappPhone = watch("whatsappPhone");
  const openingDays = watch("openingDays");
  const opensAt = watch("opensAt");
  const closesAt = watch("closesAt");
  const publicDescription = watch("publicDescription");
  const publicAddress = watch("publicAddress");
  const publicContactPhone = watch("publicContactPhone");
  const publicContactEmail = watch("publicContactEmail");
  const publicSlugInput = watch("publicSlug");
  const publicServices = watch("publicServices");
  const profileVisibility = watch("profileVisibility");
  const logoUrl = logoUrls[0] ?? "";

  const resolvedPublicSlug = slugifyWorkshopPublicSlug(publicSlugInput || workshopName || "taller-fixy");
  const publicPath = buildWorkshopPublicPath(resolvedPublicSlug);
  const isPublicProfile = profileVisibility === "public";
  const visibleContactPhone = publicContactPhone || whatsappPhone;
  const previewDescription =
    publicDescription ||
    `Taller ${workshopType.toLowerCase()} con enfoque claro en servicio, comunicacion y confianza.`;

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveWorkshopProfileAction({
      ...values,
      galleryImageUrls: galleryUrls,
      logoUrl,
    });

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

  function toggleService(service: (typeof workshopServiceOptions)[number]) {
    const nextServices = publicServices.includes(service)
      ? publicServices.filter((item) => item !== service)
      : [...publicServices, service];

    setValue("publicServices", nextServices, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
      <Card className="bg-white/88">
        <CardHeader>
          <Badge variant="primary">{mode === "onboarding" ? "Paso 1" : "Perfil del taller"}</Badge>
          <CardTitle>
            {mode === "onboarding"
              ? "Configura la base operativa y publica"
              : "Actualiza la identidad operativa y el perfil publico"}
          </CardTitle>
          <CardDescription>
            Esta base deja el taller listo para operar hoy y para abrir un perfil publico util
            cuando llegue la capa de discovery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <SectionBlock
              eyebrow="Operacion"
              title="Datos principales del taller"
              description="Informacion que Fixy ya usa en dashboard, documentos y flujos internos."
            >
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
              </div>

              <UploadPicker
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                buttonLabel="Subir logo"
                error={errors.logoUrl?.message}
                helper="Opcional. Formatos permitidos: JPG, JPEG, PNG, WEBP o SVG."
                label="Logo del taller"
                maxFiles={1}
                onChange={setLogoUrls}
                scope="workshop_logo"
                values={logoUrls}
              />

              <UploadPicker
                accept="image/jpeg,image/png,image/webp"
                buttonLabel="Subir fotos"
                error={errors.galleryImageUrls?.message}
                helper="Muestra fachada, zona de trabajo o entregas reales. Hasta 8 imagenes."
                label="Fotos del taller"
                maxFiles={8}
                multiple
                onChange={setGalleryUrls}
                scope="workshop_gallery"
                values={galleryUrls}
              />
            </SectionBlock>

            <SectionBlock
              eyebrow="Perfil publico"
              title="Base publica del taller"
              description="No activa el marketplace completo. Solo prepara una ficha profesional, compartible y lista para discovery despues."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Visibilidad"
                  error={errors.profileVisibility?.message}
                  input={
                    <Select {...register("profileVisibility")}>
                      {publicProfileVisibilityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  }
                  helper={
                    publicProfileVisibilityOptions.find((option) => option.value === profileVisibility)
                      ?.description
                  }
                />
                <Field
                  label="Slug publico"
                  error={errors.publicSlug?.message}
                  input={<Input placeholder="ej. fixy-garage" {...register("publicSlug")} />}
                  helper={`Ruta prevista: ${publicPath}`}
                />
              </div>

              <Field
                label="Descripcion publica"
                error={errors.publicDescription?.message}
                input={
                  <Textarea
                    maxLength={320}
                    placeholder="Describe el tipo de trabajo, el enfoque del taller y lo que transmite confianza a un cliente nuevo."
                    {...register("publicDescription")}
                  />
                }
                helper="Maximo 320 caracteres. Debe sonar profesional y clara."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Direccion visible"
                  error={errors.publicAddress?.message}
                  input={
                    <Input
                      placeholder="Ej. Av. Principal de Los Ruices, local 4"
                      {...register("publicAddress")}
                    />
                  }
                  helper="Puedes usar una referencia corta. La ciudad sigue viniendo del perfil base."
                />
                <Field
                  label="Telefono publico"
                  error={errors.publicContactPhone?.message}
                  input={
                    <Input
                      placeholder="Si lo dejas vacio, se usa el WhatsApp del taller"
                      {...register("publicContactPhone")}
                    />
                  }
                />
                <Field
                  label="Correo publico"
                  error={errors.publicContactEmail?.message}
                  input={
                    <Input
                      placeholder="Ej. contacto@fixygarage.com"
                      {...register("publicContactEmail")}
                    />
                  }
                />
              </div>

              <div className="space-y-3 rounded-[28px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-[var(--foreground)]">
                      Servicios visibles
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      Selecciona la oferta base que quieres mostrar en la futura ficha publica.
                    </div>
                  </div>
                  <Badge>{publicServices.length}/8</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {workshopServiceOptions.map((service) => {
                    const selected = publicServices.includes(service);

                    return (
                      <button
                        key={service}
                        className={cn(
                          "rounded-full border px-3 py-2 text-sm font-medium transition",
                          selected
                            ? "border-[rgba(249,115,22,0.28)] bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]"
                            : "border-[var(--line)] bg-white text-[var(--muted)] hover:border-[rgba(21,28,35,0.16)] hover:text-[var(--foreground)]",
                        )}
                        onClick={() => toggleService(service)}
                        type="button"
                      >
                        {service}
                      </button>
                    );
                  })}
                </div>
                {errors.publicServices?.message ? (
                  <div className="text-sm text-[#b42318]">{errors.publicServices.message}</div>
                ) : null}
              </div>
            </SectionBlock>

            {formMessage ? (
              <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
                {formMessage}
              </div>
            ) : null}

            <Button
              className="w-full sm:w-auto"
              disabled={isSubmitting}
              type="submit"
              variant="primary"
            >
              {mode === "onboarding" ? "Guardar y entrar al dashboard" : "Guardar cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="mesh-panel subtle-grid overflow-hidden text-white">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isPublicProfile ? "success" : "dark"}>
                {isPublicProfile ? "Perfil publico" : "Perfil privado"}
              </Badge>
              <Badge variant="dark">
                {isPublicProfile ? "Verificacion pendiente" : "Listo para publicar"}
              </Badge>
            </div>
            <CardTitle className="text-white">Vista previa de la ficha publica</CardTitle>
            <CardDescription className="text-white/74">
              Profesional, confiable y preparada para futuras capas de listings, reviews y
              discovery.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[30px] border border-white/12 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-start gap-4">
                <div className="flex size-18 items-center justify-center overflow-hidden rounded-[24px] bg-white/10">
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
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                      {workshopName || "Tu taller"}
                    </div>
                    <Badge variant="dark">{workshopType}</Badge>
                  </div>
                  <p className="text-sm leading-6 text-white/78">{previewDescription}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-white/76">
                    <PreviewTag icon={<MapPin className="size-3.5" />}>
                      {publicAddress ? `${city} - ${publicAddress}` : city || "Ciudad por definir"}
                    </PreviewTag>
                    <PreviewTag icon={<Clock3 className="size-3.5" />}>
                      {openingDays} | {opensAt} a {closesAt}
                    </PreviewTag>
                    <PreviewTag icon={<Store className="size-3.5" />}>
                      {Number(bayCount) > 0 ? `${bayCount} puestos activos` : "Capacidad por definir"}
                    </PreviewTag>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="text-xs uppercase tracking-[0.22em] text-white/56">
                  Servicios visibles
                </div>
                <div className="flex flex-wrap gap-2">
                  {publicServices.map((service) => (
                    <div
                      key={service}
                      className="rounded-full border border-white/12 bg-white/8 px-3 py-2 text-sm"
                    >
                      {service}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Button className="justify-start" disabled type="button" variant="primary">
                  <PhoneCall className="size-4" />
                  {visibleContactPhone || "CTA de contacto"}
                </Button>
                <Button className="justify-start" disabled type="button" variant="secondary">
                  <MessageCircleMore className="size-4" />
                  WhatsApp directo
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <PreviewPanel
                icon={<Globe className="size-4" />}
                title="Ruta publica"
                text={publicPath}
              />
              <PreviewPanel
                icon={<ShieldCheck className="size-4" />}
                title="Verificacion"
                text="Placeholder listo para estado pendiente o verificado."
              />
              <PreviewPanel
                icon={<MapPin className="size-4" />}
                title="Contacto visible"
                text={
                  [
                    city,
                    visibleContactPhone,
                    publicContactEmail || "Correo opcional para leads",
                  ]
                    .filter(Boolean)
                    .join(" | ") || "Completa ubicacion y contacto"
                }
              />
              <PreviewPanel
                icon={<Clock3 className="size-4" />}
                title="Horario publico"
                text={`${openingDays} | ${opensAt} a ${closesAt}`}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/86">
          <CardContent className="space-y-4 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">
                <ImagePlus className="size-5" />
              </div>
              <div>
                <div className="font-semibold">Galeria publica</div>
                <div className="text-sm text-[var(--muted)]">
                  Sube fotos reales del taller para que el perfil publico transmita mas confianza.
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {galleryUrls.length
                ? galleryUrls.map((value) => (
                    <div
                      key={value}
                      className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.03)]"
                    >
                      <img
                        alt="Foto publica del taller"
                        className="h-36 w-full object-cover"
                        src={value}
                      />
                    </div>
                  ))
                : ["Fachada", "Zona de trabajo", "Entrega destacada"].map((item) => (
                    <div
                      key={item}
                      className="rounded-[24px] border border-dashed border-[var(--line)] bg-[rgba(21,28,35,0.03)] p-4"
                    >
                      <div className="text-sm font-medium">{item}</div>
                      <div className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        Sube fotos reales para darle contexto visual y mas confianza al perfil.
                      </div>
                    </div>
                  ))}
            </div>
            <div className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] px-4 py-3 text-sm text-[var(--muted)]">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--secondary)]" />
              La ficha publica se mantiene simple: sin ranking, sin reviews activas y sin flujo
              full marketplace por ahora.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SectionBlock({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-[28px] border border-[var(--line)] bg-[rgba(255,255,255,0.7)] p-4 sm:p-5">
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary-strong)]">
          {eyebrow}
        </div>
        <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
          {title}
        </div>
        <div className="max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  error,
  helper,
  input,
}: {
  label: string;
  error?: string;
  helper?: string;
  input: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <div className="text-sm font-medium text-[var(--foreground)]">{label}</div>
      {input}
      {helper ? <div className="text-xs leading-5 text-[var(--muted)]">{helper}</div> : null}
      {error ? <div className="text-sm text-[#b42318]">{error}</div> : null}
    </label>
  );
}

function PreviewTag({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5">
      {icon}
      <span>{children}</span>
    </div>
  );
}

function PreviewPanel({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/12 bg-white/8 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-white">
        {icon}
        {title}
      </div>
      <div className="mt-2 text-sm leading-6 text-white/72">{text}</div>
    </div>
  );
}
