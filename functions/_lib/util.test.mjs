// Run: node functions/_lib/util.test.mjs
// Self-check for the auth primitives. No framework — asserts + exit code.
import assert from "node:assert";
import { webcrypto } from "node:crypto";
globalThis.crypto ??= webcrypto; // Workers has this global; Node needs the shim.

const { hashPassword, verifyPassword, signJWT, verifyJWT, credError } = await import("./util.js");

// password: same input + salt → same hash; right pw verifies, wrong doesn't.
const { salt, hash } = await hashPassword("hunter2-correct");
assert.ok(await verifyPassword("hunter2-correct", salt, hash), "correct password should verify");
assert.ok(!(await verifyPassword("wrong-password", salt, hash)), "wrong password must fail");

// two hashes of the same password use different salts → different digests.
const a = await hashPassword("samepw");
const b = await hashPassword("samepw");
assert.notStrictEqual(a.hash, b.hash, "per-user salt should differ");

// JWT: round-trips, rejects tampering and bad secret and expiry.
const secret = "test-secret-do-not-use";
const token = await signJWT({ sub: "u1", email: "a@b.co" }, secret);
const payload = await verifyJWT(token, secret);
assert.strictEqual(payload.sub, "u1");
assert.strictEqual(await verifyJWT(token, "other-secret"), null, "wrong secret must fail");
assert.strictEqual(await verifyJWT(token + "x", secret), null, "tampered sig must fail");
const expired = await signJWT({ sub: "u1" }, secret, -10);
assert.strictEqual(await verifyJWT(expired, secret), null, "expired token must fail");

// validation guards
assert.ok(credError("notanemail", "password123"), "bad email rejected");
assert.ok(credError("a@b.co", "short"), "short password rejected");
assert.strictEqual(credError("a@b.co", "longenough"), null, "valid creds pass");

console.log("util.test.mjs: all assertions passed");
