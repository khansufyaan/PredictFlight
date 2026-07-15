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
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-12 bg-[#070a16] px-4">
      <div className="flex items-end gap-2 sm:gap-3">
        {display.map((ch, i) => (
          <span
            key={i}
            className={`flap-tile splash-tile h-20 w-[52px] rounded-lg text-5xl sm:h-36 sm:w-24 sm:text-8xl ${
              !settled ? "animate-pulse" : i === WORD.length - 1 ? "flap-lag" : ""
            }`}
          >
            {ch}
          </span>
        ))}
        <span className="pb-1 text-2xl font-bold text-board-dim sm:text-4xl">.fun</span>
      </div>
      <div
        className={`text-center transition-opacity duration-700 ${settled ? "opacity-100" : "opacity-0"}`}
      >
        <p className="flap splash-tagline text-lg font-extrabold sm:text-3xl">
          Predict the landing.
          <br className="sm:hidden" /> Win back your fare.
        </p>
        <button className="btn-amber splash-cta mt-10 px-12 py-4 !text-lg" onClick={board}>
          Board now ✈
        </button>
      </div>
    </div>
  );
}
