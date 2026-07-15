import type { Airline } from "@/lib/airlines";

/** Brand-color carrier badge (deliberately not the trademarked logo). */
export function AirlineBadge({ airline, size = "sm" }: { airline: Airline; size?: "sm" | "lg" }) {
  const box = size === "lg" ? "h-10 w-10 text-base rounded-lg" : "h-6 w-6 text-[10px] rounded";
  return (
    <span
      className={`${box} flex shrink-0 items-center justify-center font-bold shadow`}
      style={{ backgroundColor: airline.color, color: airline.text ?? "#fff" }}
    >
      {airline.code}
    </span>
  );
}
