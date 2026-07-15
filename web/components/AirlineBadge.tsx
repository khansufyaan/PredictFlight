"use client";

import { useState } from "react";
import { logoUrl, type Airline } from "@/lib/airlines";

/** Official carrier logo (gstatic flight logos) with a brand-color code badge
 *  as fallback. `lg` fills its square tile edge-to-edge. */
export function AirlineBadge({ airline, size = "sm" }: { airline: Airline; size?: "sm" | "lg" }) {
  const [broken, setBroken] = useState(false);
  const box = size === "lg" ? "h-16 w-16 rounded-xl p-1.5" : "h-7 w-7 rounded-md p-0.5";

  if (!broken && airline.key !== "other") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl(airline.code)}
        alt={`${airline.name} logo`}
        className={`${box} shrink-0 bg-white object-contain shadow`}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span
      className={`${box} flex shrink-0 items-center justify-center font-bold shadow ${size === "lg" ? "text-xl" : "text-[10px]"}`}
      style={{ backgroundColor: airline.color, color: airline.text ?? "#fff" }}
    >
      {airline.code}
    </span>
  );
}
