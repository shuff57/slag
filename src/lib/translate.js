// ============================================================================
// MACHINE LAYER — translate brand-agnostic targets onto ONE machine's controls.
// Produces dial readouts + warnings for out-of-range / over-capacity cases.
// ============================================================================

export function lerpClamp(v, inMin, inMax, outMin, outMax) {
  const span = inMax - inMin || 1;
  const t = Math.max(0, Math.min(1, (v - inMin) / span));
  return outMin + t * (outMax - outMin);
}

export function translate(machine, process, target) {
  const out = []; // { label, value, unit, min, max, sub } | { label, value, text:true }
  const warnings = [];

  if (process === "mig" || process === "flux") {
    // Flux-core runs on the same wire-feed hardware, so it reads machine.mig.
    const cfg = machine.mig;

    const dial = lerpClamp(target.ipm, cfg.wfs.ipmMin, cfg.wfs.ipmMax, cfg.wfs.dialMin, cfg.wfs.dialMax);
    out.push({
      label: "Wire speed",
      value: Math.round(dial),
      unit: `of ${cfg.wfs.dialMax}`,
      min: cfg.wfs.dialMin,
      max: cfg.wfs.dialMax,
      sub: `≈ ${target.ipm} IPM`,
    });
    if (target.ipm > cfg.wfs.ipmMax) warnings.push("Target wire speed exceeds this machine's max feed.");
    if (target.ipm < cfg.wfs.ipmMin) warnings.push("Target wire speed is below this machine's min feed.");

    if (cfg.voltage.type === "taps") {
      const lo = cfg.voltage.taps[0];
      const hi = cfg.voltage.taps[cfg.voltage.taps.length - 1];
      const tap = Math.round(lerpClamp(target.volts, cfg.voltage.voltMin, cfg.voltage.voltMax, lo, hi));
      out.push({ label: "Voltage tap", value: tap, unit: `${lo}–${hi}`, min: lo, max: hi, sub: `≈ ${target.volts} V` });
    } else {
      out.push({ label: "Voltage", value: target.volts, unit: "V", min: cfg.voltage.voltMin, max: cfg.voltage.voltMax });
    }

    if (process === "flux") {
      out.push({ label: "Polarity", value: target.polarity, text: true });
      out.push({ label: "Shielding", value: target.gas, text: true });
    } else {
      out.push({ label: "Gas", value: target.gas, text: true });
    }

    if (target.amps > machine.ampMax)
      warnings.push(`Needs ~${target.amps} A; machine maxes at ${machine.ampMax} A. Bevel the joint, preheat, or run multiple passes.`);
  } else if (process === "stick") {
    const cfg = machine.stick;
    out.push({
      label: cfg.taps ? "Amperage tap" : "Amperage",
      value: target.amps,
      unit: "A",
      min: cfg.ampMin,
      max: cfg.ampMax,
      sub: target.polarity,
    });
    if (target.amps < cfg.ampMin) warnings.push(`Rod wants ~${target.amps} A; machine floor is ${cfg.ampMin} A.`);
    if (target.amps > cfg.ampMax) warnings.push(`Rod wants ~${target.amps} A; machine ceiling is ${cfg.ampMax} A.`);
  } else if (process === "tig") {
    const cfg = machine.tig;
    out.push({ label: "Amperage", value: target.amps, unit: "A", min: cfg.ampMin, max: cfg.ampMax });
    out.push({ label: "Tungsten", value: target.tungsten, text: true });
    out.push({ label: "Gas", value: target.gas, text: true });
    if (target.polarity === "AC" && !cfg.ac) warnings.push("Aluminum needs AC TIG; this machine is DC-only.");
    if (target.amps > cfg.ampMax) warnings.push(`Needs ~${target.amps} A; machine maxes at ${cfg.ampMax} A.`);
  }

  return { out, warnings };
}
