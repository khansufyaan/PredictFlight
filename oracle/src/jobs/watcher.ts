import { config } from "../config.js";
import { db } from "../db.js";
import { decideOutcome } from "../outcome.js";
import { getProvider } from "../providers/index.js";
import { resolveOnChain } from "../settlement.js";
import type { ScheduledFlight } from "../providers/types.js";

/**
 * Arrival watcher: for every market past its scheduled departure and not yet
 * resolved, poll the FlightDataProvider and settle when terminal:
 *  - landed:   touchdown <= scheduled arrival + 15min => ON_TIME, else LATE
 *  - diverted: LATE
 *  - cancelled: VOID
 *  - nothing by scheduled arrival + 6h: flag needsReview, never auto-resolve
 */
export async function runWatcher(): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const markets = await db.market.findMany({
    where: { status: { in: ["OPEN", "LOCKED"] }, scheduledDeparture: { lte: now } },
  });
  const provider = getProvider();

  for (const m of markets) {
    if (m.status === "OPEN") {
      await db.market.update({ where: { id: m.id }, data: { status: "LOCKED" } });
    }
    const flight: ScheduledFlight = {
      flightKey: m.flightKey,
      flightNumber: m.flightNumber,
      origin: m.origin,
      destination: m.destination,
      scheduledDeparture: m.scheduledDeparture,
      scheduledArrival: m.scheduledArrival,
    };

    try {
      const status = await provider.getStatus(flight);
      const decision = decideOutcome(
        status,
        m.scheduledArrival,
        now,
        config.onTimeThresholdSec,
        config.manualReviewAfterSec,
      );

      if (decision.action === "resolve") {
        await resolveOnChain(m.id, decision.outcome, decision.touchdown);
      } else if (decision.action === "review" && !m.needsReview) {
        console.warn(`[watcher] ${m.flightKey} has no data 6h past arrival — flagged for review`);
        await db.market.update({ where: { id: m.id }, data: { needsReview: true } });
      }
    } catch (err) {
      console.error(`[watcher] ${m.flightKey}:`, err);
    }
  }
}
