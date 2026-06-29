import { credError, hashPassword, signJWT, sessionCookie, json } from "../_lib/util.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request" }, { status: 400 }); }
  let { email, password } = body || {};
  const err = credError(email, password);
  if (err) return json({ error: err }, { status: 400 });
  email = email.trim().toLowerCase();

  const { salt, hash } = await hashPassword(password);
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare("INSERT INTO users (id,email,salt,hash,created_at) VALUES (?,?,?,?,?)")
      .bind(id, email, salt, hash, Date.now()).run();
  } catch {
    // UNIQUE(email) violation. Signup necessarily reveals existence; login does not.
    return json({ error: "That email is already registered" }, { status: 409 });
  }
  const token = await signJWT({ sub: id, email }, env.JWT_SECRET);
  return json({ email }, { status: 201, headers: { "Set-Cookie": sessionCookie(token) } });
}
