"use client";

import { useState } from "react";
import { localLogoUrl, logoUrl, type Airline } from "@/lib/airlines";

/** Carrier logo with graceful degradation: 300px CDN mark → committed local
 *  copy → brand-color code badge. `fill` stretches to its parent square. */
export function AirlineBadge({
  airline,
  size = "sm",
}: {
  airline: Airline;
  size?: "sm" | "fill";
}) {
  // 0 = remote CDN, 1 = self-hosted backup, 2 = color badge
  const [stage, setStage] = useState(0);
  const box = size === "fill" ? "aspect-square w-full rounded-lg p-1" : "h-7 w-7 rounded-md p-0.5";

  if (stage < 2 && airline.key !== "other") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={stage === 0 ? logoUrl(airline.code) : localLogoUrl(airline.code)}
        alt={`${airline.name} logo`}
        className={`${box} shrink-0 bg-white object-contain shadow`}
        onError={() => setStage(stage + 1)}
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
