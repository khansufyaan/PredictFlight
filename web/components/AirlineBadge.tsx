"use client";

import { useState } from "react";
import { logoUrl, type Airline } from "@/lib/airlines";

/** Carrier logo on a white tile with a thin ring, falling back to a
 *  brand-color code badge if the image is missing. `fill` stretches to its
 *  parent square. Logos are self-hosted 512px marks with their own internal
 *  padding, so the tile itself adds only a hairline of white. */
export function AirlineBadge({
  airline,
  size = "sm",
}: {
  airline: Airline;
  size?: "sm" | "fill";
}) {
  const [broken, setBroken] = useState(false);
  const box = size === "fill" ? "aspect-square w-full rounded-lg p-0.5" : "h-7 w-7 rounded-md p-px";

  if (!broken && airline.key !== "other") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl(airline.code)}
        alt={`${airline.name} logo`}
        className={`${box} shrink-0 bg-white object-contain shadow-sm`}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span
      className={`${box} flex shrink-0 items-center justify-center font-bold shadow-sm ${size === "fill" ? "text-2xl" : "text-[10px]"}`}
      style={{ backgroundColor: airline.color, color: airline.text ?? "#fff" }}
    >
      {airline.code}
    </span>
  );
}
