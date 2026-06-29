// Shared helpers for SLAG Pages Functions. Runs on the Cloudflare Workers
// runtime (WebCrypto, btoa/atob, crypto.randomUUID all global). No deps.

const enc = new TextEncoder();
const dec = new TextDecoder();

// ── base64 / base64url ──────────────────────────────────────────────
const b64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64urlBytes = (bytes) => b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlStr = (str) => b64urlBytes(enc.encode(str));
const fromB64urlStr = (s) => dec.decode(fromB64(s.replace(/-/g, "+").replace(/_/g, "/")));

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ── password hashing (PBKDF2-SHA256, per-user salt) ─────────────────
// ponytail: 100k iterations is a sane 2024 floor; bump if you move to a
// heavier KDF (scrypt/argon2 via WASM) when threat model demands it.
export async function hashPassword(password, saltBytes) {
  const salt = saltBytes ?? crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  return { salt: b64(salt), hash: b64(new Uint8Array(bits)) };
}

export async function verifyPassword(password, saltB64, hashB64) {
  const { hash } = await hashPassword(password, fromB64(saltB64));
  return timingSafeEqual(hash, hashB64);
}

// ── JWT (HS256) ─────────────────────────────────────────────────────
async function hmac(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return b64urlBytes(new Uint8Array(sig));
}

const DAY = 60 * 60 * 24;

export async function signJWT(payload, secret, ttlSec = 30 * DAY) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64urlStr(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64urlStr(JSON.stringify({ ...payload, iat: now, exp: now + ttlSec }));
  const data = `${head}.${body}`;
  return `${data}.${await hmac(secret, data)}`;
}

export async function verifyJWT(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  if (!timingSafeEqual(s, await hmac(secret, `${h}.${p}`))) return null;
  let body;
  try { body = JSON.parse(fromB64urlStr(p)); } catch { return null; }
  if (!body.exp || body.exp < Math.floor(Date.now() / 1000)) return null;
  return body;
}

// ── cookies / responses / auth guard ────────────────────────────────
const COOKIE = "slag_session";

export function sessionCookie(token) {
  return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30 * DAY}`;
}
export function clearCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
function readCookie(request, name) {
  const m = (request.headers.get("Cookie") || "").match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? m[1] : null;
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

// Returns the JWT payload ({ sub, email, ... }) or null.
export async function requireUser({ request, env }) {
  const token = readCookie(request, COOKIE);
  if (!token || !env.JWT_SECRET) return null;
  return verifyJWT(token, env.JWT_SECRET);
}

// ── validation (trust boundary — not lazy here) ─────────────────────
export function credError(email, password) {
  if (typeof email !== "string" || typeof password !== "string") return "Invalid input";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return "Enter a valid email address";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 200) return "Password is too long";
  return null;
}
