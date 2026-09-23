# Base de identidad para políticas

La migración `202609230001_identity_policy_foundation.sql` implementa únicamente la base de identidad descrita en `security-db-plan.md`. No habilita RLS, no crea policies para tablas operativas, no conecta otras entidades y no cambia el frontend.

## Vínculos autoritativos

- `workshops.owner_auth_user_id` referencia `auth.users.id` y representa al propietario del taller.
- `workshop_members.auth_user_id` referencia `auth.users.id`; correo y teléfono quedan como datos de contacto, no como prueba de autorización.
- Un usuario puede pertenecer a más de un taller, pero sólo puede tener una membresía vinculada por taller.
- Si el usuario de Auth se elimina, el vínculo pasa a `NULL` y deja de autorizar, en vez de conservar un UUID huérfano.

## Reglas del backfill

La resolución automática sólo acepta:

- propietario: correo recortado, comparado sin distinguir mayúsculas, con exactamente un usuario de Auth no eliminado;
- miembro: correo bajo la misma regla o teléfono recortado exactamente, siempre que todos los identificadores coincidan con un único usuario de Auth;
- una sola fila de membresía por combinación taller/usuario.

No se comparan nombres ni se usa semejanza de texto. Si correo y teléfono apuntan a usuarios distintos, hay varios candidatos, no existe coincidencia exacta o dos filas del mismo taller terminarían en el mismo usuario, `auth_user_id` queda en `NULL`.

Los casos pendientes quedan en `private.identity_link_backfill_issues`, sin acceso para `anon` ni `authenticated`. Para revisarlos en un entorno controlado con privilegios administrativos:

```sql
select
  entity_type,
  entity_id,
  workshop_id,
  issue_code,
  source_email,
  source_phone,
  candidate_auth_user_ids
from private.identity_link_backfill_issues
order by recorded_at, entity_type, entity_id;
```

La corrección debe confirmar externamente el UUID exacto de Auth y actualizar la fila de origen de forma explícita. No se debe resolver un pendiente por parecido del nombre.

## Helpers disponibles

- `public.is_active_workshop_member(workshop_id)` devuelve pertenencia efectiva para `auth.uid()`.
- `public.workshop_role(workshop_id)` devuelve `owner` para el propietario vinculado o el rol de una membresía activa del mismo taller.

Ambos helpers son `STABLE SECURITY DEFINER`, tienen `search_path` vacío, califican todos los objetos por esquema y sólo aceptan el taller. El llamador no puede proporcionar otro usuario ni un rol deseado. `EXECUTE` se revoca de `PUBLIC` y `anon`, y se concede sólo a `authenticated`.

Estos helpers preparan policies futuras; por sí solos no sustituyen RLS. El resto de grants, tablas y rutas privilegiadas señaladas en el plan permanecen fuera de esta migración.

## Verificación local

`supabase/tests/identity_membership.test.sql` crea dentro de una transacción dos talleres y varias identidades. Comprueba propietarios, roles distintos del mismo usuario por taller, membresía inactiva, aislamiento de un usuario externo, ausencia de autoescalada y permisos de ejecución. El test termina con `ROLLBACK`.

Ejecutar sólo contra la base local/de pruebas después de aplicar las migraciones:

```sh
supabase test db
```

No ejecutar la migración ni el test directamente sobre producción sin revisar primero los pendientes y el catálogo de ese entorno.
