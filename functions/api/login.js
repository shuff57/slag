import { hashPassword, verifyPassword, signJWT, sessionCookie, json } from "../_lib/util.js";

// A fixed dummy hash so a missing email costs the same time as a real verify
// (mitigates user-enumeration via timing). Value is irrelevant.
const DUMMY = { salt: "AAAAAAAAAAAAAAAAAAAAAA==", hash: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" };

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request" }, { status: 400 }); }
  let { email, password } = body || {};
  if (typeof email !== "string" || typeof password !== "string")
    return json({ error: "Invalid email or password" }, { status: 401 });
  email = email.trim().toLowerCase();

  const row = await env.DB.prepare("SELECT id,email,salt,hash FROM users WHERE email=?").bind(email).first();
  const ok = row
    ? await verifyPassword(password, row.salt, row.hash)
    : (await hashPassword(password, Uint8Array.from(atob(DUMMY.salt), (c) => c.charCodeAt(0))), false);
  if (!ok) return json({ error: "Invalid email or password" }, { status: 401 });

  const token = await signJWT({ sub: row.id, email: row.email }, env.JWT_SECRET);
  return json({ email: row.email }, { headers: { "Set-Cookie": sessionCookie(token) } });
}
