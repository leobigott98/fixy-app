import { AppointmentForm } from "@/components/calendar/appointment-form";
import { PageHeader } from "@/components/shared/page-header";
import {
  getAppointmentForEdit,
  getAppointmentFormOptions,
  requireAppointmentOrRedirect,
} from "@/lib/data/appointments";
import { buildAppointmentFormDefaults } from "@/lib/appointments/schema";

type EditAppointmentPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditAppointmentPage({
  params,
}: EditAppointmentPageProps) {
  const { id } = await params;
  await requireAppointmentOrRedirect(id);

  const [appointment, options] = await Promise.all([
    getAppointmentForEdit(id),
    getAppointmentFormOptions(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar cita"
        description="Actualiza fecha, estado o contexto de la cita sin romper la visibilidad del calendario."
        status="Calendario"
      />
      <AppointmentForm
        appointmentId={appointment.id}
        initialValues={buildAppointmentFormDefaults({
          clientId: appointment.client_id,
          vehicleId: appointment.vehicle_id,
          assignedMechanicId: appointment.assigned_mechanic_id,
          date: appointment.appointment_date,
          time: appointment.appointment_time.slice(0, 5),
          type: appointment.appointment_type,
          status: appointment.status,
          notes: appointment.notes,
        })}
        mode="edit"
        options={options}
      />
    </div>
  );
}
