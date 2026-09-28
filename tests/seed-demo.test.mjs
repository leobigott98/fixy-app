import assert from "node:assert/strict";
import test from "node:test";

import {
  assertSafeLocalSupabaseUrl,
  validateSeedPassword,
} from "../scripts/seed-demo.mjs";

test("seed demo accepts only the configured loopback Supabase endpoint", () => {
  assert.equal(
    assertSafeLocalSupabaseUrl("http://127.0.0.1:54321").origin,
    "http://127.0.0.1:54321",
  );
  assert.equal(
    assertSafeLocalSupabaseUrl("http://localhost:54321").origin,
    "http://localhost:54321",
  );
});

test("seed demo rejects remote, ambiguous and non-default targets", () => {
  for (const target of [
    "https://project.supabase.co",
    "http://127.0.0.1:54322",
    "http://localhost:54321/rest/v1",
    "https://localhost:54321",
  ]) {
    assert.throws(() => assertSafeLocalSupabaseUrl(target), /Supabase local/);
  }
});

test("seed demo requires a nontrivial password from the environment", () => {
  assert.equal(validateSeedPassword("correcta-local-123"), "correcta-local-123");
  assert.throws(() => validateSeedPassword(undefined), /FIXY_SEED_PASSWORD/);
  assert.throws(() => validateSeedPassword("corta"), /12 caracteres/);
});
