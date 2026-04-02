"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRound } from "lucide-react";

import { saveMechanicAction } from "@/app/actions/mechanics";
import { UploadPicker } from "@/components/uploads/upload-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { mechanicRoleOptions } from "@/lib/mechanics/constants";
import { mechanicProfileSchema, type MechanicProfileValues } from "@/lib/mechanics/schema";

type MechanicFormProps = {
  initialValues: MechanicProfileValues;
  mode: "create" | "edit";
  mechanicId?: string;
};

export function MechanicForm({ initialValues, mode, mechanicId }: MechanicFormProps) {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialValues.photoUrl ? [initialValues.photoUrl] : []);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MechanicProfileValues>({
    resolver: zodResolver(mechanicProfileSchema),
    defaultValues: initialValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveMechanicAction(
      {
        ...values,
        photoUrl: photoUrls[0] ?? "",
      },
      mechanicId,
    );

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) {
          setError(field as keyof MechanicProfileValues, { message: messages[0] });
        }
      });

      return;
    }

    setFormMessage(result.message);

    startTransition(() => {
      router.push(`/app/mechanics/${result.mechanicId}` as Route);
      router.refresh();
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="bg-white/88">
        <CardHeader>
          <Badge variant="primary">{mode === "create" ? "Nuevo integrante" : "Editar integrante"}</Badge>
          <CardTitle>
            {mode === "create" ? "Equipo ligero, enfocado en asignacion" : "Actualiza el perfil del integrante"}
          </CardTitle>
          <CardDescription>
            Pensado para ver carga, asignar ordenes y mantener el taller claro, no para construir RRHH.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nombre completo"
                error={errors.fullName?.message}
                input={<Input placeholder="Ej. Carlos Medina" {...register("fullName")} />}
              />
              <Field
                label="Telefono"
                error={errors.phone?.message}
                input={<Input placeholder="Opcional" {...register("phone")} />}
              />
              <Field
                label="Rol"
                error={errors.role?.message}
                input={
                  <Select {...register("role")}>
                    {mechanicRoleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                }
              />
              <label className="space-y-3">
                <div className="text-sm font-medium text-[var(--foreground)]">Activo</div>
                <label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] px-4 py-3 text-sm">
                  <input className="size-4" type="checkbox" {...register("isActive")} />
                  Disponible para asignacion en ordenes
                </label>
                {errors.isActive?.message ? <div className="text-sm text-[#b42318]">{errors.isActive.message}</div> : null}
              </label>
            </div>

            <Field
              label="Notas"
              error={errors.notes?.message}
              input={<Textarea placeholder="Ej. Especialista en suspension, atiende recepcion o apoya diagnosticos." {...register("notes")} />}
            />

            <UploadPicker
              accept="image/jpeg,image/webp,image/png"
              buttonLabel="Subir foto"
              canTakePhoto
              cameraLabel="Tomar foto"
              error={errors.photoUrl?.message}
              helper="Opcional. Sirve para reconocer rapido al responsable desde el taller."
              label="Foto"
              maxFiles={1}
              onChange={setPhotoUrls}
              scope="mechanic_photo"
              values={photoUrls}
            />

            {formMessage ? (
              <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
                {formMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button disabled={isSubmitting} type="submit" variant="primary">
                {mode === "create" ? "Guardar integrante" : "Guardar cambios"}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/app/mechanics">Volver al equipo</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Asignacion</Badge>
            <CardTitle className="text-white">Perfil listo para carga de trabajo</CardTitle>
            <CardDescription className="text-white/74">
              La ficha queda preparada para asignacion, comisiones y permisos mas adelante.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryRow label="Rol" value={mechanicRoleOptions.find((option) => option.value === (initialValues.role ?? "mecanico"))?.label ?? "Mecanico"} />
            <SummaryRow label="Estado" value={initialValues.isActive ? "Activo" : "Inactivo"} />
            <SummaryRow label="Foto" value={photoUrls.length ? "Cargada" : "Opcional"} />
          </CardContent>
        </Card>

        <Card className="bg-white/86">
          <CardContent className="space-y-3 px-5 py-5">
            {[
              "Este modulo solo resuelve visibilidad y asignacion del taller.",
              "El rol deja la base lista para permisos futuros sin implementarlos todavia.",
              "La foto ayuda a reconocer responsables rapido en mobile.",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6">
                <UserRound className="mt-0.5 size-4 shrink-0 text-[var(--primary-strong)]" />
                <span>{item}</span>
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
