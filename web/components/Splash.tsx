"use client";

import { useEffect, useState } from "react";

const WORD = "JETLAG";
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789✈·";

/** Full-screen boarding splash: the wordmark flips through split-flap
 *  characters like a departure board announcement, then waits for Enter. */
export function Splash() {
  const [show, setShow] = useState(false);
  const [display, setDisplay] = useState<string[]>(Array(WORD.length).fill("·"));
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("jetlag-boarded")) return;
    setShow(true);
    let frame = 0;
    const iv = setInterval(() => {
      frame++;
      setDisplay(
        WORD.split("").map((target, i) =>
          frame >= 10 + i * 6 ? target : CHARS[Math.floor(Math.random() * CHARS.length)],
        ),
      );
      if (frame >= 10 + WORD.length * 6) {
        clearInterval(iv);
        setSettled(true);
      }
    }, 65);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") board();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  const board = () => {
    sessionStorage.setItem("jetlag-boarded", "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-board-bg px-6">
      <div className="flex gap-1.5">
        {display.map((ch, i) => (
          <span
            key={i}
            className={`flap-tile h-16 w-12 rounded-md text-3xl sm:h-20 sm:w-14 sm:text-4xl ${
              !settled ? "animate-pulse" : i === WORD.length - 1 ? "flap-lag" : ""
            }`}
          >
            {ch}
          </span>
        ))}
        <span className="self-end pb-1 text-xl font-bold text-board-dim">.fun</span>
      </div>
      <div
        className={`text-center transition-opacity duration-700 ${settled ? "opacity-100" : "opacity-0"}`}
      >
        <p className="flap text-sm text-board-amber">Call the landing. Win back your airfare.</p>
        <p className="mt-2 text-xs text-board-dim">
          Bet on whether flights arrive on time — winners split the losers&apos; pool.
        </p>
        <button className="btn-amber mt-8 px-8 py-3" onClick={board}>
          Board now ✈
        </button>
        <p className="mt-3 text-[10px] uppercase tracking-widest text-board-dim">
          or press enter
        </p>
      </div>
    </div>
  );
}
