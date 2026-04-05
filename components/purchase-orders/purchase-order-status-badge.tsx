import { Badge } from "@/components/ui/badge";
import {
  getPurchaseOrderStatusLabel,
  type PurchaseOrderStatus,
} from "@/lib/purchase-orders/constants";

export function PurchaseOrderStatusBadge({
  status,
}: {
  status: PurchaseOrderStatus;
}) {
  if (status === "received") {
    return <Badge variant="success">{getPurchaseOrderStatusLabel(status)}</Badge>;
  }

  if (status === "sent") {
    return <Badge variant="primary">{getPurchaseOrderStatusLabel(status)}</Badge>;
  }

  return <Badge>{getPurchaseOrderStatusLabel(status)}</Badge>;
}
