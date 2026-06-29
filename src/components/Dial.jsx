import React from "react";
import { C } from "../lib/theme.js";

// SVG rotary knob: needle points to where you set the physical dial. A clay
// sweep arc fills from min to the target so it reads as a gauge at a glance.
// The numeric readout is rendered below the gauge by the caller.
export default function Dial({ value, min, max, unit }) {
  const a0 = -135, a1 = 135;
  const t = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const ang = (a0 + t * (a1 - a0)) * (Math.PI / 180);
  const cx = 60, cy = 60, r = 44;
  const px = cx + Math.sin(ang) * r;
  const py = cy - Math.cos(ang) * r;

  // arc geometry (radius 50) for the sweep track + filled value
  const R = 50;
  const pt = (deg) => {
    const a = deg * (Math.PI / 180);
    return [cx + Math.sin(a) * R, cy - Math.cos(a) * R];
  };
  const [sx, sy] = pt(a0);
  const valDeg = a0 + t * (a1 - a0);
  const [vx, vy] = pt(valDeg);
  const [ex, ey] = pt(a1);
  const large = (deg) => (deg - a0 > 180 ? 1 : 0);

  const ticks = Array.from({ length: 11 }, (_, i) => {
    const ta = (a0 + (i / 10) * (a1 - a0)) * (Math.PI / 180);
    return {
      x1: cx + Math.sin(ta) * 50, y1: cy - Math.cos(ta) * 50,
      x2: cx + Math.sin(ta) * 44, y2: cy - Math.cos(ta) * 44,
    };
  });

  return (
    <svg viewBox="0 0 120 120" style={{ width: 132, height: 132 }} role="img"
      aria-label={`${value} ${unit}`}>
      {/* track */}
      <path d={`M ${sx} ${sy} A ${R} ${R} 0 ${large(a1)} 1 ${ex} ${ey}`}
        fill="none" stroke={C.line} strokeWidth="4" strokeLinecap="round" />
      {/* clay value sweep */}
      <path d={`M ${sx} ${sy} A ${R} ${R} 0 ${large(valDeg)} 1 ${vx} ${vy}`}
        fill="none" stroke={C.arc} strokeWidth="4" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={38} fill={C.panel2} stroke={C.line} strokeWidth="1" />
      {ticks.map((tk, i) => (
        <line key={i} x1={tk.x1} y1={tk.y1} x2={tk.x2} y2={tk.y2} stroke={C.mute} strokeWidth="1.25" opacity="0.5" />
      ))}
      <line x1={cx} y1={cy} x2={px} y2={py} stroke={C.arc} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="5.5" fill={C.arc} />
    </svg>
  );
}
