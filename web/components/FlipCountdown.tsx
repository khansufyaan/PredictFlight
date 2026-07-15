"use client";

import { useEffect, useState } from "react";

/** Split-flap countdown: every digit sits in a flap tile and flips over when
 *  it changes, like the boarding splash. */
export function FlipCountdown({ to, doneLabel }: { to: number; doneLabel: string }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const s = to - now;
  if (s <= 0) return <span className="text-board-amber">{doneLabel}</span>;

  const d = Math.floor(s / 86400);
  const h = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  const groups: string[] = d > 0 ? [`${d}d`, h, m, sec] : [h, m, sec];

  return (
    <span className="inline-flex items-center gap-[3px] align-middle" suppressHydrationWarning>
      {groups.map((g, gi) => (
        <span key={gi} className="inline-flex items-center gap-[2px]">
          {gi > 0 && <span className="px-px text-board-dim">:</span>}
          {g.split("").map((ch, i) => (
            <span
              key={`${gi}-${i}-${ch}`}
              className="flap-tile flip-digit h-5 w-3.5 rounded-sm text-[10px]"
            >
              {ch}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}
