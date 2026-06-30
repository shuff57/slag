import React, { useState } from "react";
import { X } from "lucide-react";
import { C, MONO, lbl } from "../lib/theme.js";

export default function AddMachine({ onClose, onAdd, signedIn }) {
  const [f, setF] = useState({
    brand: "", model: "", input: "120/240V", ampMax: 200,
    mig: true, flux: false, stick: false, tig: false,
    voltMin: 13, voltMax: 26, dialMax: 100, ipmMin: 50, ipmMax: 500,
    stickMin: 20, stickMax: 150,
    tigMin: 10, tigMax: 200, tigAc: false,
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (k) => (e) => setF({ ...f, [k]: e.target.checked });
  const field = { background: C.panel2, color: C.text, border: `1px solid ${C.line}`, fontFamily: MONO };

  const wireFeed = f.mig || f.flux;

  const num = (label, key, span = 1) => (
    <div style={{ flex: span }}>
      <label style={lbl}>{label}</label>
      <input type="number" value={f[key]} onChange={set(key)} style={field} />
    </div>
  );

  function save() {
    if (!f.brand.trim() || !f.model.trim()) return;
    const procs = [];
    if (f.mig) procs.push("mig", "flux"); // MIG implies flux-core (same wire feeder)
    else if (f.flux) procs.push("flux");
    if (f.stick) procs.push("stick");
    if (f.tig) procs.push("tig");
    if (procs.length === 0) return;

    const m = {
      id: `custom-${Date.now()}`,
      brand: f.brand.trim(),
      model: f.model.trim(),
      input: f.input.trim() || "—",
      processes: procs,
      ampMax: +f.ampMax,
      custom: true,
    };
    if (wireFeed) m.mig = {
      voltage: { type: "continuous", voltMin: +f.voltMin, voltMax: +f.voltMax },
      wfs: { dialMin: 0, dialMax: +f.dialMax, ipmMin: +f.ipmMin, ipmMax: +f.ipmMax },
    };
    if (f.stick) m.stick = { ampMin: +f.stickMin, ampMax: +f.stickMax };
    if (f.tig) m.tig = { ampMin: +f.tigMin, ampMax: +f.tigMax, ac: f.tigAc };
    onAdd(m);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Add a machine</h2>
          <button onClick={onClose} aria-label="Close"><X size={20} color={C.mute} /></button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Brand</label>
          <input type="text" value={f.brand} onChange={set("brand")} style={field} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lbl}>Model</label>
          <input type="text" value={f.model} onChange={set("model")} style={field} />
        </div>
        <div className="row" style={{ gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 2 }}>
            <label style={lbl}>Input voltage</label>
            <input type="text" value={f.input} onChange={set("input")} style={field} />
          </div>
          {num("Max amps", "ampMax", 1)}
        </div>

        <label style={lbl}>Processes</label>
        <div className="mat-filter" style={{ marginTop: 6, marginBottom: 12 }}>
          <label className="mat-check"><input type="checkbox" checked={f.mig} onChange={toggle("mig")} /> MIG (+ flux-core)</label>
          <label className="mat-check"><input type="checkbox" checked={f.mig || f.flux} disabled={f.mig} onChange={toggle("flux")} /> Flux-core</label>
          <label className="mat-check"><input type="checkbox" checked={f.stick} onChange={toggle("stick")} /> Stick</label>
          <label className="mat-check"><input type="checkbox" checked={f.tig} onChange={toggle("tig")} /> TIG</label>
        </div>

        {wireFeed && (
          <>
            <div className="add-section">Wire feed — MIG / flux-core</div>
            <p style={{ fontSize: 12, color: C.mute, margin: "0 0 10px" }}>
              Calibrate the wire-speed knob: what it reads min→max and the real IPM range it spans.
            </p>
            <div className="row" style={{ gap: 10, marginBottom: 10 }}>
              {num("Min volts", "voltMin")}{num("Max volts", "voltMax")}
            </div>
            <div className="row" style={{ gap: 10, marginBottom: 12 }}>
              {num("Dial max (10 / 100)", "dialMax")}{num("IPM at min", "ipmMin")}{num("IPM at max", "ipmMax")}
            </div>
          </>
        )}

        {f.stick && (
          <>
            <div className="add-section">Stick</div>
            <div className="row" style={{ gap: 10, marginBottom: 12 }}>
              {num("Min amps", "stickMin")}{num("Max amps", "stickMax")}
            </div>
          </>
        )}

        {f.tig && (
          <>
            <div className="add-section">TIG</div>
            <div className="row" style={{ gap: 10, marginBottom: 8 }}>
              {num("Min amps", "tigMin")}{num("Max amps", "tigMax")}
            </div>
            <label className="mat-check" style={{ marginBottom: 12 }}>
              <input type="checkbox" checked={f.tigAc} onChange={toggle("tigAc")} /> AC (aluminum) capable
            </label>
          </>
        )}

        <button className="primary" onClick={save}>{signedIn ? "Add & save to account" : "Add (this session)"}</button>
        {!signedIn && (
          <p style={{ fontSize: 12, color: C.mute, margin: "10px 0 0", textAlign: "center" }}>
            Sign in to save it permanently and sync across devices.
          </p>
        )}
      </div>
    </div>
  );
}
