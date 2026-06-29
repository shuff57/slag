import React, { useState, useMemo } from "react";
import { Flame, AlertTriangle, Plus, Gauge } from "lucide-react";
import machineData from "./data/machines.json";
import { physics, WFS_PER_AMP } from "./lib/physics.js";
import { translate } from "./lib/translate.js";
import { C, lbl } from "./lib/theme.js";
import Dial from "./components/Dial.jsx";
import Seg from "./components/Seg.jsx";
import AddMachine from "./components/AddMachine.jsx";

export default function App() {
  const seeded = machineData.machines;
  const [custom, setCustom] = useState([]);
  const machines = [...seeded, ...custom];

  const [machineId, setMachineId] = useState(seeded[1].id);
  const [process, setProcess] = useState("mig");
  const [material, setMaterial] = useState("steel");
  const [thouThk, setThouThk] = useState(125);
  const [wire, setWire] = useState("0.035");
  const [rod, setRod] = useState("0.125");
  const [showAdd, setShowAdd] = useState(false);
  const [thkEdit, setThkEdit] = useState(null); // string while editing inches, else null

  const machine = machines.find((m) => m.id === machineId) || machines[0];
  const proc = machine.processes.includes(process) ? process : machine.processes[0];

  const result = useMemo(() => {
    const target = physics({ process: proc, material, thouThk, wire, rod });
    const { out, warnings } = translate(machine, proc, target);
    return { target, out, warnings };
  }, [machine, proc, material, thouThk, wire, rod]);

  const thkInch = (thouThk / 1000).toFixed(3);

  return (
    <div className="wrap">
      <header className="dash-head">
        <div className="brand">
          <Flame size={24} color={C.arc} />
          <h1>SLAG</h1>
        </div>
        <p className="tagline">— settings lookup &amp; auto-guide</p>
      </header>

      <div className="dash">
        {/* ── inputs ───────────────────────────────── */}
        <section className="card inputs-card">
          <div className="card-title">Job setup</div>

          <div className="field-gap">
            <label style={lbl}>Machine</label>
            <div className="row" style={{ gap: 8, marginTop: 6 }}>
              <select value={machineId} onChange={(e) => setMachineId(e.target.value)} style={{ flex: 1, marginTop: 0 }}>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>{m.brand} {m.model} · {m.input}</option>
                ))}
              </select>
              <button className="icon-btn" onClick={() => setShowAdd(true)} aria-label="Add machine">
                <Plus size={18} />
              </button>
            </div>
          </div>

          <div className="field-gap">
            <label style={lbl}>Process</label>
            <div style={{ marginTop: 6 }}>
              <Seg value={proc} onChange={setProcess}
                options={machine.processes.map((p) => ({ v: p, t: p.toUpperCase() }))} />
            </div>
          </div>

          <div className="field-gap">
            <label style={lbl}>Material</label>
            <div style={{ marginTop: 6 }}>
              <Seg value={material} onChange={setMaterial}
                options={[
                  { v: "steel", t: "Mild steel" },
                  { v: "stainless", t: "Stainless" },
                  { v: "aluminum", t: "Aluminum" },
                ]} />
            </div>
          </div>

          <div className="field-gap">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
              <label style={lbl}>Thickness</label>
              <span className="thk-edit">
                <input className="thk-input" type="text" inputMode="decimal"
                  value={thkEdit ?? thkInch}
                  onFocus={() => setThkEdit(thkInch)}
                  onChange={(e) => {
                    setThkEdit(e.target.value);
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v)) setThouThk(Math.max(30, Math.min(500, Math.round(v * 1000))));
                  }}
                  onBlur={() => setThkEdit(null)}
                  aria-label="Thickness in inches" />
                <span className="thk-unit">"</span>
              </span>
            </div>
            <input type="range" min={30} max={500} value={thouThk} onChange={(e) => setThouThk(+e.target.value)} />
            <div style={{ ...lbl, marginTop: -2 }}>thou · 30 — 500 (1/2")</div>
          </div>

          {proc === "mig" && (
            <div className="field-gap">
              <label style={lbl}>Wire diameter</label>
              <div style={{ marginTop: 6 }}>
                <Seg value={wire} onChange={setWire}
                  options={Object.keys(WFS_PER_AMP).map((w) => ({ v: w, t: `${w}"` }))} />
              </div>
            </div>
          )}
          {proc === "stick" && (
            <div className="field-gap">
              <label style={lbl}>Rod diameter</label>
              <div style={{ marginTop: 6 }}>
                <Seg value={rod} onChange={setRod}
                  options={[
                    { v: "0.0625", t: '1/16"' },
                    { v: "0.09375", t: '3/32"' },
                    { v: "0.125", t: '1/8"' },
                    { v: "0.15625", t: '5/32"' },
                  ]} />
              </div>
            </div>
          )}
        </section>

        {/* ── results ──────────────────────────────── */}
        <section className="results card">
          <div className="card-title row" style={{ gap: 7, justifyContent: "flex-start" }}>
            <Gauge size={13} color={C.arc} />
            Set {machine.brand} {machine.model} to
          </div>

          <div className="dials">
            {result.out.map((o, i) =>
              o.text ? (
                <div key={i} className="text-cell">
                  <div className="text-val" style={{ color: C.text }}>{o.value}</div>
                  <div style={{ ...lbl, marginTop: 6 }}>{o.label}</div>
                </div>
              ) : (
                <div key={i} className="dial-cell">
                  <Dial value={o.value} min={o.min} max={o.max} unit={o.unit} />
                  <div className="dial-read">
                    {o.value}<span className="dial-unit"> {o.unit}</span>
                  </div>
                  {o.sub && <div className="dial-sub">{o.sub}</div>}
                  <div style={{ ...lbl, marginTop: 5 }}>{o.label}</div>
                </div>
              )
            )}
          </div>

          <div className="target-line">
            <span style={lbl}>target</span>
            <span className="target-num">{result.target.amps} A</span>
            <span style={lbl}>at the arc</span>
          </div>

          {result.warnings.map((w, i) => (
            <div key={i} className="warn">
              <AlertTriangle size={16} color={C.danger} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>{w}</span>
            </div>
          ))}
        </section>
      </div>

      <p className="disclaimer">
        Starting points only. Run a test bead on scrap and tune by arc sound &amp; bead shape.
        Machine calibration values are approximate — refine them per your own panel.
      </p>

      {showAdd && (
        <AddMachine
          onClose={() => setShowAdd(false)}
          onAdd={(m) => { setCustom([...custom, m]); setMachineId(m.id); setShowAdd(false); }}
        />
      )}
    </div>
  );
}
