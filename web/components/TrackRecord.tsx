import type { Market } from "@/lib/api";

/** The hint: this flight number's recent real-world on-time record. */
export function TrackRecord({ market, compact }: { market: Market; compact?: boolean }) {
  const pct = market.histOnTimePct;
  const n = market.histSample;
  if (pct == null || !n) return null;

  const share = Math.round(pct * 100);
  const tone = share >= 70 ? "text-board-green" : share >= 50 ? "text-board-amber" : "text-board-red";
  const delay = market.histAvgDelayMin ?? 0;
  const delayNote = delay > 5 ? ` · usually ~${delay}m late` : delay < -5 ? " · usually early" : "";

  return (
    <span className={`text-[11px] text-board-dim ${compact ? "" : "block text-center"}`}>
      🛬 track record: <b className={tone}>on time {share}%</b> of last {n} runs
      {compact ? "" : delayNote}
    </span>
  );
}
