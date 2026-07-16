import { airlineOf } from "./airlines";

/**
 * A transparent statistical PRIOR for how likely a flight lands on time —
 * never a guarantee, just a hint so a market with no bets yet isn't a blank
 * coin-flip. Two public, well-known signals:
 *
 *   1. the airline's arrival on-time track record (share of flights that reach
 *      the gate within ~15 min of schedule — recent DOT figures), and
 *   2. departure time of day: delays compound as the day goes on, so a 6am
 *      departure clears far more reliably than a 9pm one.
 *
 * It is deliberately simple and shown to users as an estimate, side by side
 * with the live market odds — not blended into them.
 */

// Airline on-time arrival base rate (fraction within 15 min of schedule).
const BASE: Record<string, number> = {
  united: 0.78,
  american: 0.77,
  delta: 0.83, // consistently the strongest US major
  southwest: 0.76,
  alaska: 0.79,
};

// Multiplier vs the airline's daily average, by scheduled departure hour.
// Peaks in the early morning, sags through the evening banks.
const HOUR_FACTOR = [
  0.92, 0.93, 0.95, 0.98, 1.02, 1.06, // 00–05
  1.08, 1.07, 1.05, 1.03, 1.01, 1.0, // 06–11
  0.99, 0.98, 0.96, 0.94, 0.92, 0.9, // 12–17
  0.88, 0.86, 0.85, 0.84, 0.86, 0.89, // 18–23
];

/** Estimated probability the flight lands on time, or null for carriers we
 *  don't have a base rate for. Uses the departure's local hour (matching how
 *  times are shown across the app). Clamped to a sane 0.50–0.92 band. */
export function estimateOnTimeProb(
  flightNumber: string,
  scheduledDeparture: number,
): number | null {
  const airline = airlineOf(flightNumber);
  const base = BASE[airline.key];
  if (base == null) return null;
  const hour = new Date(scheduledDeparture * 1000).getHours();
  const p = base * (HOUR_FACTOR[hour] ?? 1);
  return Math.max(0.5, Math.min(0.92, p));
}

/** One-line reason string for the estimate, e.g. for a tooltip. */
export function estimateReason(flightNumber: string, scheduledDeparture: number): string {
  const airline = airlineOf(flightNumber);
  const hour = new Date(scheduledDeparture * 1000).getHours();
  const slot = hour < 10 ? "early-day" : hour < 16 ? "midday" : "evening";
  return `Based on ${airline.name}'s on-time record and an ${slot} departure. An estimate, not a guarantee.`;
}
