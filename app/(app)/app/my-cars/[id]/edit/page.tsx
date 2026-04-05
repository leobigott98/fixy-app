import { notFound } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { OwnerVehicleForm } from "@/components/car-owners/owner-vehicle-form";
import { buildOwnerVehicleDefaults } from "@/lib/car-owners/schema";
import { getCarOwnerVehicleById } from "@/lib/data/car-owners";

type OwnerVehicleEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OwnerVehicleEditPage({ params }: OwnerVehicleEditPageProps) {
  const { id } = await params;
  const vehicle = await getCarOwnerVehicleById(id);

  if (!vehicle) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editar ${vehicle.label}`}
        description="Ajusta la ficha del carro para mantenerla util cuando pides atencion o guardas servicios."
        status="Garage"
      />
      <OwnerVehicleForm
        initialValues={buildOwnerVehicleDefaults({
          nickname: vehicle.nickname ?? "",
          plate: vehicle.plate ?? "",
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.vehicleYear ? String(vehicle.vehicleYear) : "",
          color: vehicle.color ?? "",
          mileage: vehicle.mileage ? String(vehicle.mileage) : "",
          vin: vehicle.vin ?? "",
          notes: vehicle.notes ?? "",
          photoUrls: vehicle.photoUrls,
        })}
        mode="edit"
        vehicleId={vehicle.id}
      />
    </div>
  );
}
