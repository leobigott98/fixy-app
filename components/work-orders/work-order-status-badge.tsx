import { Badge } from "@/components/ui/badge";
import { getWorkOrderStatusLabel, getWorkOrderStatusVariant, type WorkOrderRecord } from "@/lib/data/work-orders";

type WorkOrderStatusBadgeProps = {
  status: WorkOrderRecord["status"];
};

export function WorkOrderStatusBadge({ status }: WorkOrderStatusBadgeProps) {
  return <Badge variant={getWorkOrderStatusVariant(status)}>{getWorkOrderStatusLabel(status)}</Badge>;
}
