"use client";

import { hhmm } from "@/lib/format";

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

/** Route visual: white arc from origin to destination with the plane at the
 *  top and the flight duration under it; departure/arrival times anchor the
 *  two ends. */
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
  return (
    <div className="select-none">
      <svg viewBox="0 0 320 96" className="w-full" aria-hidden>
        {/* the arc (quadratic curve, apex at x=160) */}
        <path
          d="M 24 78 Q 160 -20 296 78"
          fill="none"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="1.6"
          strokeDasharray="5 5"
          strokeLinecap="round"
        />
        {/* endpoints */}
        <circle cx="24" cy="78" r="3.5" fill="#fbbf24" />
        <circle cx="296" cy="78" r="3.5" fill="#34d399" />
        {/* plane at the apex of the curve (t=0.5 of the quadratic → y=29) */}
        <text
          x="160"
          y="34"
          textAnchor="middle"
          fontSize="22"
          transform="rotate(12 160 29)"
          style={{ filter: "drop-shadow(0 0 6px rgba(56,189,248,0.6))" }}
        >
          ✈️
        </text>
      </svg>
      <div className="-mt-2 flex items-start justify-between text-center">
        <div className="w-20">
          <div className="flap text-lg font-extrabold text-white">{origin}</div>
          <div className="text-[11px] text-board-dim">
            departs <b className="text-board-amber">{hhmm(departure)}</b>
          </div>
        </div>
        <div className="pt-0.5 text-[11px] uppercase tracking-widest text-board-dim">
          {fmtDuration(arrival - departure)} in the air
        </div>
        <div className="w-20">
          <div className="flap text-lg font-extrabold text-white">{destination}</div>
          <div className="text-[11px] text-board-dim">
            lands <b className="text-board-green">{hhmm(arrival)}</b>
          </div>
        </div>
      </div>
    </div>
  );
}
