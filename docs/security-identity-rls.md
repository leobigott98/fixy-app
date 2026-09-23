# RLS de identidad y membresías

La migración `202609230002_identity_membership_rls.sql` aplica el grupo de identidad de `security-db-plan.md` únicamente a:

- `public.workshops`;
- `public.workshop_members`;
- `public.workshop_member_invites`.

No habilita policies sobre tablas operativas, finanzas, marketplace, portal del propietario ni Storage. Tampoco cambia el frontend o los accesos TypeScript existentes.

## Frontera aplicada

- `anon` no tiene acceso directo a ninguna de las tres tablas.
- `authenticated` sólo recibe las operaciones y columnas requeridas; no conserva `TRUNCATE`, `REFERENCES` ni `TRIGGER`.
- El propietario se deriva exclusivamente de `workshops.owner_auth_user_id = auth.uid()`.
- Un miembro activo puede leer el taller y su propia membresía. Una membresía inactiva sólo puede leer su propia fila para observar la revocación.
- Sólo el owner autoritativo puede crear, cambiar, revocar o eliminar membresías e invitaciones.
- Un `admin` puede actualizar campos permitidos del perfil del taller, pero no tiene grant sobre `owner_auth_user_id`.
- Ningún miembro tiene una policy de actualización sobre su propia fila. Aunque `role` sea una columna actualizable para el owner, RLS filtra cualquier intento de autoasignarse `admin`.
- Las filas heredadas de membresía con `role='owner'` no conceden permisos. El owner siempre procede del vínculo del taller.

`service_role` conserva sus grants existentes y sigue omitiendo RLS, tal como documenta el plan. No recibe `EXECUTE` sobre los helpers o la RPC porque no los necesita.

## Alta propia

`owner_auth_user_id` usa `auth.uid()` como valor predeterminado. La policy de alta exige que el UUID sea el del JWT y que `owner_email` coincida exactamente con su correo normalizado. Un índice único parcial limita cada identidad Auth a un taller.

El grant de `INSERT` excluye `verification_status`, timestamps e identificadores generados, por lo que el usuario no puede autoverificarse durante el alta.

## Invitaciones

Las invitaciones incorporan `auth_user_id`. El backfill de invitaciones pendientes aplica las mismas reglas estrictas de la base de identidad: correo normalizado o teléfono exacto, un solo usuario de Auth y nunca semejanza de nombres. Casos sin coincidencia o ambiguos permanecen en `private.identity_link_backfill_issues`.

`public.accept_workshop_member_invite(invite_id)` es la única transición disponible para el destinatario:

1. bloquea la invitación pendiente;
2. usa el vínculo Auth existente o exige una única coincidencia exacta con `auth.uid()`;
3. copia taller y rol desde la invitación creada por el owner;
4. crea la membresía y marca la invitación como aceptada en la misma transacción.

La función es `SECURITY DEFINER`, fija `search_path` vacío, recibe únicamente el ID de invitación y concede `EXECUTE` sólo a `authenticated`. No permite reactivar una membresía revocada: esa decisión vuelve a requerir una acción explícita del owner.

## Verificación local

`supabase/tests/identity_membership_rls.test.sql` ejecuta 35 pruebas con roles PostgreSQL reales. Cubre alta propia, aislamiento de dos talleres, aceptación exacta, rechazo de otro usuario, cancelación, revocación, invitación obsoleta y escaladas negativas sobre `role`, `auth_user_id` y `owner_auth_user_id`.

Ejecutar sólo en local/pruebas:

```sh
supabase test db
```

No se debe aplicar directamente a producción sin revisar antes `private.identity_link_backfill_issues`, identidades duplicadas y los flujos que todavía usan `service_role`.
