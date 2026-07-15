"use client";

import { useState } from "react";
import type { Airline } from "@/lib/airlines";

/** Self-hosted carrier logo (public/logos) with a brand-color code badge as
 *  fallback. `fill` stretches to its parent square edge-to-edge. */
export function AirlineBadge({
  airline,
  size = "sm",
}: {
  airline: Airline;
  size?: "sm" | "fill";
}) {
  const [broken, setBroken] = useState(false);
  const box = size === "fill" ? "aspect-square w-full rounded-xl p-2" : "h-7 w-7 rounded-md p-0.5";

  if (!broken && airline.key !== "other") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/logos/${airline.code}.png`}
        alt={`${airline.name} logo`}
        className={`${box} shrink-0 bg-white object-contain shadow`}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span
      className={`${box} flex shrink-0 items-center justify-center font-bold shadow ${size === "fill" ? "text-2xl" : "text-[10px]"}`}
      style={{ backgroundColor: airline.color, color: airline.text ?? "#fff" }}
    >
      {airline.code}
    </span>
  );
}
