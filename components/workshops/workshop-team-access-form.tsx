"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Phone, UserPlus } from "lucide-react";

import { inviteWorkshopMemberAction } from "@/app/actions/team";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { staffInviteRoleOptions } from "@/lib/permissions";
import {
  buildWorkshopTeamInviteDefaults,
  workshopTeamInviteSchema,
  type WorkshopTeamInviteValues,
} from "@/lib/team/schema";

type WorkshopTeamAccessFormProps = {
  mechanicOptions: Array<{
    id: string;
    label: string;
  }>;
};

export function WorkshopTeamAccessForm({ mechanicOptions }: WorkshopTeamAccessFormProps) {
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WorkshopTeamInviteValues>({
    resolver: zodResolver(workshopTeamInviteSchema),
    defaultValues: buildWorkshopTeamInviteDefaults(),
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await inviteWorkshopMemberAction(values);
    setFormMessage(result.message);

    if (!result.success) {
      Object.entries(result.fieldErrors ?? {}).forEach(([field, messages]) => {
        if (messages?.[0]) {
          setError(field as keyof WorkshopTeamInviteValues, { message: messages[0] });
        }
      });

      return;
    }

    reset(buildWorkshopTeamInviteDefaults());
  });

  return (
    <Card className="overflow-hidden bg-white/90">
      <CardHeader className="mesh-panel subtle-grid text-white">
        <Badge variant="dark">Acceso del equipo</Badge>
        <CardTitle className="text-white">Invita al personal del taller</CardTitle>
        <CardDescription className="text-white/72">
          El propietario define el rol, alcance y vinculacion operativa en una sola vista.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nombre"
              error={errors.fullName?.message}
              input={<Input placeholder="Ej. Carlos Medina" {...register("fullName")} />}
            />
            <Field
              label="Rol"
              error={errors.role?.message}
              input={
                <Select {...register("role")}>
                  {staffInviteRoleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              }
            />
            <Field
              label="Correo"
              error={errors.email?.message}
              input={<Input placeholder="persona@taller.com" {...register("email")} />}
            />
            <Field
              label="Telefono"
              error={errors.phone?.message}
              input={<Input placeholder="04141234567" {...register("phone")} />}
            />
          </div>

          <Field
            label="Perfil interno"
            error={errors.mechanicId?.message}
            input={
              <Select {...register("mechanicId")}>
                <option value="">Crear o dejar sin vincular</option>
                {mechanicOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            }
          />

          <Field
            label="Mensaje interno"
            error={errors.message?.message}
            input={
              <Textarea
                placeholder="Ej. Responsable del turno de la tarde y seguimiento de clientes."
                {...register("message")}
              />
            }
          />

          {formMessage ? (
            <div className="rounded-[18px] border border-[rgba(29,123,82,0.16)] bg-[rgba(29,123,82,0.08)] px-4 py-3 text-sm text-[var(--success)]">
              {formMessage}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button disabled={isSubmitting} type="submit" variant="primary">
              <UserPlus className="size-4" />
              Guardar invitacion
            </Button>
            <div className="rounded-[18px] border border-[var(--line)] bg-[#fbfaf7] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              Si existe un perfil operativo, se vincula para mostrar agenda, ordenes y comisiones.
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Tip icon={<Mail className="size-4" />} text="Correo y telefono pueden coexistir para que la persona use el que prefiera." />
            <Tip icon={<Phone className="size-4" />} text="Para mecanicos y jefes, Fixy deja lista la relacion con sus ordenes y agenda." />
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

function Tip({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex gap-3 rounded-[18px] border border-[var(--line)] bg-[#fbfaf7] p-4 text-sm leading-6">
      <span className="mt-0.5 shrink-0 text-[var(--primary-strong)]">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
