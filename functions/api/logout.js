import { clearCookie, json } from "../_lib/util.js";

export async function onRequestPost() {
  return json({ ok: true }, { headers: { "Set-Cookie": clearCookie() } });
}
