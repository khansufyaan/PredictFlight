import type { Market } from "@/lib/api";
import { EstimateBadge } from "./EstimateBadge";
import { TrackRecord } from "./TrackRecord";

/** The on-time chance for a market — real recent track record when the oracle
 *  has it, model estimate otherwise. `hero` renders it as the headline stat. */
export function OnTimeHint({
  market,
  compact,
  hero,
}: {
  market: Market;
  compact?: boolean;
  hero?: boolean;
}) {
  if (market.histOnTimePct != null && market.histSample) {
    return <TrackRecord market={market} compact={compact} hero={hero} />;
  }
  return (
    <EstimateBadge
      flightNumber={market.flightNumber}
      scheduledDeparture={market.scheduledDeparture}
      hero={hero}
    />
  );
}
