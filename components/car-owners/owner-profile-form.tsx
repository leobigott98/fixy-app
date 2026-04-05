"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, type ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Phone, UserRound } from "lucide-react";

import { saveOwnerProfileAction } from "@/app/actions/car-owners";
import { UploadPicker } from "@/components/uploads/upload-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ownerPreferredContactOptions, ownerProfileFormSchema, type OwnerProfileFormValues } from "@/lib/car-owners/schema";

type OwnerProfileFormProps = {
  mode: "onboarding" | "settings";
  initialValues: OwnerProfileFormValues;
};

export function OwnerProfileForm({ mode, initialValues }: OwnerProfileFormProps) {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string[]>(initialValues.avatarUrl ? [initialValues.avatarUrl] : []);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OwnerProfileFormValues>({
    resolver: zodResolver(ownerProfileFormSchema),
    defaultValues: initialValues,
  });

  const fullName = watch("fullName");
  const city = watch("city");

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveOwnerProfileAction({
      ...values,
      avatarUrl: avatarUrl[0] ?? "",
    });

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) {
          setError(field as keyof OwnerProfileFormValues, { message: messages[0] });
        }
      });

      return;
    }

    setFormMessage(result.message);

    startTransition(() => {
      router.push((mode === "onboarding" ? "/app/garage" : "/app/profile") as Route);
      router.refresh();
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="bg-white/88">
        <CardHeader>
          <Badge variant="primary">{mode === "onboarding" ? "Tu cuenta" : "Mi perfil"}</Badge>
          <CardTitle>
            {mode === "onboarding"
              ? "Configura tu perfil para empezar a mover tus carros"
              : "Actualiza tu informacion y como quieres que te contacten"}
          </CardTitle>
          <CardDescription>
            Fixy usa este perfil para tus citas, tus reseñas y tu historial del carro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nombre completo"
                error={errors.fullName?.message}
                input={<Input placeholder="Ej. Andrea Perez" {...register("fullName")} />}
              />
              <Field
                label="Telefono"
                error={errors.phone?.message}
                input={<Input placeholder="Ej. 0414-1234567" {...register("phone")} />}
              />
              <Field
                label="Ciudad"
                error={errors.city?.message}
                input={<Input placeholder="Ej. Caracas" {...register("city")} />}
              />
              <Field
                label="Canal preferido"
                error={errors.preferredContact?.message}
                input={
                  <Select {...register("preferredContact")}>
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

            <UploadPicker
              accept="image/jpeg,image/webp,image/png"
              buttonLabel="Subir foto"
              canTakePhoto
              cameraLabel="Tomar foto"
              helper="Opcional. Tu foto ayuda a que talleres y citas se vean mas claras."
              label="Foto de perfil"
              maxFiles={1}
              multiple={false}
              onChange={setAvatarUrl}
              scope="owner_profile_photo"
              values={avatarUrl}
            />

            {formMessage ? (
              <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
                {formMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button disabled={isSubmitting} type="submit" variant="primary">
                {mode === "onboarding" ? "Entrar a mi garage" : "Guardar perfil"}
              </Button>
              {mode === "settings" ? (
                <Button asChild type="button" variant="outline">
                  <Link href={"/app/garage" as Route}>Volver</Link>
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Resumen</Badge>
            <CardTitle className="text-white">{fullName || "Tu perfil Fixy"}</CardTitle>
            <CardDescription className="text-white/74">
              {city || "Agrega tu ciudad para ver talleres cercanos con mejor contexto."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Perfil", fullName || "Pendiente"],
              ["Contacto", watch("phone") || "Pendiente"],
              [
                "Canal",
                watch("preferredContact") === "whatsapp"
                  ? "WhatsApp"
                  : watch("preferredContact") === "llamada"
                    ? "Llamada"
                    : "Correo",
              ],
              ["Foto", avatarUrl.length ? "Lista" : "Opcional"],
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
                icon: <UserRound className="size-4" />,
                text: "Un solo perfil para tus carros, historial y reseñas.",
              },
              {
                icon: <Phone className="size-4" />,
                text: "El canal preferido acelera respuestas cuando pides cita.",
              },
              {
                icon: <Camera className="size-4" />,
                text: "La foto de perfil ayuda a darle contexto humano a la cuenta.",
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
