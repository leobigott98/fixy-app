import { createSupabaseDataClient, isMissingRelationError } from "@/lib/data/core";
import { requireCurrentWorkshop } from "@/lib/data/workshops";

type PaymentRow = {
  amount: number | string | null;
  status: string | null;
  paid_at: string | null;
  work_order_id: string | null;
};

type WorkOrderRow = {
  id: string;
  status: string;
  total_amount: number | string | null;
  promised_date: string | null;
};

type InventoryRow = {
  id: string;
  stock_quantity: number | string | null;
  low_stock_threshold: number | string | null;
};

type QuoteRow = {
  id: string;
  status: string;
};

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export type ReportsOverviewData = {
  metrics: {
    activeWorkOrders: number;
    completedWorkOrders: number;
    revenueThisMonth: number;
    pendingBalances: number;
    lowStockCount: number;
  };
  funnel: {
    quotesPending: number;
    quotesApproved: number;
    purchaseOrdersOpen: number;
    purchaseOrdersReceived: number;
  };
  collections: {
    overdueCount: number;
    pendingOrderCount: number;
  };
};

export async function getReportsOverview(): Promise<ReportsOverviewData> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();
  const monthStart = getMonthStart();
  const today = new Date();

  const [
    workOrdersResult,
    paymentsResult,
    inventoryResult,
    quotesResult,
    purchaseOrdersResult,
  ] = await Promise.all([
    supabase
      .from("work_orders")
      .select("id,status,total_amount,promised_date")
      .eq("workshop_id", workshop.id)
      .neq("status", "cancelada"),
    supabase
      .from("payments")
      .select("amount,status,paid_at,work_order_id")
      .eq("workshop_id", workshop.id),
    supabase
      .from("inventory_items")
      .select("id,stock_quantity,low_stock_threshold")
      .eq("workshop_id", workshop.id),
    supabase.from("quotes").select("id,status").eq("workshop_id", workshop.id).is("deleted_at", null),
    supabase.from("purchase_orders").select("id,status").eq("workshop_id", workshop.id),
  ]);

  const error = [
    workOrdersResult.error,
    paymentsResult.error,
    inventoryResult.error,
    quotesResult.error,
    purchaseOrdersResult.error,
  ].find((item) => item && !isMissingRelationError(item));

  if (error) {
    throw error;
  }

  const workOrders = (workOrdersResult.data as WorkOrderRow[] | null) ?? [];
  const payments = (paymentsResult.data as PaymentRow[] | null) ?? [];
  const inventory = (inventoryResult.data as InventoryRow[] | null) ?? [];
  const quotes = (quotesResult.data as QuoteRow[] | null) ?? [];
  const purchaseOrders =
    ((purchaseOrdersResult.data as Array<{ id: string; status: string }> | null) ?? []);

  const collectedByWorkOrder = payments.reduce<Record<string, number>>((acc, payment) => {
    if (payment.work_order_id && ["paid", "partial"].includes(payment.status ?? "")) {
      acc[payment.work_order_id] = (acc[payment.work_order_id] ?? 0) + Number(payment.amount ?? 0);
    }

    return acc;
  }, {});

  const pendingBalancesByOrder = workOrders.map((workOrder) => {
    const totalAmount = Number(workOrder.total_amount ?? 0);
    const collected = collectedByWorkOrder[workOrder.id] ?? 0;
    const pendingBalance = Math.max(Number((totalAmount - collected).toFixed(2)), 0);
    return {
      ...workOrder,
      pendingBalance,
    };
  });

  return {
    metrics: {
      activeWorkOrders: workOrders.filter((item) =>
        ["presupuesto_pendiente", "diagnostico_pendiente", "en_reparacion", "listo_para_entrega"].includes(
          item.status,
        ),
      ).length,
      completedWorkOrders: workOrders.filter((item) => item.status === "completada").length,
      revenueThisMonth: Number(
        payments
          .filter(
            (item) =>
              ["paid", "partial"].includes(item.status ?? "") &&
              item.paid_at &&
              new Date(item.paid_at) >= monthStart,
          )
          .reduce((total, item) => total + Number(item.amount ?? 0), 0)
          .toFixed(2),
      ),
      pendingBalances: Number(
        pendingBalancesByOrder.reduce((total, item) => total + item.pendingBalance, 0).toFixed(2),
      ),
      lowStockCount: inventory.filter(
        (item) => Number(item.stock_quantity ?? 0) <= Number(item.low_stock_threshold ?? 0),
      ).length,
    },
    funnel: {
      quotesPending: quotes.filter((item) => ["draft", "sent"].includes(item.status)).length,
      quotesApproved: quotes.filter((item) => item.status === "approved").length,
      purchaseOrdersOpen: purchaseOrders.filter((item) => ["draft", "sent"].includes(item.status)).length,
      purchaseOrdersReceived: purchaseOrders.filter((item) => item.status === "received").length,
    },
    collections: {
      overdueCount: pendingBalancesByOrder.filter(
        (item) => item.pendingBalance > 0 && item.promised_date && new Date(item.promised_date) < today,
      ).length,
      pendingOrderCount: pendingBalancesByOrder.filter((item) => item.pendingBalance > 0).length,
    },
  };
}
