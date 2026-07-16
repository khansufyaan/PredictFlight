"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AIRPORTS } from "@/lib/airports";
import { hhmm } from "@/lib/format";
import { describe, gcPoints, severity } from "@/lib/wx";

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

/** SVG path along the arc between two progress values. */
function arcPath(t0: number, t1: number): string {
  const steps = 8;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const p = bez(t0 + ((t1 - t0) * i) / steps);
    d += `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
  }
  return d;
}

const SAMPLES = 7;

interface RoutePoint {
  t: number;
  code: number;
  sev: 0 | 1 | 2;
}

/** Forecast at points along the route, each at the hour the flight passes it.
 *  One batched open-meteo call; the whole thing is a hint layer, so any
 *  failure just means an uncolored arc. */
function useRouteWeather(origin: string, destination: string, departure: number, arrival: number) {
  const a = AIRPORTS[origin];
  const b = AIRPORTS[destination];
  const horizonOk =
    arrival * 1000 > Date.now() - 3600_000 && arrival * 1000 < Date.now() + 15 * 86400_000;
  return useQuery<RoutePoint[]>({
    queryKey: ["routewx", origin, destination, Math.floor(departure / 3600)],
    enabled: !!a && !!b && horizonOk,
    staleTime: 30 * 60_000,
    refetchInterval: false,
    queryFn: async () => {
      const pts = gcPoints(a, b, SAMPLES);
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${pts.map((p) => p.lat.toFixed(3)).join(",")}` +
        `&longitude=${pts.map((p) => p.lon.toFixed(3)).join(",")}` +
        `&hourly=weather_code&timeformat=unixtime&forecast_days=16`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("route weather unavailable");
      const j = await res.json();
      const locs: { hourly?: { time: number[]; weather_code: number[] } }[] = Array.isArray(j)
        ? j
        : [j];
      return locs.map((loc, i) => {
        const t = i / (SAMPLES - 1);
        const passAt = departure + t * Math.max(0, arrival - departure);
        const times = loc.hourly?.time ?? [];
        let best = -1;
        let dist = Infinity;
        times.forEach((ts, k) => {
          const d = Math.abs(ts - passAt);
          if (d < dist) (dist = d), (best = k);
        });
        const code = best >= 0 && dist <= 3 * 3600 ? (loc.hourly!.weather_code[best] ?? 0) : 0;
        return { t, code, sev: severity(code) };
      });
    },
  });
}

/** Contiguous runs of rough weather along the route, as arc spans. */
function troubleSpans(points: RoutePoint[]): { t0: number; t1: number; worst: RoutePoint }[] {
  const spans: { t0: number; t1: number; worst: RoutePoint }[] = [];
  const half = 0.5 / (SAMPLES - 1);
  let open: { t0: number; t1: number; worst: RoutePoint } | null = null;
  for (const p of points) {
    if (p.sev > 0) {
      const t0 = Math.max(0, p.t - half);
      const t1 = Math.min(1, p.t + half);
      if (open && t0 <= open.t1 + 1e-6) {
        open.t1 = t1;
        if (p.sev > open.worst.sev) open.worst = p;
      } else {
        open = { t0, t1, worst: p };
        spans.push(open);
      }
    } else {
      open = null;
    }
  }
  return spans;
}

/** Route visual: a white arc from origin to destination with the plane riding
 *  it at the flight's live progress. Departure/arrival times anchor the ends;
 *  duration sits in the middle. Rough weather on the route shows up as amber
 *  (slows things down) or red (reroute material) stretches of the arc. */
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

  const { data: routeWx } = useRouteWeather(origin, destination, departure, arrival);
  const spans = routeWx ? troubleSpans(routeWx) : [];
  const worstOnRoute = spans.reduce<RoutePoint | null>(
    (acc, s) => (acc && acc.sev >= s.worst.sev ? acc : s.worst),
    null,
  );

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
        {/* rough-weather stretches of the route */}
        {spans.map((s, i) => {
          const { icon, label } = describe(s.worst.code);
          const mid = bez((s.t0 + s.t1) / 2);
          return (
            <g key={i}>
              <path
                d={arcPath(s.t0, s.t1)}
                fill="none"
                stroke={s.worst.sev === 2 ? "#fb7185" : "#fbbf24"}
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.9"
              >
                <title>{label} on the route</title>
              </path>
              <text x={mid.x} y={mid.y - 7} textAnchor="middle" fontSize="11">
                {icon}
              </text>
            </g>
          );
        })}
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
      {worstOnRoute && (
        <p className="mt-1 text-center text-xs text-board-dim">
          {describe(worstOnRoute.code).icon} {describe(worstOnRoute.code).label} along the route —{" "}
          {worstOnRoute.sev === 2 ? "delay risk" : "may slow things down"}
        </p>
      )}
    </div>
  );
}
