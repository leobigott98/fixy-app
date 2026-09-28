# RLS del grupo Operacion

La migracion `202609230003_operation_rls.sql` aplica exclusivamente el grupo
Operacion de `security-db-plan.md` a:

- `clients`;
- `vehicles` y `vehicle_photos`;
- `quotes` y `quote_items`;
- `work_orders`, `work_order_services`, `work_order_parts`,
  `work_order_status_history` y `work_order_reference_photos`;
- `appointments`;
- `mechanics`;
- `marketplace_inquiries` en su faceta de taller.

No cambia las policies de finanzas, inventario, portal del propietario,
reseñas, perfil publico de talleres ni Storage.

## Frontera aplicada

- `anon` no tiene acceso directo a ninguna tabla ni proyeccion del grupo.
- `authenticated` no conserva `TRUNCATE`, `REFERENCES` ni `TRIGGER`.
- Todas las filas se acotan mediante `workshop_role(workshop_id)` y, para el
  mecanico, mediante el `mechanic_id` derivado de su membresia activa.
- Altas y cambios validan que cliente, vehiculo, cotizacion, mecanico y padre
  de cada fila hija pertenezcan al mismo taller.
- El historial de estados permite `SELECT` e `INSERT`, pero no `UPDATE` o
  `DELETE`; una nueva fila debe coincidir con el estado actual de la orden.
- Finanzas no recibe lectura de la fila completa de `work_orders`. La vista
  `operation_work_order_financials` expone una lista explicita de columnas.
- La tabla `mechanics` solo concede lectura directa de columnas seguras. La
  vista `operation_mechanic_profiles` entrega telefono y notas a owner, admin,
  jefe de taller o al mecanico vinculado consigo mismo; recepcion queda fuera.
- Los formularios de orden y agenda para jefe de taller usan las vistas
  estrechas `operation_client_options`, `operation_vehicle_options` y
  `operation_quote_options`. No abren las tablas base; omiten notas, VIN y
  tokens, y ocultan el contacto del cliente a ese rol.
- Los shares por token no usan una policy de lectura publica. Conservan el
  flujo administrativo estrecho de `lib/data/public-shares.ts`.
- La entrada publica de `marketplace_inquiries` sigue siendo un flujo de
  servidor validado y administrativo explicito. `anon` no puede insertar ni
  enumerar la tabla directamente.

## Clientes de aplicacion

`createSupabaseSessionClient()` siempre crea el cliente de servidor basado en
cookies. Los accesos ordinarios de clientes, vehiculos, cotizaciones, ordenes,
mecanicos, agenda y la faceta de taller de solicitudes usan este cliente, por
lo que el JWT del usuario llega a Postgres y RLS participa en la autorizacion.

`createSupabaseDataClient()` no se cambio globalmente. Las familias fuera del
grupo conservan su comportamiento hasta su propia migracion. Las vias
administrativas permanecen explicitas en shares publicos y en la recepcion
publica validada de solicitudes.

## Verificacion

`supabase/tests/operation_rls.test.sql` contiene 54 pruebas pgaTAP. Cubre:

- ausencia de grants directos para `anon`;
- dos talleres aislados;
- owner, admin, jefe de taller, recepcion, finanzas y mecanico del mismo taller;
- ordenes y citas asignadas y no asignadas al mecanico;
- referencias padre/hija manipuladas con IDs del otro taller;
- columnas privadas de mecanicos;
- proyeccion financiera de ordenes;
- historial append-only.

En local puede ejecutarse con:

```sh
supabase test db
```

La validacion de esta entrega se ejecuto contra PostgreSQL local en una sola
transaccion que aplico primero las dos migraciones de identidad y termino en
`ROLLBACK`; las 54 pruebas pasaron y no se persistieron cambios de validacion.

## Tablas pendientes del grupo

Ninguna. Las 13 tablas enumeradas para Operacion estan incluidas. Las facetas
publicas o de propietario que tambien tocan `marketplace_inquiries`, talleres,
resenas o solicitudes del propietario pertenecen al grupo Propietario y
publico y quedan deliberadamente fuera de esta migracion.
