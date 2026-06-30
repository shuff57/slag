// Thin client for the Cloudflare Pages Functions API. Session is an HttpOnly
// cookie, so requests just need credentials: same-origin.
async function req(path, opts = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  me: () => req("/api/me"),
  signup: (email, password) => req("/api/signup", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email, password) => req("/api/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => req("/api/logout", { method: "POST" }),
  listTweaks: () => req("/api/tweaks"),
  saveTweak: (t) => req("/api/tweaks", { method: "POST", body: JSON.stringify(t) }),
  deleteTweak: (id) => req(`/api/tweaks/${encodeURIComponent(id)}`, { method: "DELETE" }),
  listMachines: () => req("/api/machines"),
  saveMachine: (m) => req("/api/machines", { method: "POST", body: JSON.stringify(m) }),
  deleteMachine: (id) => req(`/api/machines/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
