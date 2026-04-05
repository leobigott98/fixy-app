import { PageHeader } from "@/components/shared/page-header";
import { OwnerVehicleForm } from "@/components/car-owners/owner-vehicle-form";
import { buildOwnerVehicleDefaults } from "@/lib/car-owners/schema";

export default function OwnerVehicleNewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Agregar carro"
        description="Carga los datos base del carro para que Fixy pueda conectar citas, historial y reseñas."
        status="Garage"
      />
      <OwnerVehicleForm initialValues={buildOwnerVehicleDefaults()} mode="create" />
    </div>
  );
}
