# Plan de seguridad de base de datos

Fecha de la revisión: 2026-09-23

## Alcance y límites de esta revisión

Esta revisión fue de solo lectura. Se inspeccionaron:

- las 19 migraciones de `supabase/migrations/`;
- `lib/data/core.ts`, las dos fábricas de clientes Supabase y los accesos de `lib/data/` necesarios para reconstruir operaciones y roles;
- `lib/permissions.ts` como expresión actual de los permisos de negocio;
- el catálogo de la instancia Supabase local configurada en `.env.local`, únicamente mediante `pg_class`, `pg_policies`, `pg_roles` e `information_schema.role_table_grants`.

No se consultó ninguna fila de tablas de aplicación, `auth.users` ni datos de clientes. La configuración alojada de `.env` no fue consultada. No se mostraron credenciales. No se ejecutó DDL, no se habilitó RLS, no se creó o reemplazó ninguna policy y no se cambió el cliente global.

El estado de catálogo descrito abajo corresponde sólo a la BD local/de pruebas encontrada; no debe extrapolarse a producción sin una revisión igualmente acotada de su catálogo.

## Resultado ejecutivo

El estado local actual no tiene aislamiento en la base de datos:

- Las 30 tablas de aplicación del esquema `public` tienen `relrowsecurity = false` y `relforcerowsecurity = false`.
- `pg_policies` no contiene ninguna policy para `public` ni para `storage`.
- `anon`, `authenticated` y `service_role` tienen en las 30 tablas de `public`: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` y `TRIGGER`.
- Las migraciones no contienen `ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`, `GRANT` ni `REVOKE`.
- `supabase/config.toml` deja `auto_expose_new_tables` sin definir; el comportamiento local observado coincide con el valor por defecto que autoexpone tablas nuevas a los roles de Data API.
- Las tablas internas de `storage` tienen RLS habilitado, pero no hay policies. El bucket `fixy-assets` se declara público en migraciones, por lo que sus objetos pueden servirse públicamente aunque el catálogo de `storage.objects` no tenga policy de lectura.
- El rol PostgreSQL `service_role` tiene `BYPASSRLS` en la instancia local.

La aplicación reduce parte del riesgo mediante filtros `workshop_id`, `owner_profile_id`, validaciones de sesión y guardas de permisos. Esos controles son útiles, pero hoy son la única barrera y no sustituyen RLS. Un acceso directo a la Data API con las claves públicas no queda limitado por las reglas de negocio del código.

## Cuándo `service_role` omite RLS

`createSupabaseDataClient()` en `lib/data/core.ts` elige `createSupabaseAdminClient()` siempre que exista `SUPABASE_SERVICE_ROLE_KEY`. Tanto `.env.local` como `.env` declaran esa variable. El cliente administrativo se construye con la clave `service_role`; en la BD local ese rol tiene `rolbypassrls = true`.

Por tanto:

1. Cuando la variable existe, todas las consultas que usan `createSupabaseDataClient()` se ejecutan como `service_role` y omiten RLS, aunque se habiliten policies posteriormente.
2. Esto incluye lecturas y escrituras ordinarias de talleres, propietarios, marketplace, finanzas e inventario, no sólo tareas administrativas.
3. Los filtros `.eq("workshop_id", ...)` y las guardas de TypeScript siguen aplicando, pero la BD no aporta una segunda barrera.
4. `lib/data/public-shares.ts` usa deliberadamente el cliente administrativo para leer y aprobar por token; `app/api/uploads/route.ts` también lo usa para Storage. Esos flujos deben considerarse privilegiados y auditarse por separado.
5. El cliente de servidor basado en cookies sólo se usa como alternativa cuando falta la clave y para Auth. En el entorno normalmente configurado, no protege las operaciones de `lib/data/` con el JWT del usuario.

RLS nunca debe considerarse una defensa frente a `service_role`. El objetivo posterior debe ser reservar ese cliente para un conjunto pequeño y explícito de operaciones administrativas. Esta revisión no cambia el cliente global, tal como se solicitó.

## Modelo de roles para la matriz

Hay dos capas distintas:

- Roles de Data API: `anon`, `authenticated`, `service_role`.
- Roles de negocio del taller: `owner`, `admin`, `jefe_taller`, `recepcion`, `finanzas`, `mechanic`; además `car_owner` para propietarios de vehículos.

Abreviaturas usadas en la matriz objetivo:

| Abreviatura | Rol |
|---|---|
| `OWN` | `owner` del taller |
| `ADM` | `admin` del taller |
| `JT` | `jefe_taller` |
| `REC` | `recepcion` |
| `FIN` | `finanzas` |
| `MEC` | `mechanic`; siempre limitado a su mecánico/orden asignada |
| `CAR` | propietario del vehículo autenticado; siempre limitado a su `auth.uid()` |
| `PUB` | visitante `anon` |
| `SR` | backend privilegiado con `service_role`; fuera de RLS y no apto para autorización ordinaria |

`S`, `I`, `U` y `D` significan `SELECT`, `INSERT`, `UPDATE` y `DELETE`. “RPC” significa que la operación pública debe pasar por una función o endpoint de proyección estrecha, no por acceso directo a la tabla.

## Matriz objetivo tabla / operación / rol

Esta matriz es el objetivo recomendado a validar con producto. No describe el estado actual: hoy los tres roles de Data API tienen todas las operaciones en todas las tablas de `public` y RLS está apagado.

| Grupo | Tabla | Lectura (`S`) | Alta (`I`) | Cambio (`U`) | Baja (`D`) | Alcance obligatorio |
|---|---|---|---|---|---|---|
| Identidad | `workshops` | `OWN/ADM/JT/REC/FIN/MEC` del taller; `PUB/CAR` sólo proyección pública | usuario autenticado en onboarding, una vez | `OWN/ADM` | sin acceso directo | miembro activo por `workshop_id`; público sólo si `profile_visibility='public'` y sin campos privados |
| Identidad | `workshop_members` | `OWN` todas; miembro su propia fila | `OWN` o RPC de aceptación | `OWN`; miembro sólo campos propios no sensibles si se habilita | `OWN` | membresía unida a `auth.uid()`, no por email/teléfono en cada request |
| Identidad | `workshop_member_invites` | `OWN`; invitado sólo invitación vinculada a su identidad | `OWN` | `OWN`; aceptación por RPC de transición | `OWN` | taller propio, estado válido y destinatario exacto |
| Operación | `mechanics` | `OWN/ADM/JT/REC`; `MEC` su perfil; lectura mínima desde selectores autorizados | `OWN/ADM/JT` | `OWN/ADM/JT` | `OWN/ADM` | mismo taller; no exponer teléfono/notas a roles que sólo asignan |
| Operación | `clients` | `OWN/ADM/REC/FIN` | `OWN/ADM/REC/FIN` | `OWN/ADM/REC/FIN` | `OWN/ADM` | mismo taller |
| Operación | `vehicles` | `OWN/ADM/REC/FIN` | `OWN/ADM/REC/FIN` | `OWN/ADM/REC/FIN` | `OWN/ADM` | mismo taller y `client_id` del mismo taller |
| Operación | `vehicle_photos` | igual que `vehicles` | `OWN/ADM/REC/FIN` | `OWN/ADM/REC/FIN` | `OWN/ADM/REC/FIN` | vehículo y taller coincidentes |
| Operación | `quotes` | `OWN/ADM/REC/FIN`; `PUB` sólo RPC por token | `OWN/ADM/REC/FIN` | `OWN/ADM/REC/FIN`; aprobación pública sólo RPC por token | `OWN/ADM`, preferible borrado lógico | mismo taller; token habilitado y proyección limitada para público |
| Operación | `quote_items` | igual que la cotización padre; `PUB` sólo dentro de RPC por token | `OWN/ADM/REC/FIN` | `OWN/ADM/REC/FIN` | `OWN/ADM/REC/FIN` | `quote_id` y `workshop_id` deben coincidir |
| Operación | `work_orders` | `OWN/ADM/JT/REC`; `FIN` sólo campos financieros; `MEC` sólo asignadas; `PUB` sólo RPC por token | `OWN/ADM/JT/REC` | `OWN/ADM/JT/REC`; `MEC` sólo transición/reportes expresamente definidos | `OWN/ADM` | mismo taller y, para `MEC`, `assigned_mechanic_id` propio |
| Operación | `work_order_services` | roles que pueden ver la orden; `PUB` sólo RPC por token | `OWN/ADM/JT/REC` | `OWN/ADM/JT/REC` | `OWN/ADM/JT/REC` | orden padre visible y taller coincidente |
| Operación | `work_order_parts` | roles que pueden ver la orden; `FIN` lectura; `PUB` sólo RPC por token | `OWN/ADM/JT/REC` | `OWN/ADM/JT/REC` | `OWN/ADM/JT/REC` | orden padre visible y taller coincidente |
| Operación | `work_order_status_history` | roles que pueden ver la orden; `PUB` sólo RPC por token | `OWN/ADM/JT/REC`; `MEC` sólo reporte autorizado | append-only | sin acceso directo | orden padre visible, actor y transición válida |
| Operación | `work_order_reference_photos` | roles que pueden ver la orden | `OWN/ADM/JT/REC`; `MEC` sólo si se decide permitir reporte | metadatos sólo por flujo controlado | `OWN/ADM/JT/REC` | orden padre visible y taller coincidente |
| Operación | `appointments` | `OWN/ADM/JT/REC/FIN`; `MEC` sólo asignadas; `CAR` sus solicitudes mediante su tabla | `OWN/ADM/JT/REC` | `OWN/ADM/JT/REC`; no `MEC` | `OWN/ADM/REC` | mismo taller; mecánico asignado; relaciones del mismo taller |
| Finanzas | `payments` | `OWN/ADM/FIN`; `PUB` sólo proyección de recibo/orden si el producto lo exige | `OWN/ADM/FIN` | `OWN/ADM/FIN` mediante transición | sin borrado directo | mismo taller; referencias del mismo taller |
| Finanzas | `expenses` | `OWN/ADM/FIN` | `OWN/ADM/FIN` | `OWN/ADM/FIN` | `OWN/ADM` | mismo taller |
| Finanzas | `expense_assets` | `OWN/ADM/FIN` | `OWN/ADM/FIN` | `OWN/ADM/FIN` | `OWN/ADM/FIN` | gasto padre visible y taller coincidente |
| Finanzas | `commissions` | `OWN/ADM/FIN`; `MEC` sólo propia si se incorpora esa función | `OWN/ADM/FIN` | `OWN/ADM/FIN` | `OWN/ADM` | mismo taller y mecánico relacionado |
| Inventario | `inventory_items` | `OWN/ADM/FIN`; `REC` sólo proyección para cotizar/usar repuestos | `OWN/ADM/FIN` | `OWN/ADM/FIN`; ajustes de uso por flujo controlado de `REC` | `OWN/ADM` | mismo taller |
| Inventario | `inventory_movements` | `OWN/ADM/FIN`; `REC` sólo movimientos generados por su orden | `OWN/ADM/FIN`; `REC` sólo RPC de consumo de orden | append-only | sin acceso directo | ítem y referencia del mismo taller; impedir stock negativo si aplica |
| Inventario | `suppliers` | `OWN/ADM/FIN` | `OWN/ADM/FIN` | `OWN/ADM/FIN` | `OWN/ADM/FIN` | mismo taller |
| Inventario | `purchase_orders` | `OWN/ADM/FIN` | `OWN/ADM/FIN` | `OWN/ADM/FIN` | `OWN/ADM` | mismo taller y proveedor del mismo taller |
| Inventario | `purchase_order_items` | `OWN/ADM/FIN` | `OWN/ADM/FIN` | `OWN/ADM/FIN` | `OWN/ADM/FIN` | orden, ítem de inventario y taller coincidentes |
| Propietario | `owner_profiles` | `CAR` propia; personal de taller sólo proyección ligada a una solicitud de su taller | `CAR` propia | `CAR` propia | `CAR` propia o cierre de cuenta controlado | `auth_user_id = auth.uid()` |
| Propietario | `owner_vehicles` | `CAR` propios; taller sólo vehículo ligado a solicitud de su taller | `CAR` | `CAR` | `CAR` | perfil propietario propio |
| Propietario | `owner_appointment_requests` | `CAR` propias; `OWN/ADM/REC/FIN` sólo solicitudes dirigidas a su taller | `CAR` | `CAR` antes de confirmación; `OWN/ADM/REC` sólo respuesta/estado | `CAR` sólo mientras esté en borrador, si se admite | propietario propio y taller destinatario |
| Propietario | `owner_service_records` | `CAR` propios; taller sólo registros que él emitió si se incorpora ese flujo | `CAR` en el código actual, pero se recomienda origen verificado del taller | `CAR` sólo notas propias; taller campos de servicio | cierre de cuenta controlado | propietario/vehículo propios; evitar que el usuario fabrique historial “verificado” |
| Público | `marketplace_inquiries` | `OWN/ADM/REC/FIN` del taller; `CAR` sólo la vinculada a su solicitud | `PUB` y `CAR` para un taller público, preferiblemente RPC | `OWN/ADM/REC` para estado; `CAR` no cambia respuesta del taller | `OWN/ADM` o retención automática | nunca lectura pública; taller destinatario |
| Público | `workshop_reviews` | `PUB/CAR` sólo `approved`; taller ve las de su taller | `PUB` como `pending`; `CAR` vinculada a su perfil/vehículo | taller sólo respuesta/estado; `CAR` sólo su reseña antes de moderación | moderación `OWN/ADM` | separar creación, moderación y respuesta; nunca autoaprobar anónimo |
| Público | `storage.objects` (`fixy-assets`) | público sólo prefijos realmente públicos; autenticado según entidad | endpoint/RPC privilegiado o policy por prefijo y propietario | mismo criterio | mismo criterio | validar `bucket_id`, prefijo, taller/propietario y tipo de archivo |

`SR` no aparece como autorización de negocio en la tabla porque puede ejecutar todas las filas al margen de RLS. Debe usarse sólo en endpoints privilegiados con validaciones completas y logs.

## Discrepancias entre código, migraciones y BD local

### Críticas

1. **RLS inexistente en `public`.** Las migraciones no lo configuran y el catálogo local confirma que está deshabilitado en las 30 tablas.
2. **Policies inexistentes.** No hay ninguna policy, ni siquiera para las tablas del portal del propietario o marketplace.
3. **Grants excesivos.** `anon` y `authenticated` pueden ejecutar todas las operaciones de tabla, incluidas `TRUNCATE`, `TRIGGER` y `REFERENCES`. Los filtros del código no protegen llamadas directas a la Data API.
4. **El cliente de datos ordinario es privilegiado.** La presencia de `SUPABASE_SERVICE_ROLE_KEY` hace que `createSupabaseDataClient()` use `service_role`, que tiene `BYPASSRLS`.
5. **No hay vínculo estable entre membresía y `auth.uid()`.** `workshop_members` no tiene `auth_user_id`; el código busca membresías por email/teléfono. El propietario del taller se reconoce comparando `workshops.owner_email` con el email de sesión. Esto dificulta policies seguras, cambios de email, identidades telefónicas y prevención de suplantación/colisiones.

### Altas

6. **Las guardas no se aplican de forma uniforme.** `clients`, `vehicles`, `quotes`, finanzas, inventario, proveedores y compras usan `requireWorkshopOperation`; `work-orders`, `mechanics`, `appointments`, `reports` y varias funciones de dashboard dependen de `requireCurrentWorkshop` y controles ad hoc.
7. **Matriz de módulos y matriz de operaciones divergen.** `jefe_taller` ve vehículos, órdenes, mecánicos y calendario en `roleModules`, pero no aparece en las operaciones correspondientes. `finanzas` ve órdenes y calendario, pero `work_orders.view` lo excluye. En sentido contrario, `appointments` sólo bloquea explícitamente a `mechanic`, por lo que otros roles activos pueden escribir.
8. **Recepción necesita inventario indirectamente.** Puede gestionar cotizaciones y órdenes, y esos formularios consultan `inventory_items`, aunque `inventory.view` no permite `recepcion`. Una policy literal basada en la matriz actual rompería ese flujo; conviene una vista/RPC de catálogo de repuestos o conceder una lectura mínima.
9. **Mecánicos no están protegidos por una guarda de operación.** `lib/data/mechanics.ts` sólo exige pertenecer a algún taller; la UI oculta el módulo a ciertos roles, pero la función permite leer y escribir perfiles de mecánicos a cualquier miembro activo que pueda invocarla.
10. **Relaciones multitenant no están cerradas en la BD.** Muchas tablas guardan `workshop_id` junto con FKs simples (`client_id`, `vehicle_id`, `quote_id`, etc.). Nada impide que la FK apunte a una fila de otro taller si la aplicación falla. Las policies deben validar tanto la fila como sus padres, y a medio plazo convienen claves/constraints compuestas o funciones de escritura transaccionales.

### Públicas y de propietario

11. **Las rutas públicas usan el mismo selector de cliente.** Marketplace, creación de solicitudes y reseñas pasan por `createSupabaseDataClient()`; con la configuración normal son operaciones `service_role`. La seguridad queda sólo en validaciones del servidor.
12. **Reseñas anónimas se crean aprobadas.** `createMarketplaceReview()` inserta `status='approved'` y `published_at` inmediatamente. El plan recomienda `pending` para `PUB` y moderación separada.
13. **Shares por token usan acceso administrativo.** Esto evita exponer tablas directamente, lo cual es una buena dirección, pero el endpoint debe devolver una proyección mínima, validar `public_share_enabled`, aplicar rate limiting y no reutilizar el cliente privilegiado fuera de ese caso.
14. **Historial del propietario no tiene procedencia fuerte.** El código permite que `CAR` inserte `owner_service_records`; no debe presentarse como historial verificado del taller sin firma/origen diferenciado.
15. **Storage no tiene policies.** Los uploads pasan por `service_role` y el bucket completo es público. Los paths deben convertirse en fronteras explícitas, no sólo convenciones de nombres.

## Plan por grupos

### 0. Preparación común

Antes de habilitar RLS:

1. Aprobar la matriz de negocio, en especial los conflictos `JT`, `FIN`, calendario, acceso mínimo de recepción a inventario y acciones permitidas al mecánico.
2. Añadir pruebas de autorización con al menos dos talleres, dos propietarios, un miembro inactivo y una orden asignada a otro mecánico. Probar acceso permitido y denegado para cada operación.
3. Definir helpers RLS pequeños y estables: identidad del propietario, membresía activa, rol en taller y mecánico vinculado. Si son `SECURITY DEFINER`, fijar `search_path`, calificar esquemas, hacerlos no mutables y limitar `EXECUTE`.
4. Separar proyecciones públicas de tablas internas mediante vistas seguras o RPCs con columnas explícitas. No usar `SELECT *` para perfiles públicos ni shares.
5. Desactivar la autoexposición de tablas nuevas o establecer default privileges restrictivos en una migración futura. Ninguna tabla nueva debería heredar acceso completo para `anon`/`authenticated`.
6. Revocar de los roles Data API `TRUNCATE`, `TRIGGER` y `REFERENCES`; otorgar sólo `SELECT/INSERT/UPDATE/DELETE` cuando una policy y un caso de uso lo requieran.
7. Ejecutar cada grupo primero en local/pruebas y comparar catálogo esperado vs. real. El despliegue debe fallar si una tabla expuesta carece de RLS o policy intencional.

### 1. Identidad y membresías

Tablas: `workshops`, `workshop_members`, `workshop_member_invites`, `mechanics` y los helpers de autorización.

1. Incorporar un vínculo único y verificable `auth_user_id` en `workshop_members`; mantener email/teléfono como contacto, no como clave de autorización. Vincular también la propiedad del taller a un UUID de Auth o a una membresía `owner` única.
2. Hacer el backfill sólo con correspondencias inequívocas. Duplicados o invitaciones ambiguas deben quedar en cuarentena, no resolverse por heurística.
3. Definir helpers como `is_active_workshop_member(workshop_id)`, `workshop_role(workshop_id)` y `current_mechanic_id(workshop_id)`.
4. Permitir a un miembro leer únicamente lo necesario para resolver su acceso; reservar administración de equipo al rol decidido (`OWN` en el código actual).
5. Convertir aceptación de invitaciones en una transición atómica: validar identidad, bloquear invitación, crear membresía, vincular Auth y marcar aceptación. Evitar `SELECT`/`UPDATE` directos amplios sobre invitaciones.
6. Resolver primero este grupo: todas las policies multitenant de los grupos siguientes dependen de una identidad estable.

### 2. Operación

Tablas: `clients`, `vehicles`, fotos, cotizaciones e ítems, órdenes y tablas hijas, `appointments`, `mechanics`, `marketplace_inquiries` en su lado del taller.

1. Alinear `lib/permissions.ts` y las guardas del servidor. Cada función exportada que lea o escriba datos debe declarar una operación; ocultar módulos en UI no cuenta como control.
2. Aplicar policies por `workshop_id` para lectura y `WITH CHECK` para alta/cambio. En tablas hijas, comprobar también que el padre pertenece al mismo taller.
3. Para `MEC`, derivar el `mechanic_id` desde su membresía y exigir asignación en orden/cita. No aceptar un ID de mecánico proporcionado por el cliente como prueba de identidad.
4. Implementar shares públicos como RPCs/endpoints de proyección por token. Una policy `USING (public_share_enabled)` sería peligrosa porque permitiría listar todas las filas compartidas.
5. Hacer append-only el historial de estados y centralizar transiciones de orden/cita para impedir saltos o cambios parciales.
6. Añadir pruebas de fuga cruzada por cada FK y cada tabla hija.

### 3. Finanzas e inventario

Tablas: `payments`, `expenses`, `expense_assets`, `commissions`, `inventory_items`, `inventory_movements`, `suppliers`, `purchase_orders`, `purchase_order_items`.

1. Limitar datos financieros a `OWN/ADM/FIN`; entregar a otros roles sólo las columnas indispensables mediante proyecciones.
2. No permitir borrado directo de pagos ni movimientos de inventario. Corregir mediante reversos/estados que preserven auditoría.
3. Mover consumo de inventario, recepción de compras y ajustes de stock a operaciones transaccionales que creen el movimiento y actualicen existencias juntas.
4. Dar a `REC` una proyección de catálogo (`id`, nombre, disponibilidad y precio de referencia) o una RPC específica; no acceso completo al costo, notas y movimientos.
5. Validar que proveedor, orden de compra, ítem y movimiento pertenecen al mismo taller. Añadir idempotencia para sincronizaciones de orden.
6. Separar el acceso del mecánico a su comisión, si se desea, del acceso agregado a nómina/comisiones del taller.

### 4. Propietario y público

Tablas: `owner_profiles`, `owner_vehicles`, `owner_appointment_requests`, `owner_service_records`, faceta pública de `workshops`, `marketplace_inquiries`, `workshop_reviews` y `storage.objects`.

1. Basar todas las policies `CAR` en `owner_profiles.auth_user_id = auth.uid()` y encadenar vehículos, solicitudes e historial desde ese perfil.
2. Permitir al taller ver datos del propietario sólo cuando existe una solicitud dirigida a ese taller y sólo mediante una proyección de contacto/vehículo necesaria para atenderla.
3. Exponer del taller únicamente una vista pública con slug, nombre, ciudad, descripción, servicios, contacto público, galería, verificación y resumen de reseñas. Excluir `owner_email`, configuración operativa y métricas.
4. Hacer que solicitudes y reseñas públicas entren por RPC/endpoint estrecho con validación, rate limiting, captcha/antiabuso y estado inicial seguro. No conceder lectura pública a `marketplace_inquiries`.
5. Diferenciar reseñas anónimas, reseñas de propietarios autenticados y respuestas del taller. Publicar sólo `approved`.
6. Marcar el origen de `owner_service_records`: autodeclarado por el propietario o verificado/emitido por un taller.
7. Dividir Storage por prefijos/propietarios y sensibilidad. Un bucket público no debe contener comprobantes de pago, documentos o fotos privadas. Mantener públicos sólo logos/galería destinados al marketplace.

## Orden de implementación y validación

1. **Decisiones y tests:** cerrar contradicciones de roles y crear pruebas negativas multitenant.
2. **Identidad:** añadir vínculos con Auth y helpers; validar backfill.
3. **Policies por grupo:** crear grants mínimos y policies con RLS todavía controlado en local, verificando cada operación.
4. **Habilitación gradual:** identidad/membresías; operación; finanzas/inventario; propietario/público. Cada grupo debe desplegarse con pruebas y posibilidad de rollback de aplicación, no con una habilitación masiva a ciegas.
5. **Clientes de aplicación:** en una tarea posterior, hacer que el tráfico ordinario use el cliente de servidor con sesión y reservar `service_role` para Auth admin, uploads validados y RPCs privilegiadas específicas. No confiar en RLS mientras una ruta siga usando `SR`.
6. **Catálogo como prueba:** incorporar un check CI que falle si una tabla expuesta no tiene RLS, si una policy esperada falta, si `anon` conserva privilegios no previstos o si aparece una tabla nueva autoexpuesta.

## Criterios de salida

El trabajo de seguridad estará listo cuando:

- cada tabla de aplicación tenga RLS habilitado o una justificación explícita y no expuesta;
- toda operación permitida y denegada de la matriz tenga prueba automatizada;
- no haya lectura/escritura cruzada entre talleres o propietarios, incluso manipulando IDs de padres;
- `anon` sólo pueda ejecutar las operaciones públicas estrechas previstas;
- `authenticated` no pueda acceder a una fila por el mero hecho de estar autenticado;
- los grants no incluyan `TRUNCATE`, `TRIGGER` ni `REFERENCES` para roles de Data API;
- las rutas ordinarias no dependan de `service_role` para funcionar;
- los endpoints que sí usan `service_role` tengan validación completa, rate limiting, auditoría y proyección mínima;
- Storage separe activos públicos de comprobantes y fotos privadas.

