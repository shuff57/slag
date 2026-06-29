import { requireUser, json } from "../../_lib/util.js";

export async function onRequestDelete(context) {
  const user = await requireUser(context);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  // user_id in the WHERE clause is the authorization check — you can only
  // delete your own rows.
  await context.env.DB.prepare("DELETE FROM tweaks WHERE id=? AND user_id=?")
    .bind(context.params.id, user.sub).run();
  return json({ ok: true });
}
