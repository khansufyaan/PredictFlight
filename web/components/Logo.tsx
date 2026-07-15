const LETTERS = ["J", "E", "T", "L", "A", "G"] as const;

/**
 * Split-flap wordmark. The final tile renders mid-flip — the "G" is lagging,
 * which is the whole brand.
 */
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const tile =
    size === "lg"
      ? "h-12 w-9 text-2xl rounded-md"
      : "h-6 w-[18px] text-xs rounded";
  const suffix = size === "lg" ? "text-lg" : "text-xs";
  return (
    <span className="inline-flex items-end gap-[3px]" aria-label="Jetlag">
      {LETTERS.map((ch, i) => (
        <span
          key={i}
          className={`flap-tile ${tile} ${i === LETTERS.length - 1 ? "flap-lag" : ""}`}
        >
          {ch}
        </span>
      ))}
      <span className={`${suffix} pb-px font-bold text-board-dim`}>.fun</span>
    </span>
  );
}
