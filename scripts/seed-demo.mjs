import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

export const DEMO_MARKER = "fixy-demo-seed-v1";

const LOCAL_SUPABASE_PORT = "54321";

const IDS = {
  workshop: "d0000000-0000-4000-8000-000000000001",
  isolatedWorkshop: "d0000000-0000-4000-8000-000000000002",
  mechanic: "d1000000-0000-4000-8000-000000000001",
  mechanic2: "d1000000-0000-4000-8000-000000000002",
  isolatedMechanic: "d1000000-0000-4000-8000-000000000003",
  memberAdmin: "d2000000-0000-4000-8000-000000000001",
  memberFinance: "d2000000-0000-4000-8000-000000000002",
  memberMechanic: "d2000000-0000-4000-8000-000000000003",
  memberMechanic2: "d2000000-0000-4000-8000-000000000004",
  clientAna: "d3000000-0000-4000-8000-000000000001",
  clientLuis: "d3000000-0000-4000-8000-000000000002",
  isolatedClient: "d3000000-0000-4000-8000-000000000003",
  vehicleAna: "d4000000-0000-4000-8000-000000000001",
  vehicleLuis: "d4000000-0000-4000-8000-000000000002",
  isolatedVehicle: "d4000000-0000-4000-8000-000000000003",
  pads: "d5000000-0000-4000-8000-000000000001",
  brakeFluid: "d5000000-0000-4000-8000-000000000002",
  oilFilter: "d5000000-0000-4000-8000-000000000003",
  oilLiter: "d5000000-0000-4000-8000-000000000004",
  airFilter: "d5000000-0000-4000-8000-000000000005",
  inventoryMovementPads: "d5100000-0000-4000-8000-000000000001",
  inventoryMovementBrakeFluid: "d5100000-0000-4000-8000-000000000002",
  inventoryMovementOilFilter: "d5100000-0000-4000-8000-000000000003",
  inventoryMovementOil: "d5100000-0000-4000-8000-000000000004",
  inventoryMovementAirFilter: "d5100000-0000-4000-8000-000000000005",
  supplier: "d6000000-0000-4000-8000-000000000001",
  purchaseOrder: "d6100000-0000-4000-8000-000000000001",
  purchaseOrderItem: "d6200000-0000-4000-8000-000000000001",
  quoteDraft: "d7000000-0000-4000-8000-000000000001",
  quotePending: "d7000000-0000-4000-8000-000000000002",
  quoteApproved: "d7000000-0000-4000-8000-000000000003",
  quoteCompleted: "d7000000-0000-4000-8000-000000000004",
  orderApproved: "d8000000-0000-4000-8000-000000000001",
  orderCompleted: "d8000000-0000-4000-8000-000000000002",
  isolatedOrder: "d8000000-0000-4000-8000-000000000003",
  paymentPartial: "d9000000-0000-4000-8000-000000000001",
  expenseParts: "da000000-0000-4000-8000-000000000001",
  commission: "db000000-0000-4000-8000-000000000001",
  ownerProfile: "dc000000-0000-4000-8000-000000000001",
  ownerVehicle: "dc100000-0000-4000-8000-000000000001",
  ownerServiceRecord: "dc200000-0000-4000-8000-000000000001",
};

const ACCOUNTS = [
  { key: "owner", email: "dueno@fixy.example.com", name: "Daniela Demo", role: "owner", accountType: "workshop" },
  { key: "admin", email: "admin@fixy.example.com", name: "Alex Admin Demo", role: "admin", accountType: "workshop" },
  { key: "finance", email: "finanzas@fixy.example.com", name: "Fernanda Finanzas Demo", role: "finanzas", accountType: "workshop" },
  { key: "mechanic", email: "mecanico@fixy.example.com", name: "Miguel Mecanico Demo", role: "mechanic", accountType: "workshop" },
  { key: "mechanic2", email: "mecanico2@fixy.example.com", name: "Marta Mecanica Demo", role: "mechanic", accountType: "workshop" },
  { key: "customer", email: "cliente@fixy.example.com", name: "Carla Cliente Demo", role: "car_owner", accountType: "car_owner" },
  { key: "isolatedOwner", email: "dueno.otro@fixy.example.com", name: "Oscar Aislado Demo", role: "owner", accountType: "workshop" },
];

const REQUIRED_TABLES = [
  "workshops",
  "workshop_members",
  "mechanics",
  "clients",
  "vehicles",
  "inventory_items",
  "inventory_movements",
  "suppliers",
  "purchase_orders",
  "purchase_order_items",
  "quotes",
  "quote_items",
  "work_orders",
  "work_order_services",
  "work_order_parts",
  "work_order_status_history",
  "payments",
  "expenses",
  "commissions",
  "owner_profiles",
  "owner_vehicles",
  "owner_service_records",
];

export function assertSafeLocalSupabaseUrl(value) {
  let url;

  try {
    url = new URL(value ?? "");
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL debe apuntar a Supabase local.");
  }

  const isLoopback = url.hostname === "127.0.0.1" || url.hostname === "localhost";
  const isExpectedOrigin =
    url.protocol === "http:" &&
    isLoopback &&
    url.port === LOCAL_SUPABASE_PORT &&
    (url.pathname === "/" || url.pathname === "") &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash;

  if (!isExpectedOrigin) {
    throw new Error(
      "El seed solo acepta Supabase local en http://127.0.0.1:54321 o http://localhost:54321.",
    );
  }

  return url;
}

export function validateSeedPassword(value) {
  if (!value) {
    throw new Error("Falta FIXY_SEED_PASSWORD en un archivo local ignorado por Git.");
  }

  if (value.length < 12) {
    throw new Error("FIXY_SEED_PASSWORD debe tener al menos 12 caracteres.");
  }

  return value;
}

function dateOnly(offsetDays) {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function dateTime(offsetDays) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString();
}

function authMetadata(account) {
  return {
    full_name: account.name,
    fixy_role: account.role,
    account_type: account.accountType,
  };
}

async function assertLocalServicesAvailable(url, serviceClient) {
  let response;

  try {
    response = await fetch(new URL("/auth/v1/health", url));
  } catch (error) {
    throw new Error("Supabase Auth local no esta disponible. Ejecuta `supabase start`.", {
      cause: error,
    });
  }

  if (!response.ok) {
    throw new Error(`Supabase Auth local no respondio correctamente (${response.status}).`);
  }

  const probes = await Promise.all(
    REQUIRED_TABLES.map(async (table) => {
      const { error } = await serviceClient.from(table).select("id").limit(1);
      return { table, error };
    }),
  );
  const failed = probes.filter((probe) => probe.error);

  if (failed.length) {
    throw new Error(
      `Faltan migraciones locales o la service-role key no corresponde al destino: ${failed
        .map((probe) => probe.table)
        .join(", ")}.`,
    );
  }
}

async function listAllAuthUsers(adminClient) {
  const users = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }

  return users;
}

function isOwnedDemoAuthUser(user) {
  return user.app_metadata?.fixy_demo_seed === DEMO_MARKER;
}

async function prepareAuthAccounts(adminClient, password) {
  const allUsers = await listAllAuthUsers(adminClient);
  const usersByEmail = new Map(
    allUsers.filter((user) => user.email).map((user) => [user.email.toLowerCase(), user]),
  );

  for (const account of ACCOUNTS) {
    const existing = usersByEmail.get(account.email);
    if (existing && !isOwnedDemoAuthUser(existing)) {
      throw new Error(
        `La cuenta ${account.email} ya existe y no pertenece al seed; no se modifico nada.`,
      );
    }
  }

  const resolved = {};
  const createdUserIds = [];
  let reusedCount = 0;

  try {
    for (const account of ACCOUNTS) {
      const existing = usersByEmail.get(account.email);

      if (existing) {
        resolved[account.key] = existing;
        reusedCount += 1;
        continue;
      }

      const { data, error } = await adminClient.auth.admin.createUser({
        email: account.email,
        password,
        email_confirm: true,
        user_metadata: authMetadata(account),
        app_metadata: { fixy_demo_seed: DEMO_MARKER },
      });

      if (error || !data.user) {
        throw error ?? new Error(`No se pudo crear ${account.email}.`);
      }

      resolved[account.key] = data.user;
      createdUserIds.push(data.user.id);
    }
  } catch (error) {
    await removeNewAuthUsers(adminClient, createdUserIds);
    throw error;
  }

  return { resolved, createdUserIds, reusedCount };
}

async function refreshAuthAccounts(adminClient, resolved, password) {
  for (const account of ACCOUNTS) {
    const { error } = await adminClient.auth.admin.updateUserById(resolved[account.key].id, {
      password,
      email_confirm: true,
      user_metadata: authMetadata(account),
      app_metadata: { fixy_demo_seed: DEMO_MARKER },
    });
    if (error) throw error;
  }
}

async function upsert(serviceClient, table, rows) {
  const { error } = await serviceClient.from(table).upsert(rows, { onConflict: "id" });
  if (error) {
    throw new Error(`No se pudo poblar ${table}: ${error.message}`, { cause: error });
  }
}

async function assertReservedWorkshopsAreSafe(serviceClient) {
  const { data, error } = await serviceClient
    .from("workshops")
    .select("id,workshop_name,public_slug")
    .in("id", [IDS.workshop, IDS.isolatedWorkshop]);
  if (error) throw error;

  for (const row of data ?? []) {
    const expected =
      row.id === IDS.workshop
        ? { name: "DEMO Fixy", slug: "demo-fixy" }
        : { name: "DEMO Fixy Aislado", slug: "demo-fixy-aislado" };
    if (row.workshop_name !== expected.name || row.public_slug !== expected.slug) {
      throw new Error(`El UUID reservado ${row.id} contiene datos ajenos; no se modifico nada.`);
    }
  }

  return data?.length ?? 0;
}

async function assertReservedRowsAreSafe(serviceClient) {
  const workshopChecks = [
    ["mechanics", [IDS.mechanic, IDS.mechanic2], IDS.workshop],
    ["mechanics", [IDS.isolatedMechanic], IDS.isolatedWorkshop],
    ["workshop_members", [IDS.memberAdmin, IDS.memberFinance, IDS.memberMechanic, IDS.memberMechanic2], IDS.workshop],
    ["clients", [IDS.clientAna, IDS.clientLuis], IDS.workshop],
    ["clients", [IDS.isolatedClient], IDS.isolatedWorkshop],
    ["vehicles", [IDS.vehicleAna, IDS.vehicleLuis], IDS.workshop],
    ["vehicles", [IDS.isolatedVehicle], IDS.isolatedWorkshop],
    ["inventory_items", [IDS.pads, IDS.brakeFluid, IDS.oilFilter, IDS.oilLiter, IDS.airFilter], IDS.workshop],
    ["inventory_movements", [IDS.inventoryMovementPads, IDS.inventoryMovementBrakeFluid, IDS.inventoryMovementOilFilter, IDS.inventoryMovementOil, IDS.inventoryMovementAirFilter], IDS.workshop],
    ["suppliers", [IDS.supplier], IDS.workshop],
    ["purchase_orders", [IDS.purchaseOrder], IDS.workshop],
    ["purchase_order_items", [IDS.purchaseOrderItem], IDS.workshop],
    ["quotes", [IDS.quoteDraft, IDS.quotePending, IDS.quoteApproved, IDS.quoteCompleted], IDS.workshop],
    ["quote_items", Array.from({ length: 11 }, (_, index) => `d7100000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`), IDS.workshop],
    ["work_orders", [IDS.orderApproved, IDS.orderCompleted], IDS.workshop],
    ["work_orders", [IDS.isolatedOrder], IDS.isolatedWorkshop],
    ["work_order_services", Array.from({ length: 3 }, (_, index) => `d8100000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`), IDS.workshop],
    ["work_order_parts", Array.from({ length: 5 }, (_, index) => `d8200000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`), IDS.workshop],
    ["work_order_status_history", Array.from({ length: 3 }, (_, index) => `d8300000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`), IDS.workshop],
    ["payments", [IDS.paymentPartial], IDS.workshop],
    ["expenses", [IDS.expenseParts], IDS.workshop],
    ["commissions", [IDS.commission], IDS.workshop],
  ];

  for (const [table, ids, expectedWorkshopId] of workshopChecks) {
    const { data, error } = await serviceClient
      .from(table)
      .select("id,workshop_id")
      .in("id", ids);
    if (error) throw error;

    const collision = (data ?? []).find((row) => row.workshop_id !== expectedWorkshopId);
    if (collision) {
      throw new Error(
        `El UUID reservado ${collision.id} en ${table} contiene datos ajenos; no se modifico nada.`,
      );
    }
  }

  const parentChecks = [
    ["owner_vehicles", [IDS.ownerVehicle], "owner_profile_id", IDS.ownerProfile],
    ["owner_service_records", [IDS.ownerServiceRecord], "owner_profile_id", IDS.ownerProfile],
  ];

  for (const [table, ids, parentColumn, expectedParentId] of parentChecks) {
    const { data, error } = await serviceClient
      .from(table)
      .select(`id,${parentColumn}`)
      .in("id", ids);
    if (error) throw error;

    const collision = (data ?? []).find((row) => row[parentColumn] !== expectedParentId);
    if (collision) {
      throw new Error(
        `El UUID reservado ${collision.id} en ${table} contiene datos ajenos; no se modifico nada.`,
      );
    }
  }

  const { data: ownerProfiles, error: ownerProfileError } = await serviceClient
    .from("owner_profiles")
    .select("id,email")
    .eq("id", IDS.ownerProfile);
  if (ownerProfileError) throw ownerProfileError;
  if (ownerProfiles?.some((row) => row.email !== "cliente@fixy.example.com")) {
    throw new Error(
      `El UUID reservado ${IDS.ownerProfile} en owner_profiles contiene datos ajenos; no se modifico nada.`,
    );
  }
}

async function seedDatabase(serviceClient, authUsers) {
  const now = new Date().toISOString();

  await assertReservedRowsAreSafe(serviceClient);

  await upsert(serviceClient, "workshops", [
    {
      id: IDS.workshop,
      owner_email: "dueno@fixy.example.com",
      owner_auth_user_id: authUsers.owner.id,
      owner_name: "Daniela Demo",
      workshop_name: "DEMO Fixy",
      whatsapp_phone: "+582125550101",
      city: "Caracas",
      workshop_type: "Mecanica general (DEMO)",
      opening_days: "Lunes a sabado",
      opens_at: "08:00",
      closes_at: "17:00",
      opening_hours_label: "Lunes a sabado, 8:00 - 17:00",
      bay_count: 4,
      logo_url: "/demo-fixy-logo.svg",
      preferred_currency: "USD",
      public_description: "Taller ficticio para pruebas manuales locales de Fixy.",
      public_address: "Av. Demostracion 123, local ficticio, Caracas",
      public_contact_phone: "+582125550101",
      public_contact_email: "contacto@fixy.example.com",
      public_slug: "demo-fixy",
      public_services: ["Frenos", "Cambio de aceite", "Diagnostico"],
      profile_visibility: "public",
      verification_status: "not_requested",
      gallery_image_urls: [],
    },
    {
      id: IDS.isolatedWorkshop,
      owner_email: "dueno.otro@fixy.example.com",
      owner_auth_user_id: authUsers.isolatedOwner.id,
      owner_name: "Oscar Aislado Demo",
      workshop_name: "DEMO Fixy Aislado",
      whatsapp_phone: "+582415550202",
      city: "Valencia",
      workshop_type: "Taller pequeno (DEMO)",
      opening_days: "Lunes a viernes",
      opens_at: "09:00",
      closes_at: "16:00",
      opening_hours_label: "Lunes a viernes, 9:00 - 16:00",
      bay_count: 1,
      logo_url: "/demo-fixy-logo.svg",
      preferred_currency: "USD",
      public_description: "Segundo taller ficticio para verificar aislamiento.",
      public_address: "Calle Aislada 45, direccion ficticia, Valencia",
      public_contact_phone: "+582415550202",
      public_contact_email: "aislado@fixy.example.com",
      public_slug: "demo-fixy-aislado",
      public_services: ["Mantenimiento"],
      profile_visibility: "private",
      verification_status: "not_requested",
      gallery_image_urls: [],
    },
  ]);

  await upsert(serviceClient, "mechanics", [
    { id: IDS.mechanic, workshop_id: IDS.workshop, full_name: "Miguel Mecanico Demo", phone: "+584125550301", role: "mecanico", is_active: true, notes: "Perfil ficticio vinculado a mecanico@fixy.example.com", photo_url: null },
    { id: IDS.mechanic2, workshop_id: IDS.workshop, full_name: "Marta Mecanica Demo", phone: "+584125550302", role: "mecanico", is_active: true, notes: "Segundo perfil ficticio para asignaciones", photo_url: null },
    { id: IDS.isolatedMechanic, workshop_id: IDS.isolatedWorkshop, full_name: "Mario Aislado Demo", phone: "+584125550303", role: "mecanico", is_active: true, notes: "No debe ser visible desde DEMO Fixy", photo_url: null },
  ]);

  await upsert(serviceClient, "workshop_members", [
    { id: IDS.memberAdmin, workshop_id: IDS.workshop, auth_user_id: authUsers.admin.id, email: "admin@fixy.example.com", phone: null, full_name: "Alex Admin Demo", role: "admin", mechanic_id: null, is_active: true },
    { id: IDS.memberFinance, workshop_id: IDS.workshop, auth_user_id: authUsers.finance.id, email: "finanzas@fixy.example.com", phone: null, full_name: "Fernanda Finanzas Demo", role: "finanzas", mechanic_id: null, is_active: true },
    { id: IDS.memberMechanic, workshop_id: IDS.workshop, auth_user_id: authUsers.mechanic.id, email: "mecanico@fixy.example.com", phone: null, full_name: "Miguel Mecanico Demo", role: "mechanic", mechanic_id: IDS.mechanic, is_active: true },
    { id: IDS.memberMechanic2, workshop_id: IDS.workshop, auth_user_id: authUsers.mechanic2.id, email: "mecanico2@fixy.example.com", phone: null, full_name: "Marta Mecanica Demo", role: "mechanic", mechanic_id: IDS.mechanic2, is_active: true },
  ]);

  await upsert(serviceClient, "clients", [
    { id: IDS.clientAna, workshop_id: IDS.workshop, full_name: "Ana Prueba", phone: "+584145550401", whatsapp_phone: "+584145550401", email: "ana.prueba@fixy.example.com", notes: "Cliente ficticia del escenario principal" },
    { id: IDS.clientLuis, workshop_id: IDS.workshop, full_name: "Luis Ejemplo", phone: "+584245550402", whatsapp_phone: "+584245550402", email: "luis.ejemplo@fixy.example.com", notes: "Cliente ficticio para presupuestos secundarios" },
    { id: IDS.isolatedClient, workshop_id: IDS.isolatedWorkshop, full_name: "Cliente Aislado", phone: "+584245550403", whatsapp_phone: "+584245550403", email: "aislado.cliente@fixy.example.com", notes: "No debe ser visible desde DEMO Fixy" },
  ]);

  await upsert(serviceClient, "vehicles", [
    { id: IDS.vehicleAna, workshop_id: IDS.workshop, client_id: IDS.clientAna, vehicle_label: "Toyota Corolla DEMO", plate: "DMO-101", make: "Toyota", model: "Corolla", vehicle_year: 2018, color: "Gris", mileage: 68420, vin: "DEMO0000000000001", notes: "Vehiculo totalmente ficticio" },
    { id: IDS.vehicleLuis, workshop_id: IDS.workshop, client_id: IDS.clientLuis, vehicle_label: "Ford Fiesta DEMO", plate: "DMO-202", make: "Ford", model: "Fiesta", vehicle_year: 2016, color: "Azul", mileage: 91200, vin: "DEMO0000000000002", notes: "Vehiculo ficticio para costo pendiente" },
    { id: IDS.isolatedVehicle, workshop_id: IDS.isolatedWorkshop, client_id: IDS.isolatedClient, vehicle_label: "Chevrolet Aveo Aislado", plate: "AIS-303", make: "Chevrolet", model: "Aveo", vehicle_year: 2014, color: "Blanco", mileage: 110000, vin: "DEMO0000000000003", notes: "Dato del segundo taller" },
  ]);

  const inventory = [
    { id: IDS.pads, name: "Pastillas de freno delanteras", description: "Juego ficticio para Corolla", stock_quantity: 8, low_stock_threshold: 2, cost: 40, reference_sale_price: 65, sku: "DEMO-FRE-001", notes: "Costo conocido" },
    { id: IDS.brakeFluid, name: "Liquido de frenos", description: "Envase ficticio", stock_quantity: 6, low_stock_threshold: 2, cost: 10, reference_sale_price: 18, sku: "DEMO-FRE-002", notes: "Costo conocido" },
    { id: IDS.oilFilter, name: "Filtro de aceite", description: "Filtro ficticio compatible", stock_quantity: 5, low_stock_threshold: 2, cost: 7, reference_sale_price: 12, sku: "DEMO-ACE-001", notes: "Costo conocido" },
    { id: IDS.oilLiter, name: "Aceite 10W-30 (litro)", description: "Aceite ficticio por litro", stock_quantity: 12, low_stock_threshold: 6, cost: 5, reference_sale_price: 9, sku: "DEMO-ACE-002", notes: "Cuatro litros cuestan USD 20 y se venden en USD 36" },
    { id: IDS.airFilter, name: "Filtro de aire", description: "Existencia por debajo del minimo", stock_quantity: 1, low_stock_threshold: 3, cost: 9, reference_sale_price: 16, sku: "DEMO-BAJO-001", notes: "Caso demo de bajo inventario" },
  ].map((row) => ({ ...row, workshop_id: IDS.workshop }));
  await upsert(serviceClient, "inventory_items", inventory);

  await upsert(serviceClient, "inventory_movements", inventory.map((item, index) => ({
    id: [IDS.inventoryMovementPads, IDS.inventoryMovementBrakeFluid, IDS.inventoryMovementOilFilter, IDS.inventoryMovementOil, IDS.inventoryMovementAirFilter][index],
    workshop_id: IDS.workshop,
    inventory_item_id: item.id,
    movement_type: "initial_stock",
    quantity_delta: item.stock_quantity,
    reference_type: "demo_seed",
    reference_id: null,
    note: "Existencia inicial del seed DEMO Fixy",
  })));

  await upsert(serviceClient, "suppliers", [{ id: IDS.supplier, workshop_id: IDS.workshop, name: "Repuestos Demo 555, C.A. (ficticio)", phone: "+582125550501", notes: "Proveedor ficticio; no usar para compras reales" }]);
  await upsert(serviceClient, "purchase_orders", [{ id: IDS.purchaseOrder, workshop_id: IDS.workshop, supplier_id: IDS.supplier, code: "DEMO-OC-001", status: "received", ordered_at: dateOnly(-10), total_amount: 80, notes: "Compra ficticia de inventario inicial" }]);
  await upsert(serviceClient, "purchase_order_items", [{ id: IDS.purchaseOrderItem, purchase_order_id: IDS.purchaseOrder, workshop_id: IDS.workshop, inventory_item_id: IDS.pads, description: "Dos juegos de pastillas demo", quantity: 2, unit_cost: 40, line_total: 80, sort_order: 0 }]);

  await upsert(serviceClient, "quotes", [
    { id: IDS.quoteDraft, workshop_id: IDS.workshop, client_id: IDS.clientLuis, vehicle_id: IDS.vehicleLuis, title: "DEMO Borrador - revision general", status: "draft", subtotal: 45, total_amount: 45, notes: "Borrador editable para pruebas", sent_at: null, approved_at: null, public_share_enabled: false, public_shared_at: null, public_share_token: "de000000-0000-4000-8000-000000000001", archived_at: null, deleted_at: null },
    { id: IDS.quotePending, workshop_id: IDS.workshop, client_id: IDS.clientLuis, vehicle_id: IDS.vehicleLuis, title: "DEMO Pendiente - diagnostico electrico", status: "sent", subtotal: 70, total_amount: 70, notes: "Incluye un repuesto sin inventario: su costo es desconocido, no cero.", sent_at: dateTime(-1), approved_at: null, public_share_enabled: true, public_shared_at: dateTime(-1), public_share_token: "de000000-0000-4000-8000-000000000002", archived_at: null, deleted_at: null },
    { id: IDS.quoteApproved, workshop_id: IDS.workshop, client_id: IDS.clientAna, vehicle_id: IDS.vehicleAna, title: "DEMO Aprobado - frenos y aceite", status: "approved", subtotal: 193, total_amount: 193, notes: "Venta USD 193; costo directo demostrable USD 114; margen bruto de referencia USD 79.", sent_at: dateTime(-5), approved_at: dateTime(-4), public_share_enabled: true, public_shared_at: dateTime(-5), public_share_token: "de000000-0000-4000-8000-000000000003", archived_at: null, deleted_at: null },
    { id: IDS.quoteCompleted, workshop_id: IDS.workshop, client_id: IDS.clientLuis, vehicle_id: IDS.vehicleLuis, title: "DEMO Aprobado - mantenimiento terminado", status: "approved", subtotal: 95, total_amount: 95, notes: "Origen de una orden completada", sent_at: dateTime(-20), approved_at: dateTime(-19), public_share_enabled: false, public_shared_at: null, public_share_token: "de000000-0000-4000-8000-000000000004", archived_at: null, deleted_at: null },
  ]);

  await upsert(serviceClient, "quote_items", [
    { id: "d7100000-0000-4000-8000-000000000001", quote_id: IDS.quoteDraft, workshop_id: IDS.workshop, inventory_item_id: null, item_type: "labor", description: "Revision general", quantity: 1, unit_price: 45, line_total: 45, sort_order: 0 },
    { id: "d7100000-0000-4000-8000-000000000002", quote_id: IDS.quotePending, workshop_id: IDS.workshop, inventory_item_id: null, item_type: "labor", description: "Diagnostico electrico", quantity: 1, unit_price: 40, line_total: 40, sort_order: 0 },
    { id: "d7100000-0000-4000-8000-000000000003", quote_id: IDS.quotePending, workshop_id: IDS.workshop, inventory_item_id: null, item_type: "part", description: "Repuesto por confirmar (costo desconocido)", quantity: 1, unit_price: 30, line_total: 30, sort_order: 1 },
    { id: "d7100000-0000-4000-8000-000000000004", quote_id: IDS.quoteApproved, workshop_id: IDS.workshop, inventory_item_id: IDS.pads, item_type: "part", description: "Pastillas de freno delanteras", quantity: 1, unit_price: 65, line_total: 65, sort_order: 0 },
    { id: "d7100000-0000-4000-8000-000000000005", quote_id: IDS.quoteApproved, workshop_id: IDS.workshop, inventory_item_id: IDS.brakeFluid, item_type: "part", description: "Liquido de frenos", quantity: 1, unit_price: 18, line_total: 18, sort_order: 1 },
    { id: "d7100000-0000-4000-8000-000000000006", quote_id: IDS.quoteApproved, workshop_id: IDS.workshop, inventory_item_id: null, item_type: "labor", description: "Mano de obra - servicio de frenos", quantity: 1, unit_price: 42, line_total: 42, sort_order: 2 },
    { id: "d7100000-0000-4000-8000-000000000007", quote_id: IDS.quoteApproved, workshop_id: IDS.workshop, inventory_item_id: IDS.oilFilter, item_type: "part", description: "Filtro de aceite", quantity: 1, unit_price: 12, line_total: 12, sort_order: 3 },
    { id: "d7100000-0000-4000-8000-000000000008", quote_id: IDS.quoteApproved, workshop_id: IDS.workshop, inventory_item_id: IDS.oilLiter, item_type: "part", description: "Aceite 10W-30 (litro)", quantity: 4, unit_price: 9, line_total: 36, sort_order: 4 },
    { id: "d7100000-0000-4000-8000-000000000009", quote_id: IDS.quoteApproved, workshop_id: IDS.workshop, inventory_item_id: null, item_type: "labor", description: "Mano de obra - cambio de aceite", quantity: 1, unit_price: 20, line_total: 20, sort_order: 5 },
    { id: "d7100000-0000-4000-8000-000000000010", quote_id: IDS.quoteCompleted, workshop_id: IDS.workshop, inventory_item_id: IDS.airFilter, item_type: "part", description: "Filtro de aire", quantity: 1, unit_price: 16, line_total: 16, sort_order: 0 },
    { id: "d7100000-0000-4000-8000-000000000011", quote_id: IDS.quoteCompleted, workshop_id: IDS.workshop, inventory_item_id: null, item_type: "labor", description: "Mantenimiento preventivo", quantity: 1, unit_price: 79, line_total: 79, sort_order: 1 },
  ]);

  await upsert(serviceClient, "work_orders", [
    { id: IDS.orderApproved, workshop_id: IDS.workshop, client_id: IDS.clientAna, vehicle_id: IDS.vehicleAna, quote_id: IDS.quoteApproved, code: "DEMO-OT-001", title: "DEMO Frenos y cambio de aceite", vehicle_label: "Toyota Corolla DEMO", status: "en_reparacion", promised_date: dateOnly(2), total_amount: 193, bay_slot: 2, assigned_mechanic_id: IDS.mechanic, assigned_mechanic_name: "Miguel Mecanico Demo", notes: "Orden principal asignada. El mecanico debe ver solo esta orden y sin importes en la interfaz.", completed_at: null, public_share_enabled: true, public_shared_at: now, public_share_token: "df000000-0000-4000-8000-000000000001" },
    { id: IDS.orderCompleted, workshop_id: IDS.workshop, client_id: IDS.clientLuis, vehicle_id: IDS.vehicleLuis, quote_id: IDS.quoteCompleted, code: "DEMO-OT-002", title: "DEMO Mantenimiento terminado", vehicle_label: "Ford Fiesta DEMO", status: "completada", promised_date: dateOnly(-7), total_amount: 95, bay_slot: 1, assigned_mechanic_id: IDS.mechanic2, assigned_mechanic_name: "Marta Mecanica Demo", notes: "Orden terminada para historial y segundo mecanico", completed_at: dateTime(-6), public_share_enabled: true, public_shared_at: dateTime(-7), public_share_token: "df000000-0000-4000-8000-000000000002" },
    { id: IDS.isolatedOrder, workshop_id: IDS.isolatedWorkshop, client_id: IDS.isolatedClient, vehicle_id: IDS.isolatedVehicle, quote_id: null, code: "AIS-OT-001", title: "DEMO Orden de otro taller", vehicle_label: "Chevrolet Aveo Aislado", status: "diagnostico_pendiente", promised_date: dateOnly(3), total_amount: 50, bay_slot: 1, assigned_mechanic_id: IDS.isolatedMechanic, assigned_mechanic_name: "Mario Aislado Demo", notes: "Nunca debe aparecer para miembros de DEMO Fixy", completed_at: null, public_share_enabled: false, public_shared_at: null, public_share_token: "df000000-0000-4000-8000-000000000003" },
  ]);

  await upsert(serviceClient, "work_order_services", [
    { id: "d8100000-0000-4000-8000-000000000001", work_order_id: IDS.orderApproved, workshop_id: IDS.workshop, description: "Mano de obra - servicio de frenos", quantity: 1, unit_price: 42, line_total: 42, sort_order: 0 },
    { id: "d8100000-0000-4000-8000-000000000002", work_order_id: IDS.orderApproved, workshop_id: IDS.workshop, description: "Mano de obra - cambio de aceite", quantity: 1, unit_price: 20, line_total: 20, sort_order: 1 },
    { id: "d8100000-0000-4000-8000-000000000003", work_order_id: IDS.orderCompleted, workshop_id: IDS.workshop, description: "Mantenimiento preventivo", quantity: 1, unit_price: 79, line_total: 79, sort_order: 0 },
  ]);

  await upsert(serviceClient, "work_order_parts", [
    { id: "d8200000-0000-4000-8000-000000000001", work_order_id: IDS.orderApproved, workshop_id: IDS.workshop, inventory_item_id: IDS.pads, description: "Pastillas de freno delanteras", quantity: 1, unit_price: 65, line_total: 65, sort_order: 0 },
    { id: "d8200000-0000-4000-8000-000000000002", work_order_id: IDS.orderApproved, workshop_id: IDS.workshop, inventory_item_id: IDS.brakeFluid, description: "Liquido de frenos", quantity: 1, unit_price: 18, line_total: 18, sort_order: 1 },
    { id: "d8200000-0000-4000-8000-000000000003", work_order_id: IDS.orderApproved, workshop_id: IDS.workshop, inventory_item_id: IDS.oilFilter, description: "Filtro de aceite", quantity: 1, unit_price: 12, line_total: 12, sort_order: 2 },
    { id: "d8200000-0000-4000-8000-000000000004", work_order_id: IDS.orderApproved, workshop_id: IDS.workshop, inventory_item_id: IDS.oilLiter, description: "Aceite 10W-30 (litro)", quantity: 4, unit_price: 9, line_total: 36, sort_order: 3 },
    { id: "d8200000-0000-4000-8000-000000000005", work_order_id: IDS.orderCompleted, workshop_id: IDS.workshop, inventory_item_id: IDS.airFilter, description: "Filtro de aire", quantity: 1, unit_price: 16, line_total: 16, sort_order: 0 },
  ]);

  await upsert(serviceClient, "work_order_status_history", [
    { id: "d8300000-0000-4000-8000-000000000001", work_order_id: IDS.orderApproved, workshop_id: IDS.workshop, from_status: null, to_status: "presupuesto_pendiente", note: "Orden creada desde presupuesto aprobado", changed_at: dateTime(-4) },
    { id: "d8300000-0000-4000-8000-000000000002", work_order_id: IDS.orderApproved, workshop_id: IDS.workshop, from_status: "presupuesto_pendiente", to_status: "en_reparacion", note: "Trabajo iniciado por Miguel", changed_at: dateTime(-2) },
    { id: "d8300000-0000-4000-8000-000000000003", work_order_id: IDS.orderCompleted, workshop_id: IDS.workshop, from_status: "listo_para_entrega", to_status: "completada", note: "Vehiculo ficticio entregado", changed_at: dateTime(-6) },
  ]);

  await upsert(serviceClient, "payments", [{ id: IDS.paymentPartial, workshop_id: IDS.workshop, client_id: IDS.clientAna, quote_id: IDS.quoteApproved, work_order_id: IDS.orderApproved, amount: 80, currency: "USD", status: "partial", method: "bank_transfer", paid_at: dateTime(-1), notes: "Pago parcial ficticio del seed", proof_url: null }]);
  await upsert(serviceClient, "expenses", [{ id: IDS.expenseParts, workshop_id: IDS.workshop, work_order_id: IDS.orderApproved, amount: 77, category: "repuestos", spent_at: dateOnly(-2), notes: "Costo directo demo de repuestos: 40 + 10 + 7 + 20 = USD 77" }]);
  await upsert(serviceClient, "commissions", [{ id: IDS.commission, workshop_id: IDS.workshop, mechanic_id: IDS.mechanic, work_order_id: IDS.orderApproved, amount: 37, status: "calculated", notes: "Costo mecanico demo: frenos USD 25 + aceite USD 12" }]);

  await upsert(serviceClient, "owner_profiles", [{ id: IDS.ownerProfile, auth_user_id: authUsers.customer.id, full_name: "Carla Cliente Demo", email: "cliente@fixy.example.com", phone: "+584145550601", city: "Caracas", avatar_url: null, preferred_contact: "whatsapp" }]);
  await upsert(serviceClient, "owner_vehicles", [{ id: IDS.ownerVehicle, owner_profile_id: IDS.ownerProfile, nickname: "Mi carro DEMO", plate: "CLI-404", make: "Mazda", model: "3", vehicle_year: 2019, color: "Rojo", mileage: 50200, vin: "DEMO0000000000004", photo_urls: [], notes: "Vehiculo ficticio del portal de clientes" }]);
  await upsert(serviceClient, "owner_service_records", [{ id: IDS.ownerServiceRecord, owner_profile_id: IDS.ownerProfile, owner_vehicle_id: IDS.ownerVehicle, workshop_id: IDS.workshop, workshop_name: "DEMO Fixy", mechanic_name: "Miguel Mecanico Demo", service_date: dateOnly(-40), delivered_at: dateOnly(-39), service_type: "Cambio de aceite", description: "Servicio ficticio visible en el historial del cliente", parts_used: ["Filtro de aceite", "Aceite 10W-30"], total_cost: 68, currency: "USD", duration_hours: 1.5, photo_urls: [], notes: "Registro demostrativo, no fiscal" }]);
}

async function signInAs(url, anonKey, email, password) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw error ?? new Error(`No se pudo autenticar ${email}.`);
  return client;
}

async function expectIds(queryPromise, expectedIds, label) {
  const { data, error } = await queryPromise;
  if (error) throw new Error(`${label}: ${error.message}`);
  const actual = (data ?? []).map((row) => row.id).sort();
  const expected = [...expectedIds].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: se esperaban ${expected.join(", ") || "cero filas"} y se obtuvieron ${actual.join(", ") || "cero filas"}.`);
  }
}

async function verifySeed(url, anonKey, password) {
  const owner = await signInAs(url, anonKey, "dueno@fixy.example.com", password);
  const admin = await signInAs(url, anonKey, "admin@fixy.example.com", password);
  const finance = await signInAs(url, anonKey, "finanzas@fixy.example.com", password);
  const mechanic = await signInAs(url, anonKey, "mecanico@fixy.example.com", password);
  const mechanic2 = await signInAs(url, anonKey, "mecanico2@fixy.example.com", password);
  const customer = await signInAs(url, anonKey, "cliente@fixy.example.com", password);
  const isolatedOwner = await signInAs(url, anonKey, "dueno.otro@fixy.example.com", password);

  await expectIds(owner.from("workshops").select("id"), [IDS.workshop], "Aislamiento del dueno");
  await expectIds(admin.from("workshops").select("id"), [IDS.workshop], "Aislamiento del admin");
  await expectIds(finance.from("workshops").select("id"), [IDS.workshop], "Aislamiento de finanzas");
  await expectIds(mechanic.from("workshops").select("id"), [IDS.workshop], "Aislamiento del mecanico");
  await expectIds(isolatedOwner.from("workshops").select("id"), [IDS.isolatedWorkshop], "Aislamiento del segundo taller");
  await expectIds(customer.from("workshops").select("id"), [], "Cliente sin membresia de taller");

  await expectIds(mechanic.from("work_orders").select("id"), [IDS.orderApproved], "Asignacion del mecanico principal");
  await expectIds(mechanic2.from("work_orders").select("id"), [IDS.orderCompleted], "Asignacion del segundo mecanico");

  const { data: role, error: roleError } = await finance.rpc("workshop_role", { target_workshop_id: IDS.workshop });
  if (roleError || role !== "finanzas") {
    throw new Error(`Rol de finanzas invalido: ${roleError?.message ?? String(role)}.`);
  }

  const { data: ownerProfile, error: ownerProfileError } = await customer
    .from("owner_profiles")
    .select("id")
    .eq("auth_user_id", (await customer.auth.getUser()).data.user?.id)
    .maybeSingle();
  if (ownerProfileError || ownerProfile?.id !== IDS.ownerProfile) {
    throw new Error(`Perfil de cliente invalido: ${ownerProfileError?.message ?? "no encontrado"}.`);
  }
}

async function removeNewAuthUsers(adminClient, userIds) {
  await Promise.allSettled(userIds.map((userId) => adminClient.auth.admin.deleteUser(userId)));
}

export async function runDemoSeed(environment = process.env) {
  const localUrl = assertSafeLocalSupabaseUrl(environment.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = environment.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY;
  const password = validateSeedPassword(environment.FIXY_SEED_PASSWORD);

  if (!anonKey || !serviceRoleKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY locales.");
  }

  const serviceClient = createClient(localUrl.origin, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  console.log("Comprobando Supabase Auth y esquema locales...");
  await assertLocalServicesAvailable(localUrl, serviceClient);
  const reusedWorkshopCount = await assertReservedWorkshopsAreSafe(serviceClient);

  let authState = { resolved: {}, createdUserIds: [], reusedCount: 0 };

  try {
    authState = await prepareAuthAccounts(serviceClient, password);
    await seedDatabase(serviceClient, authState.resolved);
    await refreshAuthAccounts(serviceClient, authState.resolved, password);
    await verifySeed(localUrl.origin, anonKey, password);
  } catch (error) {
    await removeNewAuthUsers(serviceClient, authState.createdUserIds);
    throw error;
  }

  console.log(
    `Seed DEMO Fixy listo. Reutilizados: ${authState.reusedCount} usuarios Auth y ${reusedWorkshopCount} talleres.`,
  );
  console.log("Autenticacion y aislamiento por taller verificados para las siete cuentas ficticias.");
  console.log("Contrasena: usa el valor local de FIXY_SEED_PASSWORD (no se muestra). ");
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runDemoSeed().catch((error) => {
    console.error(`seed:demo fallo: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
