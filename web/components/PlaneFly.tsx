"use client";

import { useEffect, useState } from "react";

/** Listens for "jetlag:takeoff" (fired when a deposit confirms) and flies a
 *  plane across the viewport. */
export function PlaneFly() {
  const [flying, setFlying] = useState(false);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const go = () => {
      setFlying(false);
      requestAnimationFrame(() => {
        setFlying(true);
        t = setTimeout(() => setFlying(false), 2700);
      });
    };
    window.addEventListener("jetlag:takeoff", go);
    return () => {
      window.removeEventListener("jetlag:takeoff", go);
      clearTimeout(t);
    };
  }, []);

  if (!flying) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden">
      <span className="plane-fly">✈️</span>
      <span className="plane-trail" />
    </div>
  );
}

export function takeoff() {
  window.dispatchEvent(new Event("jetlag:takeoff"));
}
