import React from "react";

// Toggle group. Cool pastel blue by default; ignites to a flame gradient on
// hover and when selected (styling lives in styles.css — blue→flame crossfade).
export default function Seg({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          aria-pressed={value === o.v}
        >
          {o.t}
        </button>
      ))}
    </div>
  );
}
