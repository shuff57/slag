import React, { useState, useMemo, useEffect, useRef } from "react";
import { Flame, AlertTriangle, Plus, Gauge, SlidersHorizontal, Save, LogIn, LogOut, Trash2, Info } from "lucide-react";
import machineData from "./data/machines.json";
import { physics, WFS_PER_AMP } from "./lib/physics.js";
import { translate } from "./lib/translate.js";
import { C, lbl } from "./lib/theme.js";
import { api } from "./lib/api.js";
import Dial from "./components/Dial.jsx";
import Seg from "./components/Seg.jsx";
import AddMachine from "./components/AddMachine.jsx";
import AuthModal from "./components/AuthModal.jsx";

const PROC_LABEL = { mig: "MIG", flux: "Flux-core", stick: "Stick", tig: "TIG" };

const MATERIALS = [
  { v: "steel", t: "Mild steel" },
  { v: "stainless", t: "Stainless" },
  { v: "aluminum", t: "Aluminum" },
  { v: "chromoly", t: "Chromoly" },
  { v: "cast", t: "Cast iron" },
  { v: "copper", t: "Copper/bronze" },
  { v: "titanium", t: "Titanium" },
];

// Steel sheet-metal gauge → thickness in thou (Manufacturers' Standard Gauge).
// ponytail: steel standard only; aluminum/stainless use different gauge tables.
const GAUGES = [
  { ga: 22, thou: 30 }, { ga: 20, thou: 36 }, { ga: 18, thou: 48 },
  { ga: 16, thou: 60 }, { ga: 14, thou: 75 }, { ga: 12, thou: 105 },
  { ga: 11, thou: 120 }, { ga: 10, thou: 135 }, { ga: 7, thou: 179 },
];
const gaugeFor = (thou) => GAUGES.find((g) => g.thou === thou)?.ga;

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
  const [thkUnit, setThkUnit] = useState("in"); // "in" (continuous) | "ga" (snaps to gauges)

  // ── auth + saved tweaks ──────────────────────────────────
  const [user, setUser] = useState(null);          // email or null
  const [savedTweaks, setSavedTweaks] = useState([]);
  const [showAuth, setShowAuth] = useState(false);
  const [overlay, setOverlay] = useState(null);    // { [gaugeLabel]: value } applied on top of computed
  const [editing, setEditing] = useState(false);

  // ── material filter (hide the ones you never weld) ───────
  const [hiddenMats, setHiddenMats] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("slag.hiddenMaterials") || "[]")); } catch { return new Set(); }
  });
  const [showMatFilter, setShowMatFilter] = useState(false);
  const visibleMats = MATERIALS.filter((m) => !hiddenMats.has(m.v));
  function toggleMat(v) {
    const next = new Set(hiddenMats);
    next.has(v) ? next.delete(v) : next.add(v);
    if (next.size >= MATERIALS.length) return; // keep at least one
    setHiddenMats(next);
    localStorage.setItem("slag.hiddenMaterials", JSON.stringify([...next]));
  }
  useEffect(() => {
    if (!visibleMats.some((m) => m.v === material) && visibleMats[0]) setMaterial(visibleMats[0].v);
  }, [hiddenMats]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api.me().then((r) => { setUser(r.email); loadTweaks(); }).catch(() => {});
  }, []);
  async function loadTweaks() {
    try { const { tweaks } = await api.listTweaks(); setSavedTweaks(tweaks); } catch { /* not signed in */ }
  }
  const clearTweak = () => { setOverlay(null); setEditing(false); };

  // Focus the first gauge box when entering tweak mode (the input is always
  // mounted, so autoFocus won't fire — do it imperatively).
  const firstInputRef = useRef(null);
  useEffect(() => {
    if (editing && firstInputRef.current) { firstInputRef.current.focus(); firstInputRef.current.select(); }
  }, [editing]);

  const machine = machines.find((m) => m.id === machineId) || machines[0];
  const proc = machine.processes.includes(process) ? process : machine.processes[0];

  const brands = useMemo(() => [...new Set(machines.map((m) => m.brand))].sort(), [machines]);
  const modelsForBrand = machines.filter((m) => m.brand === machine.brand);
  const pickBrand = (b) => { const first = machines.find((m) => m.brand === b); if (first) setMachineId(first.id); };

  // Setup controls clear any applied/editing tweak (it no longer matches the job).
  const onBrand = (b) => { pickBrand(b); clearTweak(); };
  const onModel = (id) => { setMachineId(id); clearTweak(); };
  const onProcess = (v) => { setProcess(v); clearTweak(); };
  const onMaterial = (v) => { setMaterial(v); clearTweak(); };
  const onWire = (v) => { setWire(v); clearTweak(); };
  const onRod = (v) => { setRod(v); clearTweak(); };
  const onThk = (v) => { setThouThk(v); clearTweak(); };

  const result = useMemo(() => {
    const target = physics({ process: proc, material, thouThk, wire, rod });
    const { out, warnings } = translate(machine, proc, target);
    return { target, out, warnings };
  }, [machine, proc, material, thouThk, wire, rod]);

  function startEdit() {
    const seed = {};
    for (const o of result.out) if (!o.text) seed[o.label] = o.value;
    setOverlay(seed);
    setEditing(true);
  }
  async function signOut() {
    try { await api.logout(); } catch { /* ignore */ }
    setUser(null); setSavedTweaks([]); clearTweak();
  }
  function applyTweak(t) {
    const s = t.setup || {};
    if (s.machineId) setMachineId(s.machineId);
    if (s.process) setProcess(s.process);
    if (s.material) setMaterial(s.material);
    if (typeof s.thouThk === "number") setThouThk(s.thouThk);
    if (s.wire) setWire(s.wire);
    if (s.rod) setRod(s.rod);
    setEditing(false);
    setOverlay(t.gauges || {});
  }
  async function saveTweak() {
    if (!user) { setShowAuth(true); return; }
    const name = window.prompt('Name this tweak (e.g. \'3/16" alum, spool gun\')'); // ponytail: native prompt; build a sheet only if naming needs more
    if (!name || !name.trim()) return;
    const setup = { machineId, process: proc, material, thouThk, wire, rod };
    try {
      const t = await api.saveTweak({ name: name.trim(), setup, gauges: overlay || {} });
      setSavedTweaks([t, ...savedTweaks]);
      setEditing(false);
    } catch (e) { window.alert(e.message); }
  }
  async function removeTweak(id) {
    try { await api.deleteTweak(id); setSavedTweaks(savedTweaks.filter((t) => t.id !== id)); } catch { /* ignore */ }
  }

  const thkInch = (thouThk / 1000).toFixed(3);
  const [gaEdit, setGaEdit] = useState(null); // string while typing a gauge, else null
  // Nearest gauge index for the current thickness (drives the gauge-mode slider).
  const gaugeIdx = GAUGES.reduce((best, g, i, arr) =>
    Math.abs(g.thou - thouThk) < Math.abs(arr[best].thou - thouThk) ? i : best, 0);
  const curGauge = gaugeFor(thouThk) ?? GAUGES[gaugeIdx].ga;
  const setUnit = (u) => { setThkUnit(u); if (u === "ga") onThk(GAUGES[gaugeIdx].thou); };
  const commitGauge = (raw) => {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return;
    const g = GAUGES.find((x) => x.ga === n) ??
      GAUGES.reduce((b, x) => (Math.abs(x.ga - n) < Math.abs(b.ga - n) ? x : b), GAUGES[0]);
    onThk(g.thou);
  };

  return (
    <div className="wrap">
      <header className="dash-head">
        <div className="brand">
          <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
            <defs>
              <linearGradient id="flameGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E3744E" />
                <stop offset="20%" stopColor="#E89A6E" />
                <stop offset="44%" stopColor="#9DBEE6" />
                <stop offset="100%" stopColor="#B4CEEC" />
              </linearGradient>
            </defs>
          </svg>
          <h1 className="wordmark">SL<Flame className="flame-a" size={24} aria-label="A" />G</h1>
        </div>
        <p className="tagline">— settings lookup &amp; auto-guide</p>
        <div className="account">
          {user ? (
            <>
              <span className="acct-email">{user}</span>
              <button className="link-btn" onClick={signOut}><LogOut size={14} /> Sign out</button>
            </>
          ) : (
            <button className="link-btn" onClick={() => setShowAuth(true)}><LogIn size={14} /> Sign in</button>
          )}
        </div>
      </header>

      <div className="dash">
        {/* ── inputs ───────────────────────────────── */}
        <section className="card inputs-card">
          <div className="card-title">Job setup</div>

          <div className="field-gap">
            <label style={lbl}>Machine</label>
            <div className="row" style={{ gap: 8, marginTop: 6 }}>
              <select value={machine.brand} onChange={(e) => onBrand(e.target.value)} style={{ flex: 1, marginTop: 0 }} aria-label="Brand">
                {brands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <select value={machineId} onChange={(e) => onModel(e.target.value)} style={{ flex: 2, marginTop: 0 }} aria-label="Model">
                {modelsForBrand.map((m) => (
                  <option key={m.id} value={m.id}>{m.model} · {m.input}</option>
                ))}
              </select>
            </div>
            <button className="add-machine-btn" onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add machine
            </button>
          </div>

          {user && savedTweaks.length > 0 && (
            <div className="field-gap">
              <label style={lbl}>Saved tweaks</label>
              <div className="saved-list">
                {savedTweaks.map((t) => (
                  <div key={t.id} className="saved-item">
                    <button className="saved-name" onClick={() => applyTweak(t)} title="Load this setup + tweaks">{t.name}</button>
                    <button className="icon-x" onClick={() => removeTweak(t.id)} aria-label={`Delete ${t.name}`}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="field-gap">
            <label style={lbl}>Process</label>
            <div style={{ marginTop: 6 }}>
              <Seg value={proc} onChange={onProcess}
                options={machine.processes.map((p) => ({ v: p, t: PROC_LABEL[p] || p.toUpperCase() }))} />
            </div>
          </div>

          <div className="field-gap">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
              <label style={lbl}>Material</label>
              <button className="link-btn" style={{ fontSize: 12 }} onClick={() => setShowMatFilter((v) => !v)}>
                <SlidersHorizontal size={12} /> Filter
              </button>
            </div>
            {showMatFilter && (
              <div className="mat-filter">
                {MATERIALS.map((m) => (
                  <label key={m.v} className="mat-check">
                    <input type="checkbox" checked={!hiddenMats.has(m.v)} onChange={() => toggleMat(m.v)} />
                    {m.t}
                  </label>
                ))}
              </div>
            )}
            <div style={{ marginTop: 6 }}>
              <Seg value={material} onChange={onMaterial} options={visibleMats} />
            </div>
          </div>

          <div className="field-gap">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <span className="row" style={{ gap: 10, alignItems: "center" }}>
                <label style={lbl}>Thickness</label>
                <span className="unit-toggle">
                  <button className={thkUnit === "in" ? "on" : ""} onClick={() => setUnit("in")}>in"</button>
                  <button className={thkUnit === "ga" ? "on" : ""} onClick={() => setUnit("ga")}>ga</button>
                </span>
              </span>
              {thkUnit === "in" ? (
                <span className="thk-edit">
                  <input className="thk-input" type="text" inputMode="decimal"
                    value={thkEdit ?? thkInch}
                    onFocus={() => setThkEdit(thkInch)}
                    onChange={(e) => {
                      setThkEdit(e.target.value);
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v)) onThk(Math.max(30, Math.min(500, Math.round(v * 1000))));
                    }}
                    onBlur={() => setThkEdit(null)}
                    aria-label="Thickness in inches" />
                  <span className="thk-unit">"</span>
                </span>
              ) : (
                <span className="thk-edit">
                  <input className="thk-input thk-ga" type="number" inputMode="numeric" step={1}
                    value={gaEdit ?? curGauge}
                    onFocus={() => setGaEdit(String(curGauge))}
                    onChange={(e) => {
                      setGaEdit(e.target.value);
                      const ex = GAUGES.find((x) => x.ga === parseInt(e.target.value, 10));
                      if (ex) onThk(ex.thou);
                    }}
                    onBlur={() => { commitGauge(gaEdit ?? ""); setGaEdit(null); }}
                    aria-label="Gauge" />
                  <span className="thk-unit">ga</span>
                </span>
              )}
            </div>

            {thkUnit === "in" ? (
              <input type="range" min={30} max={500} value={thouThk} onChange={(e) => onThk(+e.target.value)} />
            ) : (
              <div className="gauge-slider">
                <div className="gs-track" />
                <div className="gs-fill" style={{ width: `calc((100% - 20px) * ${gaugeIdx / (GAUGES.length - 1)})` }} />
                {GAUGES.map((g, i) => (
                  <button key={g.ga}
                    className={`gstep${i <= gaugeIdx ? " filled" : ""}${i === gaugeIdx ? " on" : ""}`}
                    style={{ left: `calc(10px + (100% - 20px) * ${i / (GAUGES.length - 1)})` }}
                    onClick={() => onThk(g.thou)} aria-label={`${g.ga} gauge`}
                    title={`${(g.thou / 1000).toFixed(3)}"`}>
                    <span className="gs-dot" />
                    <span className="gs-num">{g.ga}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="thin-thick" style={{ ...lbl, paddingTop: 12 }}>
              <span>Thin</span><span className="tt-arrow" /><span>Thick</span>
            </div>
          </div>

          {(proc === "mig" || proc === "flux") && (
            <div className="field-gap">
              <label style={lbl}>{proc === "flux" ? "Flux-core wire diameter" : "Wire diameter"}</label>
              <div style={{ marginTop: 6 }}>
                <Seg value={wire} onChange={onWire}
                  options={Object.keys(WFS_PER_AMP).map((w) => ({ v: w, t: `${w}"` }))} />
              </div>
            </div>
          )}
          {proc === "stick" && (
            <div className="field-gap">
              <label style={lbl}>Rod diameter</label>
              <div style={{ marginTop: 6 }}>
                <Seg value={rod} onChange={onRod}
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
          <div className="card-title row" style={{ gap: 7, justifyContent: "space-between" }}>
            <span className="row" style={{ gap: 7 }}>
              <Gauge size={13} color={C.arc} />
              Set {machine.brand} {machine.model} to
              {overlay && !editing && <span className="tweak-flag">tweaked</span>}
            </span>
            <span className="tweak-bar">
              {editing ? (
                <>
                  <button className="link-btn" onClick={saveTweak}><Save size={14} /> Save</button>
                  <button className="link-btn" onClick={clearTweak}>Cancel</button>
                </>
              ) : (
                <button className="link-btn" onClick={startEdit}><SlidersHorizontal size={14} /> Tweak</button>
              )}
            </span>
          </div>

          <div className="dials">
            {result.out.map((o, i) => {
              const firstNumIdx = result.out.findIndex((x) => !x.text);
              if (o.text) return (
                <div key={i} className="text-cell">
                  <div className="text-val" style={{ color: C.text }}>{o.value}</div>
                  <div style={{ ...lbl, marginTop: 6 }}>{o.label}</div>
                </div>
              );
              const ov = overlay && overlay[o.label] != null ? overlay[o.label] : o.value;
              const dialVal = Number(ov) || 0;
              return (
                <div key={i} className="dial-cell">
                  <Dial value={dialVal} min={o.min} max={o.max} unit={o.unit} />
                  <div className="dial-read">
                    <input className="dial-read-input" type="number" inputMode="decimal" value={ov}
                      ref={i === firstNumIdx ? firstInputRef : null}
                      readOnly={!editing} tabIndex={editing ? 0 : -1}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setOverlay({ ...overlay, [o.label]: e.target.value === "" ? "" : +e.target.value })}
                      aria-label={`${o.label} value`} />
                    <span className="dial-unit"> {o.unit}</span>
                  </div>
                  {o.sub && <div className="dial-sub">{o.sub}</div>}
                  <div style={{ ...lbl, marginTop: 5 }}>{o.label}</div>
                </div>
              );
            })}
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

          {result.target.note && (
            <div className="note">
              <Info size={15} color={C.steel} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>{result.target.note}</span>
            </div>
          )}
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

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onAuth={(email) => { setUser(email); setShowAuth(false); loadTweaks(); }}
        />
      )}
    </div>
  );
}
