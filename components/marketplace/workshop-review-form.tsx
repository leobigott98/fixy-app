"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SendHorizontal, Star } from "lucide-react";

import { submitMarketplaceReviewAction } from "@/app/actions/marketplace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  marketplaceReviewSchema,
  type MarketplaceReviewInput,
} from "@/lib/marketplace/schema";

type WorkshopReviewFormProps = {
  workshopSlug: string;
  workshopName: string;
};

export function WorkshopReviewForm({
  workshopSlug,
  workshopName,
}: WorkshopReviewFormProps) {
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
  } = useForm<MarketplaceReviewInput>({
    resolver: zodResolver(marketplaceReviewSchema),
    defaultValues: {
      reviewerName: "",
      title: "",
      rating: 5,
      comment: "",
    },
  });

  const rating = watch("rating");

  const onSubmit = handleSubmit(async (values) => {
    const result = await submitMarketplaceReviewAction(workshopSlug, values);

    if (!result.success) {
      setFormMessage(result.message);

      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (!messages?.[0]) {
          return;
        }

        setError(field as keyof MarketplaceReviewInput, {
          message: messages[0],
        });
      });

      return;
    }

    setFormMessage(result.message);
    reset({
      reviewerName: "",
      title: "",
      rating: 5,
      comment: "",
    });
  });

  return (
    <Card className="bg-white/92">
      <CardHeader>
        <CardTitle>Dejar resena</CardTitle>
        <CardDescription>
          Comparte tu experiencia con {workshopName}. La idea es ayudar a otros conductores con
          contexto real y comentarios claros.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field
            error={errors.reviewerName?.message}
            label="Tu nombre"
            input={<Input placeholder="Ej. Maria Gonzalez" {...register("reviewerName")} />}
          />

          <Field
            error={errors.title?.message}
            label="Titulo"
            input={<Input placeholder="Ej. Buena atencion y entrega puntual" {...register("title")} />}
          />

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
            {errors.rating?.message ? (
              <div className="text-sm text-[#b42318]">{errors.rating.message}</div>
            ) : null}
          </div>

          <Field
            error={errors.comment?.message}
            label="Comentario"
            input={
              <Textarea
                placeholder="Cuenta como fue la atencion, el servicio, la claridad o la entrega."
                {...register("comment")}
              />
            }
          />

          {formMessage ? (
            <div className="rounded-2xl border border-[rgba(15,118,110,0.16)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm leading-6 text-[var(--secondary)]">
              {formMessage}
            </div>
          ) : null}

          <Button disabled={isSubmitting} type="submit" variant="primary">
            <SendHorizontal className="size-4" />
            Publicar resena
          </Button>
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
  input: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <div className="text-sm font-medium text-[var(--foreground)]">{label}</div>
      {input}
      {error ? <div className="text-sm text-[#b42318]">{error}</div> : null}
    </label>
  );
}
