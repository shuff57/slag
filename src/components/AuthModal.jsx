import React, { useState } from "react";
import { X } from "lucide-react";
import { C, MONO, lbl } from "../lib/theme.js";
import { api } from "../lib/api.js";

export default function AuthModal({ onClose, onAuth }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const field = { background: C.panel2, color: C.text, border: `1px solid ${C.line}`, fontFamily: MONO };

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const r = mode === "login" ? await api.login(email, password) : await api.signup(email, password);
      onAuth(r.email);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>
          <button onClick={onClose} aria-label="Close"><X size={20} color={C.mute} /></button>
        </div>
        <p style={{ fontSize: 12, color: C.mute, marginBottom: 14 }}>
          Save your machine tweaks to your account so they follow you across devices.
        </p>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Email</label>
            <input type="email" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} style={field} required />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Password</label>
            <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password} onChange={(e) => setPassword(e.target.value)} style={field} required minLength={8} />
          </div>
          {err && <div className="warn" style={{ marginBottom: 12 }}><span>{err}</span></div>}
          <button className="primary" type="submit" disabled={busy}>
            {busy ? "…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button className="link-btn" style={{ marginTop: 12 }}
          onClick={() => { setErr(""); setMode(mode === "login" ? "signup" : "login"); }}>
          {mode === "login" ? "Need an account? Create one" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
