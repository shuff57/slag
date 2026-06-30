import { requireUser, json } from "../../_lib/util.js";

const PROCS = ["mig", "flux", "stick", "tig"];

// Validate a custom machine at the trust boundary (don't store junk).
function badMachine(m) {
  if (!m || typeof m !== "object") return "Invalid machine";
  if (typeof m.brand !== "string" || !m.brand.trim()) return "Brand required";
  if (typeof m.model !== "string" || !m.model.trim()) return "Model required";
  if (!Array.isArray(m.processes) || m.processes.length === 0 || !m.processes.every((p) => PROCS.includes(p)))
    return "Invalid processes";
  if (typeof m.ampMax !== "number") return "Invalid ampMax";
  if ((m.processes.includes("mig") || m.processes.includes("flux")) && !m.mig) return "Wire-feed machine needs mig calibration";
  if (m.processes.includes("stick") && !m.stick) return "Stick machine needs amp range";
  if (m.processes.includes("tig") && !m.tig) return "TIG machine needs amp range";
  return null;
}

export async function onRequestGet(context) {
  const user = await requireUser(context);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const { results } = await context.env.DB
    .prepare("SELECT id,data_json FROM machines WHERE user_id=? ORDER BY created_at DESC")
    .bind(user.sub).all();
  const machines = results.map((r) => ({ ...JSON.parse(r.data_json), id: r.id, custom: true }));
  return json({ machines });
}

export async function onRequestPost(context) {
  const user = await requireUser(context);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  let m;
  try { m = await context.request.json(); } catch { return json({ error: "Bad request" }, { status: 400 }); }
  const err = badMachine(m);
  if (err) return json({ error: err }, { status: 400 });

  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const data = { ...m, id, custom: true };
  await context.env.DB
    .prepare("INSERT INTO machines (id,user_id,data_json,created_at) VALUES (?,?,?,?)")
    .bind(id, user.sub, JSON.stringify(data), createdAt).run();
  return json(data, { status: 201 });
}
