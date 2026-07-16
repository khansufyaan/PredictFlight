import type { Route } from "../routes20.js";

/** A flight the ingestion job wants to create a market for. */
export interface ScheduledFlight {
  /** Canonical key, e.g. "UA415|SFO|LAX|2026-07-20T14:30Z". Hashed to bytes32 on-chain. */
  flightKey: string;
  flightNumber: string;
  origin: string;
  destination: string;
  scheduledDeparture: number; // epoch seconds
  scheduledArrival: number; // epoch seconds
}

export type FlightPhase =
  | "scheduled"
  | "active"
  | "landed"
  | "cancelled"
  | "diverted"
  | "unknown";

export interface FlightStatus {
  phase: FlightPhase;
  /** epoch seconds, present when phase is landed or diverted */
  actualTouchdown?: number;
  /** where it actually landed (diversion detection) */
  actualDestination?: string;
}

/** Recent track record of a flight number — the betting hint shown to users. */
export interface FlightHistory {
  /** 0..1 share of recent runs that arrived within the 15-min grace */
  onTimePct: number;
  /** how many completed runs the pct is based on */
  sample: number;
  /** mean arrival delay in minutes across those runs (negative = early) */
  avgDelayMin: number;
}

/**
 * All flight data flows through this interface. Settlement logic depends only
 * on ScheduledFlight/FlightStatus, so new providers (OpenSkyProvider,
 * SwimProvider, ...) drop in without touching it.
 */
export interface FlightDataProvider {
  readonly name: string;
  /** Flights for the given routes departing on dateISO (YYYY-MM-DD, UTC). */
  listFlights(routes: Route[], dateISO: string): Promise<ScheduledFlight[]>;
  /** Current status of a previously listed flight. */
  getStatus(flight: ScheduledFlight): Promise<FlightStatus>;
  /** Recent on-time record for a flight number; null when unknown. */
  getHistory(flightNumber: string): Promise<FlightHistory | null>;
}
