# SLAG — Settings Lookup & Auto-Guide

Enter your weld parameters, get **your specific machine's** dial settings — not a
generic chart. A wire-speed knob that reads 1–10 on one machine and 0–100 on
another both get translated to the position *you* turn it to.

## How it works — two layers

The whole design hinges on separating two things people usually mash together:

1. **Physics** (`src/lib/physics.js`) — brand-agnostic. Process + material +
   thickness + wire/rod diameter → target amperage, wire feed (IPM), voltage,
   gas, tungsten. Same numbers regardless of brand.

2. **Machine translation** (`src/lib/translate.js`) — maps those targets onto a
   *specific* machine's controls using its calibration data, and raises warnings
   for out-of-range feed, over-capacity amps, or DC-only machines asked to weld
   aluminum.

The machine calibration lives in `src/data/machines.json` — **this file is the
real asset.** Each MIG profile carries a `wfs` block:

```json
"wfs": { "dialMin": 0, "dialMax": 100, "ipmMin": 50, "ipmMax": 500 }
```

That says: the physical knob runs 0–100 and spans 50–500 IPM, so the app can
interpolate "target 320 IPM → set the knob to ~61." Voltage is typed as either
`continuous` (a smooth knob) or `taps` (discrete settings). Stick/TIG are
direct-amp with a min/max.

### The honest caveat

The calibration numbers are **approximate starting points**. The accurate way to
fill them is from each machine's inside-the-door chart, the manual's spec page,
or a measured feed test (run the wire for 6 seconds at a known dial, measure the
length, ×10 = IPM). That dataset — measured or crowd-sourced — is the moat. No
one has centralized it.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173 — frontend only (no /api)
npm run build    # outputs to dist/
npm test         # auth + handler self-checks
npm run cf       # build + wrangler pages dev — serves /api + local D1 too
```

`npm run dev` (Vite) does not run the `/api` Functions, so Sign in / Save will
fail there. Use `npm run cf` to exercise auth + saved tweaks locally.

## Accounts & saved tweaks (Cloudflare)

Signed-in users can hit **Tweak** on the results card, dial each gauge to what
actually works on their machine, and **Save** it with a name. Selecting a saved
tweak reloads the full job setup *and* the adjusted gauge values. Everything is
Cloudflare-native:

- **Auth** — `functions/api/{signup,login,logout,me}.js`. Email + password;
  passwords are PBKDF2-SHA256 with a per-user salt (`functions/_lib/util.js`),
  never stored raw. Session is a signed JWT in an HttpOnly+Secure cookie.
- **Data** — Cloudflare **D1** (`slag-db`), tables in `schema.sql`. Bound as
  `env.DB` via `wrangler.toml`. Tweaks are scoped to the owner by `user_id`.

**Required secret:** the API needs `JWT_SECRET`.
- Local: a random one is in `.dev.vars` (gitignored).
- Production: `npx wrangler pages secret put JWT_SECRET` (set once per project).

Skipped for v1 (standard upgrades): email verification, password reset,
app-level rate-limiting (lean on Cloudflare's edge first).

## Deploy to Cloudflare Pages

Two options:

**Dashboard (connect a repo):** Build command `npm run build`, output dir `dist`.

**Wrangler (direct upload):**
```bash
npm run build
npx wrangler pages deploy dist --project-name slag
```

Then point a route like `weld.huffpalmer.fyi` at the Pages project. The service
worker (`public/sw.js`) caches the app shell, so it keeps working in a shop with
no signal. **Bump `CACHE = "slag-v1"` in `sw.js` on each deploy** so clients
pull fresh assets.

## Where to take it next

- **Grow `machines.json`** — the app is only as good as its calibration data.
  Consider a `confidence` flag per profile (`measured` vs `estimated`).
- **User-contributed profiles** — the `+` button adds machines in-session only.
  Accounts + D1 are now wired (see above); persisting custom machines per-user
  is a small extension of the existing `tweaks` pattern.
- **Refine physics** — joint type and welding position both shift amperage;
  add them as inputs. Flux-core vs solid wire changes voltage/polarity.
- **Icons** — `public/icon-*.png` are placeholders. Replace with real artwork.

## File map

```
src/
  data/machines.json     ← calibration dataset (the asset)
  lib/physics.js         ← brand-agnostic target params
  lib/translate.js       ← target → this machine's controls + warnings
  lib/theme.js           ← palette tokens
  components/Dial.jsx     ← rotary readout (signature element)
  components/Seg.jsx
  components/AddMachine.jsx
  components/AuthModal.jsx ← email/password sign-in sheet
  lib/api.js             ← client for the /api Functions
  App.jsx                ← composition
functions/
  _lib/util.js           ← PBKDF2 + JWT + cookie + auth guard
  api/                   ← signup, login, logout, me, tweaks CRUD
public/
  sw.js                  ← offline app-shell cache
  manifest.webmanifest
schema.sql               ← D1 tables (users, tweaks)
wrangler.toml            ← D1 binding + Pages config
```
