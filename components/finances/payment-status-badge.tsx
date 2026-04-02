import { Badge } from "@/components/ui/badge";
import { getPaymentStatusLabel, type PaymentStatus } from "@/lib/finances/constants";

type PaymentStatusBadgeProps = {
  status: PaymentStatus;
};

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const variant =
    status === "paid" ? "success" : status === "partial" || status === "overdue" ? "primary" : "default";

  return <Badge variant={variant}>{getPaymentStatusLabel(status)}</Badge>;
}
