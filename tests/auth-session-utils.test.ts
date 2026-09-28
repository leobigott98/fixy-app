import { equal } from "node:assert/strict";
import { test } from "node:test";

import { isAlreadyRegisteredAuthError } from "@/lib/auth/session-utils";

test("reconoce las respuestas de Supabase para usuarios ya registrados", () => {
  equal(
    isAlreadyRegisteredAuthError(
      "A user with this email address has already been registered  ",
    ),
    true,
  );
  equal(isAlreadyRegisteredAuthError("User already registered"), true);
  equal(isAlreadyRegisteredAuthError("User already exists"), true);
});

test("no oculta errores de autenticacion distintos", () => {
  equal(isAlreadyRegisteredAuthError("Unable to connect to Auth"), false);
  equal(isAlreadyRegisteredAuthError("Invalid service role key"), false);
});
