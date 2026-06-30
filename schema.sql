-- SLAG auth + tweaks (Cloudflare D1)
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,        -- stored lowercased
  salt       TEXT NOT NULL,               -- base64, per-user
  hash       TEXT NOT NULL,               -- base64 PBKDF2-SHA256
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tweaks (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  setup_json  TEXT NOT NULL,              -- {machineId, process, material, thouThk, wire, rod}
  gauges_json TEXT NOT NULL,              -- {amps, <label>: value, ...} user-adjusted gauge values
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tweaks_user ON tweaks(user_id, created_at);

CREATE TABLE IF NOT EXISTS machines (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data_json   TEXT NOT NULL,              -- the full custom machine object
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_machines_user ON machines(user_id, created_at);
