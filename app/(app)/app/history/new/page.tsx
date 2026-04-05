import { PageHeader } from "@/components/shared/page-header";
import { OwnerServiceRecordForm } from "@/components/car-owners/owner-service-record-form";
import { buildOwnerServiceRecordDefaults } from "@/lib/car-owners/schema";
import { getCarOwnerAppointmentFormOptions, getCarOwnerVehicles } from "@/lib/data/car-owners";

export default async function OwnerHistoryNewPage() {
  const [vehicles, workshopOptions] = await Promise.all([
    getCarOwnerVehicles(),
    getCarOwnerAppointmentFormOptions(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agregar servicio"
        description="Guarda lo que se hizo, cuanto costo, que partes usaron y cualquier foto o nota importante."
        status="Historial"
      />
      <OwnerServiceRecordForm
        initialValues={buildOwnerServiceRecordDefaults({
          ownerVehicleId: vehicles[0]?.id ?? "",
        })}
        vehicleOptions={vehicles.map((item) => ({ id: item.id, label: item.label }))}
        workshopOptions={workshopOptions.workshops.map((item) => ({
          slug: item.slug,
          name: item.name,
          city: item.city,
        }))}
      />
    </div>
  );
}
