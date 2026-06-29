import { requireUser, json } from "../../_lib/util.js";

export async function onRequestGet(context) {
  const user = await requireUser(context);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const { results } = await context.env.DB
    .prepare("SELECT id,name,setup_json,gauges_json,created_at FROM tweaks WHERE user_id=? ORDER BY created_at DESC")
    .bind(user.sub).all();
  const tweaks = results.map((r) => ({
    id: r.id, name: r.name,
    setup: JSON.parse(r.setup_json), gauges: JSON.parse(r.gauges_json),
    createdAt: r.created_at,
  }));
  return json({ tweaks });
}

export async function onRequestPost(context) {
  const user = await requireUser(context);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  let body;
  try { body = await context.request.json(); } catch { return json({ error: "Bad request" }, { status: 400 }); }
  let { name, setup, gauges } = body || {};
  if (typeof name !== "string" || !name.trim()) return json({ error: "Name is required" }, { status: 400 });
  name = name.trim().slice(0, 80);
  if (typeof setup !== "object" || setup === null || typeof gauges !== "object" || gauges === null)
    return json({ error: "Invalid tweak data" }, { status: 400 });

  const id = crypto.randomUUID();
  const createdAt = Date.now();
  await context.env.DB
    .prepare("INSERT INTO tweaks (id,user_id,name,setup_json,gauges_json,created_at) VALUES (?,?,?,?,?,?)")
    .bind(id, user.sub, name, JSON.stringify(setup), JSON.stringify(gauges), createdAt).run();
  return json({ id, name, setup, gauges, createdAt }, { status: 201 });
}
