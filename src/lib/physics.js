// ============================================================================
// PHYSICS LAYER — brand-agnostic.
// Inputs: process, material, thickness (thousandths"), wire/rod diameter.
// Output: target amperage, and process-specific targets (WFS/volts/gas/etc).
// These are STARTING POINTS. Always test on scrap.
// ============================================================================

// Burn-off rate: inches of wire fed per minute, per amp, by wire diameter (in").
// Thinner wire = more length per amp.
export const WFS_PER_AMP = {
  "0.023": 3.5,
  "0.030": 2.0,
  "0.035": 1.6,
  "0.045": 1.0,
};

// Amperage multiplier by material (relative to the ~1A/0.001" steel rule).
const MATERIAL_K = { steel: 1.0, stainless: 0.9, aluminum: 1.25 };

// MIG shielding gas by material.
const MIG_GAS = {
  steel: "75/25 Ar/CO₂ · 20–25 CFH",
  stainless: "Tri-mix (He/Ar/CO₂) · 20–25 CFH",
  aluminum: "100% Argon · 20–30 CFH (spool gun)",
};

const ROD_THOU = { "0.0625": 62.5, "0.09375": 93.75, "0.125": 125, "0.15625": 156.25 };

function clampMin(n, min) {
  return n < min ? min : n;
}

export function physics({ process, material, thouThk, wire, rod }) {
  const k = MATERIAL_K[material] || 1;
  let amps = clampMin(Math.round(thouThk * k), 25);

  if (process === "mig") {
    const perAmp = WFS_PER_AMP[wire] || 1.6;
    const ipm = Math.round(amps * perAmp);
    // Voltage climbs with thickness; aluminum & stainless run a touch hotter/cooler.
    const matAdj = material === "aluminum" ? 1.5 : material === "stainless" ? -0.5 : 0;
    const volts = Math.min(+(14 + thouThk * 0.06 + matAdj).toFixed(1), 27);
    return { process, amps, ipm, volts, gas: MIG_GAS[material] };
  }

  if (process === "stick") {
    const rodThou = ROD_THOU[rod] ?? parseFloat(rod) * 1000;
    // ~1 amp per 0.001" of rod diameter is the classic 7018 rule.
    const a = Math.round(rodThou * 0.95);
    return { process, amps: a, polarity: "DCEP", rodThou };
  }

  if (process === "tig") {
    // TIG runs cooler than the 1A/thou rule.
    const a = clampMin(Math.round(amps * 0.8), 10);
    const tungsten = a < 80 ? '1/16"' : a < 150 ? '3/32"' : '1/8"';
    const polarity = material === "aluminum" ? "AC" : "DCEN";
    const gas = `100% Argon · 15–20 CFH (${polarity})`;
    return { process, amps: a, tungsten, gas, polarity };
  }

  return { process, amps };
}
