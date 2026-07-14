import { createHash } from "node:crypto";
import type { Route } from "../routes20.js";
import { config } from "../config.js";
import type { FlightDataProvider, FlightStatus, ScheduledFlight } from "./types.js";

function h32(s: string): number {
  return createHash("sha256").update(s).digest().readUInt32BE(0);
}

/**
 * Deterministic fake flight data for local dev and the demo.
 *
 * Flights "depart" MOCK_DEPARTS_IN_SEC after listing and "fly" for
 * MOCK_FLIGHT_DURATION_SEC of wall-clock time, so the full market lifecycle
 * (open -> locked -> landed -> resolved) runs in minutes. The *reported*
 * touchdown delay is measured in real minutes against the scheduled arrival,
 * so the ON_TIME/LATE rule behaves exactly as in production.
 *
 * Outcome per flight is a pure function of the flight key:
 *   ~62% on time, ~28% late, ~6% cancelled, ~4% diverted.
 * MOCK_FORCE_OUTCOME overrides this for scripted demos.
 */
export class MockProvider implements FlightDataProvider {
  readonly name = "mock";

  async listFlights(routes: Route[], dateISO: string): Promise<ScheduledFlight[]> {
    const now = Math.floor(Date.now() / 1000);
    return routes.map((r, i) => {
      const dep = now + config.mockDepartsInSec + i; // stagger so ids differ
      const arr = dep + config.mockFlightDurationSec;
      const flightKey = `${r.flightNumber}|${r.origin}|${r.destination}|${dateISO}|${dep}`;
      return {
        flightKey,
        flightNumber: r.flightNumber,
        origin: r.origin,
        destination: r.destination,
        scheduledDeparture: dep,
        scheduledArrival: arr,
      };
    });
  }

  fate(flightKey: string): { kind: "ON_TIME" | "LATE" | "CANCELLED" | "DIVERTED"; delayMin: number } {
    if (config.mockForceOutcome) {
      const kind = config.mockForceOutcome;
      return { kind, delayMin: kind === "LATE" ? 47 : 3 };
    }
    const r = h32(flightKey) % 100;
    if (r < 62) return { kind: "ON_TIME", delayMin: h32(flightKey + "d") % 15 };
    if (r < 90) return { kind: "LATE", delayMin: 16 + (h32(flightKey + "d") % 120) };
    if (r < 96) return { kind: "CANCELLED", delayMin: 0 };
    return { kind: "DIVERTED", delayMin: 30 };
  }

  async getStatus(flight: ScheduledFlight): Promise<FlightStatus> {
    const now = Math.floor(Date.now() / 1000);
    const fate = this.fate(flight.flightKey);

    if (fate.kind === "CANCELLED") {
      // cancellation becomes known at departure time
      return now >= flight.scheduledDeparture ? { phase: "cancelled" } : { phase: "scheduled" };
    }
    if (now < flight.scheduledDeparture) return { phase: "scheduled" };
    // wall-clock flight time is the accelerated duration; delay is reported in real minutes
    const landsAtWallClock = flight.scheduledArrival; // accelerated: lands right at scheduled arrival tick
    if (now < landsAtWallClock) return { phase: "active" };

    const touchdown = flight.scheduledArrival + fate.delayMin * 60;
    if (fate.kind === "DIVERTED") {
      return { phase: "diverted", actualTouchdown: touchdown, actualDestination: "ALT" };
    }
    return { phase: "landed", actualTouchdown: touchdown, actualDestination: flight.destination };
  }
}
