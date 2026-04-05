"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SendHorizontal, Star } from "lucide-react";

import { createOwnerReviewAction } from "@/app/actions/car-owners";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ownerReviewFormSchema, type OwnerReviewFormValues } from "@/lib/car-owners/schema";

type OwnerReviewFormProps = {
  workshopOptions: Array<{
    id: string;
    name: string;
  }>;
  vehicleOptions: Array<{
    id: string;
    label: string;
  }>;
};

export function OwnerReviewForm({ workshopOptions, vehicleOptions }: OwnerReviewFormProps) {
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number>(0);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OwnerReviewFormValues>({
    resolver: zodResolver(ownerReviewFormSchema),
    defaultValues: {
      workshopId: workshopOptions[0]?.id ?? "",
      ownerVehicleId: vehicleOptions[0]?.id ?? "",
      title: "",
      rating: 5,
      comment: "",
    },
  });

  const rating = watch("rating");

  const onSubmit = handleSubmit(async (values) => {
    const result = await createOwnerReviewAction(values);

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) {
          setError(field as keyof OwnerReviewFormValues, { message: messages[0] });
        }
      });

      return;
    }

    setFormMessage(result.message);
    reset({
      workshopId: workshopOptions[0]?.id ?? "",
      ownerVehicleId: vehicleOptions[0]?.id ?? "",
      title: "",
      rating: 5,
      comment: "",
    });
  });

  return (
    <Card className="bg-white/86">
      <CardHeader>
        <CardTitle>Dejar reseña</CardTitle>
        <CardDescription>
          Ayuda a otros conductores con una experiencia real y deja el taller mejor evaluado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <div className="text-sm font-medium text-[var(--foreground)]">Taller</div>
              <Select {...register("workshopId")}>
                {workshopOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
              {errors.workshopId?.message ? (
                <div className="text-sm text-[#b42318]">{errors.workshopId.message}</div>
              ) : null}
            </label>

            <label className="space-y-2">
              <div className="text-sm font-medium text-[var(--foreground)]">Carro</div>
              <Select {...register("ownerVehicleId")}>
                {vehicleOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
              {errors.ownerVehicleId?.message ? (
                <div className="text-sm text-[#b42318]">{errors.ownerVehicleId.message}</div>
              ) : null}
            </label>
          </div>

          <label className="space-y-2">
            <div className="text-sm font-medium text-[var(--foreground)]">Titulo</div>
            <Input placeholder="Ej. Atencion clara y buen seguimiento" {...register("title")} />
            {errors.title?.message ? <div className="text-sm text-[#b42318]">{errors.title.message}</div> : null}
          </label>

          <div className="space-y-2">
            <div className="text-sm font-medium text-[var(--foreground)]">Calificacion</div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => {
                const active = value <= (hoveredRating || rating);

                return (
                  <button
                    key={value}
                    className="rounded-full p-1"
                    onClick={() =>
                      setValue("rating", value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    onMouseEnter={() => setHoveredRating(value)}
                    onMouseLeave={() => setHoveredRating(0)}
                    type="button"
                  >
                    <Star
                      className={`size-6 ${active ? "fill-[var(--primary)] text-[var(--primary)]" : "text-[var(--line)]"}`}
                    />
                  </button>
                );
              })}
              <span className="text-sm text-[var(--muted)]">{rating} / 5</span>
            </div>
            {errors.rating?.message ? <div className="text-sm text-[#b42318]">{errors.rating.message}</div> : null}
          </div>

          <label className="space-y-2">
            <div className="text-sm font-medium text-[var(--foreground)]">Comentario</div>
            <Textarea placeholder="Cuenta como te fue con el servicio, la claridad y la entrega." {...register("comment")} />
            {errors.comment?.message ? <div className="text-sm text-[#b42318]">{errors.comment.message}</div> : null}
          </label>

          {formMessage ? (
            <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--secondary)]">
              {formMessage}
            </div>
          ) : null}

          <Button disabled={isSubmitting} type="submit" variant="primary">
            <SendHorizontal className="size-4" />
            Publicar reseña
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
