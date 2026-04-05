import type { Route } from "next";
import { notFound, redirect } from "next/navigation";

import { createSupabaseDataClient, isMissingRelationError } from "@/lib/data/core";
import { requireCurrentWorkshop } from "@/lib/data/workshops";
import type { SupplierFormValues } from "@/lib/suppliers/schema";

export type SupplierRecord = {
  id: string;
  workshop_id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SupplierListItem = SupplierRecord & {
  purchaseOrderCount: number;
};

export async function getSuppliersList(search?: string): Promise<SupplierListItem[]> {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();
  const query = search?.trim() ?? "";

  let suppliersQuery = supabase
    .from("suppliers")
    .select("*")
    .eq("workshop_id", workshop.id)
    .order("updated_at", { ascending: false });

  if (query) {
    suppliersQuery = suppliersQuery.or([`name.ilike.%${query}%`, `phone.ilike.%${query}%`, `notes.ilike.%${query}%`].join(","));
  }

  const { data, error } = await suppliersQuery;

  if (error) {
    if (isMissingRelationError(error)) {
      return [];
    }

    throw error;
  }

  const suppliers = (data as SupplierRecord[] | null) ?? [];

  if (!suppliers.length) {
    return [];
  }

  const supplierIds = suppliers.map((supplier) => supplier.id);
  const { data: purchaseOrdersData, error: purchaseOrdersError } = await supabase
    .from("purchase_orders")
    .select("supplier_id")
    .eq("workshop_id", workshop.id)
    .in("supplier_id", supplierIds);

  if (purchaseOrdersError && !isMissingRelationError(purchaseOrdersError)) {
    throw purchaseOrdersError;
  }

  const counts = (((purchaseOrdersData as Array<{ supplier_id: string | null }> | null) ?? []).reduce<Record<string, number>>(
    (acc, item) => {
      if (item.supplier_id) {
        acc[item.supplier_id] = (acc[item.supplier_id] ?? 0) + 1;
      }
      return acc;
    },
    {},
  ));

  return suppliers.map((supplier) => ({
    ...supplier,
    purchaseOrderCount: counts[supplier.id] ?? 0,
  }));
}

export async function getSupplierForEdit(supplierId: string) {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("workshop_id", workshop.id)
    .eq("id", supplierId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      notFound();
    }

    throw error;
  }

  if (!data) {
    notFound();
  }

  return data as SupplierRecord;
}

export async function upsertSupplier(values: SupplierFormValues, supplierId?: string) {
  const workshop = await requireCurrentWorkshop();
  const supabase = await createSupabaseDataClient();

  const payload = {
    workshop_id: workshop.id,
    name: values.name,
    phone: values.phone || null,
    notes: values.notes || null,
  };

  const query = supplierId
    ? supabase.from("suppliers").update(payload).eq("workshop_id", workshop.id).eq("id", supplierId)
    : supabase.from("suppliers").insert(payload);

  const { data, error } = await query.select("*").single();

  if (error) {
    throw error;
  }

  return data as SupplierRecord;
}

export function getSupplierEditHref(supplierId: string) {
  return `/app/suppliers/${supplierId}/edit` as Route;
}

export async function requireSupplierOrRedirect(supplierId: string) {
  try {
    return await getSupplierForEdit(supplierId);
  } catch {
    redirect("/app/suppliers" as Route);
  }
}
