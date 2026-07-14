import type { OddsPoint } from "@/lib/api";

/** Implied on-time probability over time as a plain SVG sparkline. */
export function OddsChart({ points }: { points: OddsPoint[] }) {
  if (points.length < 2) {
    return <div className="py-6 text-center text-xs text-board-dim">odds history appears after a few bets</div>;
  }
  const probs = points.map((p) => {
    const on = Number(p.onTimePool);
    const total = on + Number(p.latePool);
    return total === 0 ? 0.5 : on / total;
  });
  const t0 = points[0].timestamp;
  const t1 = points[points.length - 1].timestamp || t0 + 1;
  const W = 300;
  const H = 80;
  const xy = probs.map((p, i) => {
    const x = ((points[i].timestamp - t0) / Math.max(1, t1 - t0)) * (W - 10) + 5;
    const y = H - 10 - p * (H - 20);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <line x1="5" y1={H / 2} x2={W - 5} y2={H / 2} stroke="#232838" strokeDasharray="3 3" />
      <text x="8" y={H / 2 - 4} fill="#8b93a7" fontSize="8">
        50%
      </text>
      <polyline points={xy.join(" ")} fill="none" stroke="#22c55e" strokeWidth="2" />
    </svg>
  );
}
