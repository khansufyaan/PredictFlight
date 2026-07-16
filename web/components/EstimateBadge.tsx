import { estimateOnTimeProb, estimateReason } from "@/lib/predict";

/** The model's on-time chance. `hero` makes the number the headline. */
export function EstimateBadge({
  flightNumber,
  scheduledDeparture,
  hero,
}: {
  flightNumber: string;
  scheduledDeparture: number;
  hero?: boolean;
}) {
  const p = estimateOnTimeProb(flightNumber, scheduledDeparture);
  if (p == null) return null;
  const pctOnTime = Math.round(p * 100);
  const color =
    pctOnTime >= 78 ? "text-board-green" : pctOnTime >= 68 ? "text-board-amber" : "text-board-red";
  const reason = estimateReason(flightNumber, scheduledDeparture);

  if (hero) {
    return (
      <div className="text-center" title={reason}>
        <div className={`text-5xl font-extrabold tracking-tight ${color}`}>{pctOnTime}%</div>
        <div className="mt-1.5 text-xs text-board-dim">chance it lands on time</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5 text-[11px]" title={reason}>
      <span className="uppercase tracking-widest text-board-dim">✦ Jetlag model</span>
      <span className={`font-bold ${color}`}>{pctOnTime}% on-time</span>
    </div>
  );
}
