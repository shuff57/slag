// Run: node functions/_lib/integration.test.mjs
// Exercises the real Pages Function handlers against an in-memory D1 stub,
// using real Request/Response so cookie + JSON + auth-gating flow is covered.
import assert from "node:assert";
import { webcrypto } from "node:crypto";
globalThis.crypto ??= webcrypto;

// ── tiny D1 stub: just enough for the queries our handlers run ──────
function makeDB() {
  const users = [], tweaks = [];
  const prepare = (sql) => ({
    bind: (...a) => ({
      async run() {
        if (sql.startsWith("INSERT INTO users")) {
          const [id, email] = a;
          if (users.some((u) => u.email === email)) throw new Error("UNIQUE");
          users.push({ id, email, salt: a[2], hash: a[3], created_at: a[4] });
        } else if (sql.startsWith("INSERT INTO tweaks")) {
          tweaks.push({ id: a[0], user_id: a[1], name: a[2], setup_json: a[3], gauges_json: a[4], created_at: a[5] });
        } else if (sql.startsWith("DELETE FROM tweaks")) {
          const [id, uid] = a;
          for (let i = tweaks.length - 1; i >= 0; i--)
            if (tweaks[i].id === id && tweaks[i].user_id === uid) tweaks.splice(i, 1);
        }
        return { success: true };
      },
      async first() {
        if (sql.startsWith("SELECT id,email,salt,hash FROM users"))
          return users.find((u) => u.email === a[0]) || null;
        return null;
      },
      async all() {
        if (sql.includes("FROM tweaks"))
          return { results: tweaks.filter((t) => t.user_id === a[0]).sort((x, y) => y.created_at - x.created_at) };
        return { results: [] };
      },
    }),
  });
  return { prepare };
}

const env = { JWT_SECRET: "integration-secret", DB: makeDB() };
const post = (path, body, cookie) =>
  new Request(`https://x${path}`, { method: "POST", body: JSON.stringify(body), headers: cookie ? { Cookie: cookie } : {} });
const get = (path, cookie) => new Request(`https://x${path}`, { headers: cookie ? { Cookie: cookie } : {} });
const del = (path, cookie) => new Request(`https://x${path}`, { method: "DELETE", headers: cookie ? { Cookie: cookie } : {} });
const cookieOf = (res) => (res.headers.get("Set-Cookie") || "").split(";")[0];

const signup = (await import("../api/signup.js")).onRequestPost;
const login = (await import("../api/login.js")).onRequestPost;
const me = (await import("../api/me.js")).onRequestGet;
const tweaks = await import("../api/tweaks/index.js");
const tweakId = (await import("../api/tweaks/[id].js")).onRequestDelete;

// signup
let res = await signup({ request: post("/api/signup", { email: "Welder@Shop.com", password: "goodpass123" }), env });
assert.strictEqual(res.status, 201, "signup 201");
const cookie = cookieOf(res);
assert.ok(cookie.startsWith("slag_session="), "session cookie set");
assert.strictEqual((await res.json()).email, "welder@shop.com", "email lowercased");

// duplicate signup
res = await signup({ request: post("/api/signup", { email: "welder@shop.com", password: "goodpass123" }), env });
assert.strictEqual(res.status, 409, "duplicate email 409");

// short password rejected
res = await signup({ request: post("/api/signup", { email: "a@b.co", password: "short" }), env });
assert.strictEqual(res.status, 400, "short password 400");

// me requires cookie
assert.strictEqual((await me({ request: get("/api/me"), env })).status, 401, "me without cookie 401");
res = await me({ request: get("/api/me", cookie), env });
assert.strictEqual(res.status, 200, "me with cookie 200");

// login wrong + right
assert.strictEqual((await login({ request: post("/api/login", { email: "welder@shop.com", password: "nope" }), env })).status, 401, "wrong pass 401");
res = await login({ request: post("/api/login", { email: "welder@shop.com", password: "goodpass123" }), env });
assert.strictEqual(res.status, 200, "login 200");
const cookie2 = cookieOf(res);

// tweaks require auth
assert.strictEqual((await tweaks.onRequestGet({ request: get("/api/tweaks"), env })).status, 401, "tweaks need auth");

// save + list + delete
res = await tweaks.onRequestPost({ request: post("/api/tweaks", { name: "3/16 alum", setup: { machineId: "miller-215" }, gauges: { Amperage: 175 } }, cookie2), env });
assert.strictEqual(res.status, 201, "save tweak 201");
const saved = await res.json();
let list = (await (await tweaks.onRequestGet({ request: get("/api/tweaks", cookie2), env })).json()).tweaks;
assert.strictEqual(list.length, 1, "one tweak listed");
assert.strictEqual(list[0].gauges.Amperage, 175, "gauges round-trip");

await tweakId({ request: del(`/api/tweaks/${saved.id}`, cookie2), env, params: { id: saved.id } });
list = (await (await tweaks.onRequestGet({ request: get("/api/tweaks", cookie2), env })).json()).tweaks;
assert.strictEqual(list.length, 0, "tweak deleted");

console.log("integration.test.mjs: all assertions passed");
