// Run: node src/lib/weld.test.mjs
// Checks the flux-core process produces sane targets and dial mapping, and
// that MIG output is unchanged.
import assert from "node:assert";
import { physics } from "./physics.js";
import { translate } from "./translate.js";

const wireFeed = {
  ampMax: 210,
  mig: { voltage: { type: "continuous", voltMin: 13, voltMax: 26 },
         wfs: { dialMin: 0, dialMax: 100, ipmMin: 50, ipmMax: 500 } },
};

// flux: DCEN polarity, self-shielded, real wire feed + voltage
const f = physics({ process: "flux", material: "steel", thouThk: 125, wire: "0.030" });
assert.strictEqual(f.polarity, "DCEN", "flux is DCEN");
assert.ok(f.ipm > 0 && f.volts > 0, "flux has wire feed + voltage");

const fl = translate(wireFeed, "flux", f).out.map((o) => o.label);
assert.ok(fl.includes("Wire speed"), "flux shows wire speed");
assert.ok(fl.includes("Polarity"), "flux shows polarity");
assert.ok(fl.includes("Shielding"), "flux shows shielding");
assert.ok(!fl.includes("Gas"), "flux has no gas line");

// mig unchanged: Gas line present, no Polarity line
const m = physics({ process: "mig", material: "steel", thouThk: 125, wire: "0.035" });
const ml = translate(wireFeed, "mig", m).out.map((o) => o.label);
assert.ok(ml.includes("Gas") && !ml.includes("Polarity"), "mig output unchanged");

console.log("weld.test.mjs: all assertions passed");
