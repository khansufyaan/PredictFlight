import { estimateOnTimeProb, estimateReason } from "@/lib/predict";

/** "Jetlag estimate" — a labeled statistical hint (airline record + departure
 *  hour) so a fresh market isn't a blank coin-flip. Distinct from the live
 *  market odds, never blended into them. */
export function EstimateBadge({
  flightNumber,
  scheduledDeparture,
  size = "sm",
}: {
  flightNumber: string;
  scheduledDeparture: number;
  size?: "sm" | "lg";
}) {
  const p = estimateOnTimeProb(flightNumber, scheduledDeparture);
  if (p == null) return null;
  const pctOnTime = Math.round(p * 100);
  const lean = pctOnTime >= 78 ? "leans on-time" : pctOnTime >= 68 ? "toss-up" : "delay risk";
  const color =
    pctOnTime >= 78 ? "text-board-green" : pctOnTime >= 68 ? "text-board-amber" : "text-board-red";

  return (
    <div
      className={`flex items-center justify-center gap-1.5 ${size === "lg" ? "text-xs" : "text-[10px]"}`}
      title={estimateReason(flightNumber, scheduledDeparture)}
    >
      <span className="uppercase tracking-widest text-board-dim">✦ Jetlag model</span>
      <span className={`font-bold ${color}`}>{pctOnTime}% on-time</span>
      <span className="text-board-dim">· {lean}</span>
    </div>
  );
}
