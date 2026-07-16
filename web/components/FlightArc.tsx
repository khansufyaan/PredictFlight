"use client";

import { useEffect, useState } from "react";
import { hhmm } from "@/lib/format";

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

// Quadratic Bézier from (24,78) through control (160,-20) to (296,78).
const P0 = { x: 24, y: 78 };
const C = { x: 160, y: -20 };
const P1 = { x: 296, y: 78 };
function bez(t: number) {
  const mt = 1 - t;
  return {
    x: mt * mt * P0.x + 2 * mt * t * C.x + t * t * P1.x,
    y: mt * mt * P0.y + 2 * mt * t * C.y + t * t * P1.y,
    // tangent for heading
    a:
      (Math.atan2(
        2 * mt * (C.y - P0.y) + 2 * t * (P1.y - C.y),
        2 * mt * (C.x - P0.x) + 2 * t * (P1.x - C.x),
      ) *
        180) /
      Math.PI,
  };
}

/** Route visual: a white arc from origin to destination with the plane riding
 *  it at the flight's live progress. Departure/arrival times anchor the ends;
 *  duration sits in the middle. Before departure the plane waits at the gate;
 *  after arrival it rests at the destination. */
export function FlightArc({
  origin,
  destination,
  departure,
  arrival,
}: {
  origin: string;
  destination: string;
  /** epoch seconds */
  departure: number;
  arrival: number;
}) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 20000);
    return () => clearInterval(t);
  }, []);

  const total = Math.max(1, arrival - departure);
  const progress = Math.max(0, Math.min(1, (now - departure) / total));
  const p = bez(progress);
  const landed = now >= arrival;
  const inFlight = now >= departure && now < arrival;
  const status = landed ? " · landed" : inFlight ? " · in the air" : "";

  return (
    <div className="select-none">
      <svg viewBox="0 0 320 96" className="w-full" aria-hidden>
        {/* full dotted route */}
        <path
          d="M 24 78 Q 160 -20 296 78"
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1.6"
          strokeDasharray="4 6"
          strokeLinecap="round"
        />
        {/* solid trail flown so far */}
        <path
          d="M 24 78 Q 160 -20 296 78"
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="2"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - progress}
        />
        {/* endpoints */}
        <circle cx="24" cy="78" r="3.5" fill="#fbbf24" />
        <circle cx="296" cy="78" r="3.5" fill={landed ? "#34d399" : "rgba(255,255,255,0.4)"} />
        {/* plane at live progress, banked along the arc */}
        <text
          x={p.x}
          y={p.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="20"
          transform={`rotate(${p.a} ${p.x} ${p.y})`}
          style={{ filter: "drop-shadow(0 0 6px rgba(56,189,248,0.6))" }}
        >
          ✈️
        </text>
      </svg>
      <div className="-mt-2 flex items-start justify-between text-center">
        <div className="w-24">
          <div className="flap text-2xl font-extrabold leading-tight text-white">{origin}</div>
          <div className="mt-0.5 text-sm text-board-amber">{hhmm(departure)}</div>
        </div>
        <div className="pt-1.5 text-[11px] uppercase tracking-widest text-board-dim">
          {fmtDuration(total)}
          {status}
        </div>
        <div className="w-24">
          <div className="flap text-2xl font-extrabold leading-tight text-white">{destination}</div>
          <div className="mt-0.5 text-sm text-board-green">{hhmm(arrival)}</div>
        </div>
      </div>
    </div>
  );
}
