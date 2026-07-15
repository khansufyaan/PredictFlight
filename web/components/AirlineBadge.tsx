"use client";

import { useState } from "react";
import type { Airline } from "@/lib/airlines";

/** Official carrier logo (CDN) with a brand-color code badge as fallback. */
export function AirlineBadge({ airline, size = "sm" }: { airline: Airline; size?: "sm" | "lg" }) {
  const [broken, setBroken] = useState(false);
  const box = size === "lg" ? "h-12 w-12 rounded-xl" : "h-6 w-6 rounded-md";

  if (!broken && airline.key !== "other") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://images.kiwi.com/airlines/64/${airline.code}.png`}
        alt={`${airline.name} logo`}
        className={`${box} shrink-0 bg-white object-contain p-1 shadow`}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span
      className={`${box} flex shrink-0 items-center justify-center text-[10px] font-bold shadow ${size === "lg" ? "text-base" : ""}`}
      style={{ backgroundColor: airline.color, color: airline.text ?? "#fff" }}
    >
      {airline.code}
    </span>
  );
}
