import { PageHeader } from "@/components/shared/page-header";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { getVehicleForEdit, getVehicleOwnerOptions } from "@/lib/data/vehicles";
import type { VehicleProfileFormValues } from "@/lib/vehicles/schema";

type EditVehiclePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditVehiclePage({ params }: EditVehiclePageProps) {
  const { id } = await params;
  const [detail, clientOptions] = await Promise.all([getVehicleForEdit(id), getVehicleOwnerOptions()]);
  const { vehicle, photos } = detail;

  const initialValues: VehicleProfileFormValues = {
    clientId: vehicle.client_id ?? "",
    make: vehicle.make ?? "",
    model: vehicle.model ?? "",
    year: vehicle.vehicle_year ? String(vehicle.vehicle_year) : "",
    plate: vehicle.plate ?? "",
    color: vehicle.color ?? "",
    mileage: vehicle.mileage ? String(vehicle.mileage) : "",
    vin: vehicle.vin ?? "",
    notes: vehicle.notes ?? "",
    photoUrls: photos.map((photo) => photo.photo_url),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar ${vehicle.vehicle_label || vehicle.plate || "vehiculo"}`}
        description="Ajusta la ficha tecnica sin romper su relacion con cliente, quotes y ordenes."
        status="Vehiculos"
      />
      <VehicleForm
        clientOptions={clientOptions}
        initialValues={initialValues}
        mode="edit"
        vehicleId={vehicle.id}
      />
    </div>
  );
}
