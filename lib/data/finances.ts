import type { Route } from "next";

import { createSupabaseDataClient, isMissingRelationError } from "@/lib/data/core";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import {
  getExpenseCategoryLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  isCollectedPaymentStatus,
  type ExpenseCategory,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/finances/constants";
import {
  normalizeExpenseInput,
  normalizePaymentInput,
  type ExpenseFormValues,
  type PaymentFormValues,
} from "@/lib/finances/schema";

type ClientLite = {
  id: string;
  full_name: string;
  whatsapp_phone: string | null;
};

type WorkOrderLite = {
  id: string;
  client_id: string | null;
  code: string | null;
  title: string;
  status: string;
  total_amount: number | string | null;
  promised_date: string | null;
  vehicle_label: string | null;
};

export type PaymentRecord = {
  id: string;
  workshop_id: string;
  client_id: string | null;
  work_order_id: string | null;
  quote_id: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  paid_at: string;
  notes: string | null;
  proof_url: string | null;
  created_at: string;
};

export type ExpenseRecord = {
  id: string;
  workshop_id: string;
  work_order_id: string | null;
  amount: number;
  category: ExpenseCategory;
  spent_at: string;
  notes: string | null;
  created_at: string;
};

export type ExpenseAssetRecord = {
  id: string;
  expense_id: string;
  workshop_id: string;
  asset_url: string;
  sort_order: number;
  created_at: string;
};

type PaymentRowWithRelations = Omit<PaymentRecord, "amount"> & {
  amount: number | string | null;
  clients: ClientLite | ClientLite[] | null;
  work_orders: WorkOrderLite | WorkOrderLite[] | null;
};

type ExpenseRowWithRelations = Omit<ExpenseRecord, "amount"> & {
  amount: number | string | null;
  work_orders: WorkOrderLite | WorkOrderLite[] | null;
  expense_assets: ExpenseAssetRecord[] | null;
};

type WorkOrderBalanceRow = {
  id: string;
  client_id: string | null;
  code: string | null;
  title: string;
  status: string;
  total_amount: number | string | null;
  promised_date: string | null;
  vehicle_label: string | null;
  clients: ClientLite | ClientLite[] | null;
};

function toSingleRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getTodayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function normalizePaymentRecord(row: PaymentRowWithRelations): PaymentRecord {
  return {
    ...row,
    amount: Number(row.amount ?? 0),
  };
}

function normalizeExpenseRecord(row: ExpenseRowWithRelations): ExpenseRecord {
  return {
    ...row,
    amount: Number(row.amount ?? 0),
  };
}

function normalizeTotalAmount(amount: number | string | null) {
  return Number(amount ?? 0);
}

export type PendingBalanceItem = {
  workOrder: WorkOrderLite;
  client: ClientLite | null;
  totalAmount: number;
  collectedAmount: number;
  pendingBalance: number;
  isOverdue: boolean;
};

export type PaymentHistoryItem = {
  payment: PaymentRecord;
  client: ClientLite | null;
  workOrder: WorkOrderLite | null;
};

export type ExpenseListItem = {
  expense: ExpenseRecord;
  workOrder: WorkOrderLite | null;
  assets: ExpenseAssetRecord[];
};

export type FinancesOverviewData = {
  overview: {
    collectedThisMonth: number;
    pendingBalances: number;
    overduePayments: number;
    expensesThisMonth: number;
    netEstimate: number;
  };
  pendingBalances: PendingBalanceItem[];
  paymentHistory: PaymentHistoryItem[];
  expenses: ExpenseListItem[];
};

export type PaymentFormOptions = {
  clients: Array<{
    id: string;
    fullName: string;
  }>;
  workOrders: Array<{
    id: string;
    clientId: string | null;
    label: string;
    pendingBalance: number;
    totalAmount: number;
  }>;
};

export type ExpenseFormOptions = {
  workOrders: Array<{
    id: string;
    label: string;
  }>;
};

function filterByQuery(haystack: string[], query: string) {
  if (!query) {
    return true;
  }

  return haystack.join(" ").toLowerCase().includes(query);
}

export async function getFinancesOverview(search?: string): Promise<FinancesOverviewData> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();
  const monthStart = getMonthStart();
  const todayStart = getTodayStart();
  const query = search?.trim().toLowerCase() ?? "";

  const [paymentsResult, expensesResult, workOrdersResult] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "*, clients(id,full_name,whatsapp_phone), work_orders(id,client_id,code,title,status,total_amount,promised_date,vehicle_label)",
      )
      .eq("workshop_id", workshop.id)
      .order("paid_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("*, work_orders(id,client_id,code,title,status,total_amount,promised_date,vehicle_label), expense_assets(*)")
      .eq("workshop_id", workshop.id)
      .order("spent_at", { ascending: false }),
    supabase
      .from("work_orders")
      .select(
        "id,client_id,code,title,status,total_amount,promised_date,vehicle_label, clients(id,full_name,whatsapp_phone)",
      )
      .eq("workshop_id", workshop.id)
      .neq("status", "cancelada")
      .order("updated_at", { ascending: false }),
  ]);

  const nonMissingError = [paymentsResult.error, expensesResult.error, workOrdersResult.error].find(
    (error) => error && !isMissingRelationError(error),
  );

  if (nonMissingError) {
    throw nonMissingError;
  }

  const payments = ((paymentsResult.data as PaymentRowWithRelations[] | null) ?? []).map((row) => ({
    payment: normalizePaymentRecord(row),
    client: toSingleRelation(row.clients),
    workOrder: toSingleRelation(row.work_orders),
  }));

  const expenses = ((expensesResult.data as ExpenseRowWithRelations[] | null) ?? []).map((row) => ({
    expense: normalizeExpenseRecord(row),
    workOrder: toSingleRelation(row.work_orders),
    assets: (row.expense_assets ?? []).sort((a, b) => a.sort_order - b.sort_order),
  }));

  const workOrders = (workOrdersResult.data as WorkOrderBalanceRow[] | null) ?? [];

  const collectedPayments = payments.filter((item) => isCollectedPaymentStatus(item.payment.status));
  const collectedByWorkOrder = collectedPayments.reduce<Record<string, number>>((acc, item) => {
    if (item.payment.work_order_id) {
      acc[item.payment.work_order_id] = (acc[item.payment.work_order_id] ?? 0) + Number(item.payment.amount ?? 0);
    }
    return acc;
  }, {});

  const pendingBalances = workOrders
    .map((workOrder) => {
      const totalAmount = normalizeTotalAmount(workOrder.total_amount);
      const collectedAmount = collectedByWorkOrder[workOrder.id] ?? 0;
      const pendingBalance = Math.max(Number((totalAmount - collectedAmount).toFixed(2)), 0);
      const promisedDate = workOrder.promised_date ? new Date(workOrder.promised_date) : null;

      return {
        workOrder: {
          ...workOrder,
          total_amount: totalAmount,
        },
        client: toSingleRelation(workOrder.clients),
        totalAmount,
        collectedAmount,
        pendingBalance,
        isOverdue: Boolean(promisedDate && promisedDate < todayStart && pendingBalance > 0),
      };
    })
    .filter((item) => item.pendingBalance > 0)
    .sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) {
        return a.isOverdue ? -1 : 1;
      }

      return b.pendingBalance - a.pendingBalance;
    });

  const filteredPendingBalances = pendingBalances.filter((item) =>
    filterByQuery(
      [
        item.workOrder.code ?? "",
        item.workOrder.title,
        item.workOrder.vehicle_label ?? "",
        item.client?.full_name ?? "",
        item.workOrder.status,
      ],
      query,
    ),
  );

  const filteredPayments = payments.filter((item) =>
    filterByQuery(
      [
        item.client?.full_name ?? "",
        item.workOrder?.title ?? "",
        item.workOrder?.code ?? "",
        item.payment.notes ?? "",
        getPaymentStatusLabel(item.payment.status),
        getPaymentMethodLabel(item.payment.method),
      ],
      query,
    ),
  );

  const filteredExpenses = expenses.filter((item) =>
    filterByQuery(
      [
        getExpenseCategoryLabel(item.expense.category),
        item.workOrder?.title ?? "",
        item.workOrder?.code ?? "",
        item.expense.notes ?? "",
      ],
      query,
    ),
  );

  return {
    overview: {
      collectedThisMonth: collectedPayments
        .filter((item) => new Date(item.payment.paid_at) >= monthStart)
        .reduce((total, item) => total + item.payment.amount, 0),
      pendingBalances: pendingBalances.reduce((total, item) => total + item.pendingBalance, 0),
      overduePayments: pendingBalances
        .filter((item) => item.isOverdue)
        .reduce((total, item) => total + item.pendingBalance, 0),
      expensesThisMonth: expenses
        .filter((item) => new Date(item.expense.spent_at) >= monthStart)
        .reduce((total, item) => total + item.expense.amount, 0),
      netEstimate:
        collectedPayments
          .filter((item) => new Date(item.payment.paid_at) >= monthStart)
          .reduce((total, item) => total + item.payment.amount, 0) -
        expenses
          .filter((item) => new Date(item.expense.spent_at) >= monthStart)
          .reduce((total, item) => total + item.expense.amount, 0),
    },
    pendingBalances: filteredPendingBalances,
    paymentHistory: filteredPayments,
    expenses: filteredExpenses,
  };
}

export async function getPaymentFormOptions(): Promise<PaymentFormOptions> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const [clientsResult, workOrdersResult, paymentsResult] = await Promise.all([
    supabase.from("clients").select("id,full_name").eq("workshop_id", workshop.id).order("full_name"),
    supabase
      .from("work_orders")
      .select("id,client_id,code,title,total_amount,status")
      .eq("workshop_id", workshop.id)
      .neq("status", "cancelada")
      .order("updated_at", { ascending: false }),
    supabase
      .from("payments")
      .select("work_order_id,amount,status")
      .eq("workshop_id", workshop.id),
  ]);

  const nonMissingError = [clientsResult.error, workOrdersResult.error, paymentsResult.error].find(
    (error) => error && !isMissingRelationError(error),
  );

  if (nonMissingError) {
    throw nonMissingError;
  }

  const collectedByWorkOrder = (((paymentsResult.data as Array<{
    work_order_id: string | null;
    amount: number | string | null;
    status: string | null;
  }> | null) ?? []).reduce<Record<string, number>>((acc, payment) => {
    if (payment.work_order_id && isCollectedPaymentStatus(payment.status)) {
      acc[payment.work_order_id] = (acc[payment.work_order_id] ?? 0) + Number(payment.amount ?? 0);
    }
    return acc;
  }, {}));

  return {
    clients: (((clientsResult.data as Array<{ id: string; full_name: string }> | null) ?? []).map(
      (client) => ({
        id: client.id,
        fullName: client.full_name,
      }),
    )),
    workOrders: (((workOrdersResult.data as Array<{
      id: string;
      client_id: string | null;
      code: string | null;
      title: string;
      total_amount: number | string | null;
      status: string;
    }> | null) ?? []).map((workOrder) => {
      const totalAmount = Number(workOrder.total_amount ?? 0);
      const paidAmount = collectedByWorkOrder[workOrder.id] ?? 0;
      const pendingBalance = Math.max(Number((totalAmount - paidAmount).toFixed(2)), 0);

      return {
        id: workOrder.id,
        clientId: workOrder.client_id,
        label: [workOrder.code, workOrder.title].filter(Boolean).join(" - "),
        pendingBalance,
        totalAmount,
      };
    })),
  };
}

export async function getExpenseFormOptions(): Promise<ExpenseFormOptions> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const { data, error } = await supabase
    .from("work_orders")
    .select("id,code,title")
    .eq("workshop_id", workshop.id)
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingRelationError(error)) {
      return { workOrders: [] };
    }

    throw error;
  }

  return {
    workOrders: (((data as Array<{ id: string; code: string | null; title: string }> | null) ?? []).map(
      (workOrder) => ({
        id: workOrder.id,
        label: [workOrder.code, workOrder.title].filter(Boolean).join(" - "),
      }),
    )),
  };
}

export async function recordPayment(values: PaymentFormValues) {
  const workshop = await requireCurrentWorkshop();
  const input = normalizePaymentInput(values);
  const supabase = await createSupabaseDataClient();

  if (input.workOrderId) {
    const { data, error } = await supabase
      .from("work_orders")
      .select("id,client_id,status")
      .eq("workshop_id", workshop.id)
      .eq("id", input.workOrderId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const workOrder = data as { id: string; client_id: string | null; status: string } | null;

    if (!workOrder) {
      throw new Error("La orden seleccionada no existe.");
    }

    if (workOrder.client_id && workOrder.client_id !== input.clientId) {
      throw new Error("La orden no coincide con el cliente seleccionado.");
    }

    if (workOrder.status === "cancelada") {
      throw new Error("No puedes registrar pagos sobre una orden cancelada.");
    }
  }

  const payload = {
    workshop_id: workshop.id,
    client_id: input.clientId,
    work_order_id: input.workOrderId,
    amount: input.amount,
    status: input.status,
    method: input.method,
    paid_at: new Date(`${input.date}T12:00:00.000Z`).toISOString(),
    notes: input.notes,
    proof_url: input.proofUrl,
  };

  const { data, error } = await supabase.from("payments").insert(payload).select("*").single();

  if (error) {
    throw error;
  }

  return data as PaymentRecord;
}

export async function createExpense(values: ExpenseFormValues) {
  const workshop = await requireCurrentWorkshop();
  const input = normalizeExpenseInput(values);
  const supabase = await createSupabaseDataClient();

  if (input.workOrderId) {
    const { data, error } = await supabase
      .from("work_orders")
      .select("id")
      .eq("workshop_id", workshop.id)
      .eq("id", input.workOrderId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("La orden vinculada no existe.");
    }
  }

  const payload = {
    workshop_id: workshop.id,
    work_order_id: input.workOrderId,
    amount: input.amount,
    category: input.category,
    spent_at: input.date,
    notes: input.notes,
  };

  const { data, error } = await supabase.from("expenses").insert(payload).select("*").single();

  if (error) {
    throw error;
  }

  const expense = data as ExpenseRecord;

  if (input.assetUrls.length) {
    const { error: assetError } = await supabase.from("expense_assets").insert(
      input.assetUrls.map((assetUrl, index) => ({
        expense_id: expense.id,
        workshop_id: workshop.id,
        asset_url: assetUrl,
        sort_order: index,
      })),
    );

    if (assetError) {
      throw assetError;
    }
  }

  return expense;
}

export type PaymentReceiptDetail = {
  payment: PaymentRecord;
  client: ClientLite | null;
  workOrder: WorkOrderLite | null;
  workshop: Awaited<ReturnType<typeof requireCurrentWorkshop>>;
};

export async function getPaymentReceiptDetail(paymentId: string): Promise<PaymentReceiptDetail> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const { data, error } = await supabase
    .from("payments")
    .select(
      "*, clients(id,full_name,whatsapp_phone), work_orders(id,client_id,code,title,status,total_amount,promised_date,vehicle_label)",
    )
    .eq("workshop_id", workshop.id)
    .eq("id", paymentId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      throw new Error("Pago no encontrado.");
    }

    throw error;
  }

  const row = data as PaymentRowWithRelations | null;

  if (!row) {
    throw new Error("Pago no encontrado.");
  }

  return {
    payment: normalizePaymentRecord(row),
    client: toSingleRelation(row.clients),
    workOrder: toSingleRelation(row.work_orders),
    workshop,
  };
}

export function getFinancePaymentNewHref() {
  return "/app/finances/payments/new" as Route;
}

export function getFinanceExpenseNewHref() {
  return "/app/finances/expenses/new" as Route;
}

export function getPaymentReceiptHref(paymentId: string) {
  return `/app/finances/payments/${paymentId}/receipt` as Route;
}
