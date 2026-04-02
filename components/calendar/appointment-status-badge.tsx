import { Badge } from "@/components/ui/badge";
import { getAppointmentStatusLabel, type AppointmentStatus } from "@/lib/appointments/constants";

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  if (status === "confirmada" || status === "completada") {
    return <Badge variant="success">{getAppointmentStatusLabel(status)}</Badge>;
  }

  if (status === "pendiente") {
    return <Badge variant="primary">{getAppointmentStatusLabel(status)}</Badge>;
  }

  return <Badge>{getAppointmentStatusLabel(status)}</Badge>;
}
