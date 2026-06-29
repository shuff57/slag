import { requireUser, json } from "../_lib/util.js";

export async function onRequestGet(context) {
  const user = await requireUser(context);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  return json({ email: user.email });
}
