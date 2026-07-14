import { pct } from "@/lib/format";

export function OddsBar({ onTimeProb }: { onTimeProb: number }) {
  const green = Math.max(2, Math.min(98, onTimeProb * 100));
  return (
    <div>
      <div className="flex justify-between text-[10px] text-board-dim">
        <span className="text-board-green">ON TIME {pct(onTimeProb)}</span>
        <span className="text-board-red">LATE {pct(1 - onTimeProb)}</span>
      </div>
      <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-board-line">
        <div className="bg-board-green transition-all" style={{ width: `${green}%` }} />
        <div className="flex-1 bg-board-red" />
      </div>
    </div>
  );
}
