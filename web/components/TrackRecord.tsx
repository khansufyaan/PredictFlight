import type { Market } from "@/lib/api";

/** This flight number's recent real-world on-time record. `hero` makes the
 *  number the headline. */
export function TrackRecord({
  market,
  compact,
  hero,
}: {
  market: Market;
  compact?: boolean;
  hero?: boolean;
}) {
  const pct = market.histOnTimePct;
  const n = market.histSample;
  if (pct == null || !n) return null;

  const share = Math.round(pct * 100);
  const tone = share >= 70 ? "text-board-green" : share >= 50 ? "text-board-amber" : "text-board-red";
  const delay = market.histAvgDelayMin ?? 0;
  const delayNote = delay > 5 ? ` · usually ~${delay}m late` : delay < -5 ? " · usually early" : "";

  if (hero) {
    return (
      <div className="text-center">
        <div className={`text-5xl font-extrabold tracking-tight ${tone}`}>{share}%</div>
        <div className="mt-1 text-[10px] uppercase tracking-widest text-board-dim">
          on time over the last {n} flights{delayNote}
        </div>
      </div>
    );
  }

  return (
    <span className={`text-[11px] text-board-dim ${compact ? "" : "block text-center"}`}>
      🛬 track record: <b className={tone}>on time {share}%</b> of last {n} runs
      {compact ? "" : delayNote}
    </span>
  );
}
