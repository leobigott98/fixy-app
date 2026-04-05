import { PageHeader } from "@/components/shared/page-header";
import { OwnerAppointmentForm } from "@/components/car-owners/owner-appointment-form";
import { buildOwnerAppointmentDefaults } from "@/lib/car-owners/schema";
import { getCarOwnerAppointmentFormOptions } from "@/lib/data/car-owners";

type OwnerAppointmentNewPageProps = {
  searchParams: Promise<{
    workshop?: string | string[];
    vehicle?: string | string[];
  }>;
};

function getFirstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OwnerAppointmentNewPage({ searchParams }: OwnerAppointmentNewPageProps) {
  const params = await searchParams;
  const workshop = getFirstParam(params.workshop);
  const vehicle = getFirstParam(params.vehicle);
  const options = await getCarOwnerAppointmentFormOptions(workshop);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitar cita"
        description="Escoge carro, taller y horario. Fixy deja la solicitud clara para que la respuesta sea mas rapida."
        status="Agenda"
      />
      <OwnerAppointmentForm
        initialValues={buildOwnerAppointmentDefaults({
          workshopSlug: options.preselectedWorkshopSlug || "",
          ownerVehicleId:
            vehicle && options.vehicles.some((item) => item.id === vehicle)
              ? vehicle
              : options.vehicles[0]?.id ?? "",
        })}
        vehicleOptions={options.vehicles.map((item) => ({ id: item.id, label: item.label }))}
        workshopOptions={options.workshops.map((item) => ({
          slug: item.slug,
          name: item.name,
          city: item.city,
        }))}
      />
    </div>
  );
}
