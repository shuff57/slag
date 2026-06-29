// Anthropic "studio" palette, dark. Neutral grayscale surfaces (no warm tint),
// the arc-heat output values in brightened clay, inputs in a slate-blue.
// Apple-clean sans for structure, SF Mono for the instrument readouts.
export const C = {
  bg: "#171717",     // neutral near-black
  panel: "#1F1F1F",  // card
  panel2: "#262626", // inputs + dial face
  line: "#383838",   // hairline
  text: "#EAEAEA",   // neutral off-white
  mute: "#A0A0A0",   // neutral gray
  arc: "#E89A6E",    // soft pastel flame — the hot output
  steel: "#9CC0EA",  // pastel blue — inputs
  danger: "#E5634D", // coral-red
  ok: "#76B98C",
};

export const SANS =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';
export const MONO =
  '"SF Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

export const lbl = {
  fontFamily: MONO,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontSize: 10,
  color: C.mute,
};
