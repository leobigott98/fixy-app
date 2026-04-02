import { Badge } from "@/components/ui/badge";
import { getQuoteStatusLabel, getQuoteStatusVariant, type QuoteRecord } from "@/lib/data/quotes";

type QuoteStatusBadgeProps = {
  status: QuoteRecord["status"];
};

export function QuoteStatusBadge({ status }: QuoteStatusBadgeProps) {
  return <Badge variant={getQuoteStatusVariant(status)}>{getQuoteStatusLabel(status)}</Badge>;
}
