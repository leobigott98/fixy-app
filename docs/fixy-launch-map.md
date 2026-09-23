# Mapa de entrada de Fixy

Este mapa sirve para ubicar rapidamente los flujos principales antes de hacer cambios. Se construyo revisando el arbol local y las dependencias directas declaradas en imports y exports; no es una auditoria de las implementaciones completas.

## Flujos principales

| Capacidad | UI y rutas | Escrituras del servidor | Datos y validacion | Salida publica |
| --- | --- | --- | --- | --- |
| Ordenes de trabajo | `app/(app)/app/work-orders/page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx` y `[id]/document/page.tsx` | `app/actions/work-orders.ts`: `saveWorkOrderAction`, `moveWorkOrderStatusAction`, `createWorkOrderFromQuoteAction` | `lib/data/work-orders.ts`, validado por `lib/work-orders/schema.ts`; usa inventario y asignaciones de mecanicos como dependencias directas | `app/(public)/ordenes/[token]/page.tsx` y `documento/page.tsx` |
| Presupuestos | `app/(app)/app/quotes/page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx` y `[id]/document/page.tsx` | `app/actions/quotes.ts`: `saveQuoteAction`, `updateQuoteLifecycleAction` | `lib/data/quotes.ts`, validado por `lib/quotes/schema.ts`; consulta opciones de inventario | `app/(public)/presupuestos/[token]/page.tsx` y `documento/page.tsx` |
| Pagos | `app/(app)/app/finances/page.tsx`, `payments/new/page.tsx` y `payments/[id]/receipt/page.tsx` | `app/actions/finances.ts`: `recordPaymentAction` (el mismo archivo contiene el flujo adyacente de gastos) | `lib/data/finances.ts`, validado por `lib/finances/schema.ts`; el recibo tambien consulta la orden relacionada | No hay una ruta publica de pago; el recibo esta bajo el area autenticada |
| Inventario | `app/(app)/app/inventory/page.tsx`, `new/page.tsx` y `[id]/edit/page.tsx` | `app/actions/inventory.ts`: `saveInventoryItemAction` | `lib/data/inventory.ts`, validado por `lib/inventory/schema.ts`; ordenes y presupuestos lo consumen directamente | Sin ruta publica propia |
| Portal publico | Directorio `app/(public)/talleres`, presupuestos por token y ordenes por token | `app/actions/public-shares.ts`: crea enlaces para presupuestos/ordenes y aprueba presupuestos por token | `lib/data/public-shares.ts` resuelve vistas por token; `lib/share-links.ts` construye las rutas | `/talleres`, `/talleres/[slug]`, `/presupuestos/[token]`, `/ordenes/[token]` y sus documentos |

## Autorizacion y permisos

- `app/(app)/app/layout.tsx` es la frontera de entrada del area autenticada: exige `requireAppSession`, obtiene `getCurrentWorkshopAccess` y deriva el rol que recibe el shell protegido.
- `lib/data/workshops.ts` centraliza `getCurrentWorkshopAccess` y `requireCurrentWorkshop`. Los modulos de datos de ordenes, presupuestos, pagos e inventario dependen directamente de esa frontera para acotar operaciones al taller actual.
- `lib/permissions.ts` define roles, modulos y permisos, y expone `hasModuleAccess`, `hasPermission`, `getRoleModules`, `getRolePermissions` y `getRoleHomePath`.
- `lib/data/work-orders.ts` agrega restricciones por rol para mecanicos y para las operaciones que administran ordenes. La visibilidad de Finanzas usa `hasModuleAccess` desde su pagina principal.
- `app/actions/auth-access.ts` prepara el acceso OTP; la sesion se resuelve en `lib/auth/session.ts` y los clientes Supabase viven en `lib/supabase/`.

### Matriz de operaciones del servidor

`lib/permissions.ts` contiene `workshopOperationMatrix`, que es la politica explicita usada por `requireWorkshopOperation` en `lib/data/workshops.ts`:

| Operacion | Roles permitidos | Restriccion adicional |
| --- | --- | --- |
| `workshop.manage` | owner, admin | Ninguna |
| `clients.view` | owner, admin, recepcion, finanzas | Protege lista, detalle e historial asociado |
| `clients.manage` | owner, admin, recepcion, finanzas | El cliente editado debe pertenecer al taller de sesion |
| `vehicles.view` | owner, admin, recepcion, finanzas | Protege propietarios, lista, detalle e historial de reparaciones |
| `vehicles.manage` | owner, admin, recepcion, finanzas | Cliente y vehiculo editado deben pertenecer al taller de sesion |
| `marketplace.view` | owner, admin, recepcion, finanzas | Protege notificaciones y resenas internas; el directorio publico sigue anonimo |
| `marketplace.manage` | owner, admin, recepcion, finanzas | Solicitudes y resenas deben pertenecer al taller de sesion |
| `quotes.view` | owner, admin, recepcion, finanzas | Protege opciones, lista, detalle y documento interno |
| `quotes.manage` | owner, admin, recepcion, finanzas | Cliente, vehiculo, presupuesto y repuestos deben pertenecer al taller de sesion |
| `work_orders.manage` | owner, admin, recepcion | Ninguna |
| `work_orders.view` | owner, admin, recepcion, mechanic | El mecanico debe coincidir con el asignado a la orden |
| `work_orders.report` | owner, admin, recepcion, mechanic | El mecanico debe coincidir con el asignado a la orden |
| `finances.view` | owner, admin, finanzas | Protege resumen, formularios y recibos |
| `payments.record` | owner, admin, finanzas | Ninguna |
| `expenses.record` | owner, admin, finanzas | Ninguna |
| `inventory.view` | owner, admin, finanzas | Protege lista, detalle y opciones de repuestos |
| `inventory.manage` | owner, admin, finanzas | Protege altas y ajustes manuales |
| `inventory.sync_work_order_usage` | owner, admin, recepcion, finanzas | Taller, orden y repuestos deben coincidir con la sesion |
| `suppliers.view` | owner, admin, finanzas | Protege lista y detalle interno |
| `suppliers.manage` | owner, admin, finanzas | Protege altas y ediciones |
| `purchase_orders.view` | owner, admin, finanzas | Protege lista, detalle y opciones de compra |
| `purchase_orders.manage` | owner, admin, finanzas | Proveedor, orden e items de inventario deben pertenecer al taller de sesion |

La politica deniega por defecto sesiones anonimas, miembros inactivos, operaciones no configuradas y roles no listados. Como no hay una decision comercial explicita para `jefe_taller` en estas operaciones, el rol queda denegado en el guard nuevo. Tampoco se concede a Finanzas acceso operativo general a clientes, presupuestos u ordenes. Estas decisiones son deliberadamente conservadoras hasta que producto las aclare. Los consumidores existentes todavia no se migraron en bloque al guard nuevo.

## Pruebas TypeScript

La base minima usa el runner integrado `node:test`, sin dependencias nuevas. Requiere Node 22.15 o posterior porque el resolver del alias `@/` usa `registerHooks` y las pruebas usan el soporte integrado para retirar tipos.

Ejecutar todas las pruebas configuradas:

```powershell
npm test
```

El comando subyacente, util cuando `npm` no esta disponible en el entorno, es:

```powershell
node --test --experimental-strip-types --import ./tests/register-typescript-paths.mjs tests/quotes/schema.test.ts
```

La prueba inicial verifica un ejemplo de `calculateQuoteTotals` con dos lineas de mano de obra y una de repuestos, esperando un total de `205.49`.
