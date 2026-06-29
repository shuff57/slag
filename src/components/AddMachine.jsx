import React, { useState } from "react";
import { X } from "lucide-react";
import { C, MONO, lbl } from "../lib/theme.js";

export default function AddMachine({ onClose, onAdd }) {
  const [f, setF] = useState({ brand: "", model: "", ampMax: 180, dialMax: 10, ipmMin: 50, ipmMax: 500 });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const field = { background: C.panel2, color: C.text, border: `1px solid ${C.line}`, fontFamily: MONO };

  function save() {
    if (!f.brand || !f.model) return;
    onAdd({
      id: `custom-${Date.now()}`,
      brand: f.brand,
      model: f.model,
      input: "—",
      processes: ["mig"],
      ampMax: +f.ampMax,
      custom: true,
      mig: {
        voltage: { type: "continuous", voltMin: 13, voltMax: 26 },
        wfs: { dialMin: 0, dialMax: +f.dialMax, ipmMin: +f.ipmMin, ipmMax: +f.ipmMax },
      },
    });
  }

  const fields = [
    ["Brand", "brand", "text"],
    ["Model", "model", "text"],
    ["Max amps", "ampMax", "number"],
    ["Dial max (e.g. 10 or 100)", "dialMax", "number"],
    ["Lowest IPM at min dial", "ipmMin", "number"],
    ["Highest IPM at max dial", "ipmMax", "number"],
  ];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>Add a MIG machine</h2>
          <button onClick={onClose} aria-label="Close"><X size={20} color={C.mute} /></button>
        </div>
        <p style={{ fontSize: 12, color: C.mute, marginBottom: 14 }}>
          Calibrate the wire-speed knob: what it reads at min and max, and the real
          IPM range it spans. Pull these from the door chart or a measured feed test.
        </p>
        {fields.map(([label, key, type]) => (
          <div key={key} style={{ marginBottom: 12 }}>
            <label style={lbl}>{label}</label>
            <input type={type} value={f[key]} onChange={set(key)} style={field} />
          </div>
        ))}
        <button className="primary" onClick={save}>Add machine</button>
      </div>
    </div>
  );
}
