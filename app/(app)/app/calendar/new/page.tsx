import { AppointmentForm } from "@/components/calendar/appointment-form";
import { PageHeader } from "@/components/shared/page-header";
import { getAppointmentFormOptions } from "@/lib/data/appointments";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import { buildAppointmentFormDefaults } from "@/lib/appointments/schema";

type NewAppointmentPageProps = {
  searchParams: Promise<{
    date?: string | string[];
  }>;
};

function getQueryValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewAppointmentPage({
  searchParams,
}: NewAppointmentPageProps) {
  await requireCurrentWorkshop();
  const params = await searchParams;
  const options = await getAppointmentFormOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nueva cita"
        description="Agenda un ingreso de servicio o una visita del taller con contexto claro desde el inicio."
        status="Calendario"
      />
      <AppointmentForm
        initialValues={buildAppointmentFormDefaults({
          date: getQueryValue(params.date),
        })}
        mode="create"
        options={options}
      />
    </div>
  );
}
