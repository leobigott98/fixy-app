import { MessageSquareText, Star } from "lucide-react";

import { respondToWorkshopReviewAction } from "@/app/actions/marketplace";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getWorkshopReviewsForAdmin } from "@/lib/data/marketplace";
import { requireCurrentWorkshop } from "@/lib/data/workshops";

function formatDate(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Date(value).toLocaleDateString("es-VE", {
    dateStyle: "medium",
  });
}

export default async function ReviewsPage() {
  const workshop = await requireCurrentWorkshop();
  const reviews = await getWorkshopReviewsForAdmin(workshop.id);
  const average =
    reviews.length > 0
      ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1))
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resenas y comentarios"
        description="Gestiona lo que los clientes publican en tu perfil y responde desde Fixy con contexto y tono profesional."
        status="Reputacion"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Resenas totales" value={String(reviews.length)} />
        <SummaryCard label="Promedio" value={average ? `${average} / 5` : "Sin datos"} tone="primary" />
        <SummaryCard
          label="Con respuesta"
          value={String(reviews.filter((review) => review.workshopResponse).length)}
          tone="success"
        />
      </div>

      <div className="space-y-4">
        {reviews.length ? (
          reviews.map((review) => {
            const action = respondToWorkshopReviewAction.bind(null, review.id);

            return (
              <Card key={review.id} className="bg-white/88">
                <CardContent className="space-y-4 px-5 py-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                          {review.title}
                        </div>
                        <Badge variant="primary">{`${review.rating} / 5`}</Badge>
                        {review.workshopResponse ? <Badge variant="success">Respondida</Badge> : <Badge>Pendiente de respuesta</Badge>}
                      </div>
                      <div className="text-sm text-[var(--muted)]">
                        {review.reviewerName} | {formatDate(review.publishedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[var(--primary)]">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={`${review.id}-${index}`}
                          className={`size-4 ${index < review.rating ? "fill-current" : ""}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[var(--line)] bg-[rgba(21,28,35,0.02)] p-4 text-sm leading-6 text-[var(--foreground)]">
                    {review.comment || "Sin comentario adicional."}
                  </div>

                  {review.workshopResponse ? (
                    <div className="rounded-[24px] border border-[rgba(15,118,110,0.14)] bg-[rgba(15,118,110,0.08)] p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-[var(--secondary)]">
                        <MessageSquareText className="size-4" />
                        Respuesta del taller
                      </div>
                      <div className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                        {review.workshopResponse}
                      </div>
                      <div className="mt-2 text-xs text-[var(--muted)]">
                        Actualizada el {formatDate(review.workshopResponseAt)}
                      </div>
                    </div>
                  ) : null}

                  <form action={action} className="space-y-3">
                    <div className="text-sm font-medium text-[var(--foreground)]">
                      {review.workshopResponse ? "Actualizar respuesta" : "Responder como taller"}
                    </div>
                    <Textarea
                      defaultValue={review.workshopResponse ?? ""}
                      name="response"
                      placeholder="Agradece la resena y agrega una respuesta clara y profesional."
                    />
                    <Button type="submit" variant="primary">
                      Guardar respuesta
                    </Button>
                  </form>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="bg-white/88">
            <CardContent className="space-y-3 px-5 py-8 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-[20px] bg-[rgba(249,115,22,0.12)] text-[var(--primary-strong)]">
                <Star className="size-6" />
              </div>
              <div className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
                Aun no tienes resenas publicas
              </div>
              <div className="mx-auto max-w-xl text-sm leading-6 text-[var(--muted)]">
                Cuando un cliente publique una resena en tu perfil, aparecera aqui para que puedas
                responderla desde el panel del taller.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "success";
}) {
  return (
    <Card className="bg-white/88">
      <CardContent className="space-y-2 px-5 py-5">
        <div className="text-sm text-[var(--muted)]">{label}</div>
        <div className="font-[family-name:var(--font-heading)] text-3xl font-bold tracking-tight">
          {value}
        </div>
        <Badge variant={tone === "default" ? undefined : tone}>{label}</Badge>
      </CardContent>
    </Card>
  );
}
