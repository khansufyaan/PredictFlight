import type { Market } from "@/lib/api";
import { EstimateBadge } from "./EstimateBadge";
import { TrackRecord } from "./TrackRecord";

/** One on-time hint per market, always something to go on:
 *  - real recent track record for this flight number when the oracle has it,
 *  - otherwise a labeled statistical estimate (airline record + departure hour).
 *  Neither is a guarantee; both keep a fresh market from being a blank 50/50. */
export function OnTimeHint({
  market,
  compact,
  size,
}: {
  market: Market;
  compact?: boolean;
  size?: "sm" | "lg";
}) {
  if (market.histOnTimePct != null && market.histSample) {
    return <TrackRecord market={market} compact={compact} />;
  }
  return (
    <EstimateBadge
      flightNumber={market.flightNumber}
      scheduledDeparture={market.scheduledDeparture}
      size={size}
    />
  );
}
