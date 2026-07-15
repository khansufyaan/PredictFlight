"use client";

import { useEffect, useState } from "react";

const WORD = "JETLAG";
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789✈·";

/**
 * Split-flap wordmark. The final tile renders mid-flip — the "G" lags — and
 * every few seconds the whole board scrambles and re-settles like a live
 * departure display.
 */
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const [display, setDisplay] = useState<string[]>(WORD.split(""));

  useEffect(() => {
    const scramble = () => {
      let frame = 0;
      const iv = setInterval(() => {
        frame++;
        setDisplay(
          WORD.split("").map((target, i) =>
            frame >= 4 + i * 2 ? target : CHARS[Math.floor(Math.random() * CHARS.length)],
          ),
        );
        if (frame >= 4 + WORD.length * 2) clearInterval(iv);
      }, 55);
    };
    const loop = setInterval(scramble, 8000);
    return () => clearInterval(loop);
  }, []);

  const tile =
    size === "lg" ? "h-12 w-9 text-2xl rounded-md" : "h-6 w-[18px] text-xs rounded";
  const suffix = size === "lg" ? "text-lg" : "text-xs";
  return (
    <span className="inline-flex items-end gap-[3px]" aria-label="Jetlag">
      {display.map((ch, i) => (
        <span
          key={i}
          className={`flap-tile ${tile} ${i === WORD.length - 1 && ch === "G" ? "flap-lag" : ""}`}
        >
          {ch}
        </span>
      ))}
      <span className={`${suffix} pb-px font-bold text-board-dim`}>.fun</span>
    </span>
  );
}
