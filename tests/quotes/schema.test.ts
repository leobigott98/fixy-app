import { deepStrictEqual } from "node:assert/strict";
import { test } from "node:test";

import {
  calculateQuoteTotals,
  type QuoteItemInput,
} from "@/lib/quotes/schema";

test("calculateQuoteTotals suma mano de obra y repuestos", () => {
  const laborItems: QuoteItemInput[] = [
    {
      itemType: "labor",
      description: "Diagnostico",
      quantity: 1.5,
      unitPrice: 80,
      lineTotal: 120,
      sortOrder: 0,
    },
    {
      itemType: "labor",
      description: "Ajuste",
      quantity: 1,
      unitPrice: 35.5,
      lineTotal: 35.5,
      sortOrder: 1,
    },
  ];
  const partItems: QuoteItemInput[] = [
    {
      itemType: "part",
      inventoryItemId: "inventory-item-1",
      description: "Filtro",
      quantity: 1,
      unitPrice: 49.99,
      lineTotal: 49.99,
      sortOrder: 0,
    },
  ];

  deepStrictEqual(calculateQuoteTotals(laborItems, partItems), {
    laborSubtotal: 155.5,
    partsSubtotal: 49.99,
    subtotal: 205.49,
    total: 205.49,
  });
});
