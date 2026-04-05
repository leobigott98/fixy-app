"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, type ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CarFront, Camera, Gauge, ShieldCheck } from "lucide-react";

import { saveOwnerVehicleAction } from "@/app/actions/car-owners";
import { UploadPicker } from "@/components/uploads/upload-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ownerVehicleFormSchema, type OwnerVehicleFormValues } from "@/lib/car-owners/schema";

type OwnerVehicleFormProps = {
  mode: "create" | "edit";
  initialValues: OwnerVehicleFormValues;
  vehicleId?: string;
};

export function OwnerVehicleForm({ mode, initialValues, vehicleId }: OwnerVehicleFormProps) {
  const router = useRouter();
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialValues.photoUrls);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OwnerVehicleFormValues>({
    resolver: zodResolver(ownerVehicleFormSchema),
    defaultValues: initialValues,
  });

  const label = [watch("nickname"), watch("make"), watch("model"), watch("year")]
    .filter(Boolean)
    .join(" ");

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveOwnerVehicleAction(
      {
        ...values,
        photoUrls,
      },
      vehicleId,
    );

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) {
          setError(field as keyof OwnerVehicleFormValues, { message: messages[0] });
        }
      });

      return;
    }

    setFormMessage(result.message);

    startTransition(() => {
      router.push("/app/my-cars" as Route);
      router.refresh();
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="bg-white/88">
        <CardHeader>
          <Badge variant="primary">{mode === "create" ? "Nuevo carro" : "Editar carro"}</Badge>
          <CardTitle>
            {mode === "create"
              ? "Carga tu carro para pedir citas e ir armando su historial"
              : "Actualiza la ficha de tu carro"}
          </CardTitle>
          <CardDescription>
            La idea es que cada carro tenga fotos, contexto y trazabilidad propia dentro de Fixy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Alias opcional"
                error={errors.nickname?.message}
                input={<Input placeholder="Ej. El Corolla" {...register("nickname")} />}
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
                label="Año"
                error={errors.year?.message}
                input={<Input placeholder="Ej. 2014" {...register("year")} />}
              />
              <Field
                label="Color"
                error={errors.color?.message}
                input={<Input placeholder="Ej. Blanco" {...register("color")} />}
              />
              <Field
                label="Kilometraje"
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
                  placeholder="Ej. Usa aceite 5W-30, tiene golpe leve en la defensa trasera."
                  {...register("notes")}
                />
              }
            />

            <UploadPicker
              accept="image/jpeg,image/webp,image/png"
              buttonLabel="Subir fotos"
              canTakePhoto
              cameraLabel="Tomar foto"
              helper="Varias fotos ayudan para recepcion, evaluacion y memoria del carro."
              label="Fotos del carro"
              maxFiles={12}
              multiple
              onChange={setPhotoUrls}
              scope="owner_vehicle_photo"
              values={photoUrls}
            />

            {formMessage ? (
              <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
                {formMessage}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button disabled={isSubmitting} type="submit" variant="primary">
                {mode === "create" ? "Guardar carro" : "Guardar cambios"}
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href={"/app/my-cars" as Route}>Volver a mis carros</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="mesh-panel subtle-grid text-white">
          <CardHeader>
            <Badge variant="dark">Ficha rapida</Badge>
            <CardTitle className="text-white">{label || "Tu carro en Fixy"}</CardTitle>
            <CardDescription className="text-white/74">
              {watch("plate") || "Agrega la placa para ubicarlo mas rapido."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Fotos", photoUrls.length ? `${photoUrls.length} cargadas` : "Opcionales"],
              ["Kilometraje", watch("mileage") || "Sin registrar"],
              ["Color", watch("color") || "Sin registrar"],
              ["VIN", watch("vin") || "Opcional"],
            ].map(([labelText, value]) => (
              <div key={labelText} className="rounded-2xl bg-white/8 p-4">
                <div className="text-sm text-white/64">{labelText}</div>
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
                text: "Cada carro vive como una ficha separada para que no se mezcle el historial.",
              },
              {
                icon: <Gauge className="size-4" />,
                text: "Guardar kilometraje ayuda a ordenar mantenimientos y proximos servicios.",
              },
              {
                icon: <ShieldCheck className="size-4" />,
                text: "Fotos y notas dejan constancia practica del estado del carro.",
              },
              {
                icon: <Camera className="size-4" />,
                text: "Puedes tomar fotos desde el telefono sin salir del flujo.",
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
