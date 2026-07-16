import type { FlightStatus } from "./providers/types.js";

export type Decision =
  | { action: "resolve"; outcome: "ON_TIME" | "LATE" | "VOID"; touchdown: number }
  | { action: "wait" }
  | { action: "review" };

/**
 * The settlement rulebook, as a pure function so it can be unit-tested:
 *  - cancelled            -> VOID (full refunds)
 *  - diverted w/ touchdown -> LATE
 *  - landed               -> ON_TIME iff touchdown <= scheduled arrival + grace
 *  - no terminal data     -> wait; past the review deadline -> flag for review
 */
export function decideOutcome(
  status: Pick<FlightStatus, "phase" | "actualTouchdown">,
  scheduledArrival: number,
  now: number,
  onTimeThresholdSec: number,
  manualReviewAfterSec: number,
): Decision {
  if (status.phase === "cancelled") return { action: "resolve", outcome: "VOID", touchdown: 0 };
  if (status.phase === "diverted" && status.actualTouchdown)
    return { action: "resolve", outcome: "LATE", touchdown: status.actualTouchdown };
  if (status.phase === "landed" && status.actualTouchdown) {
    const onTime = status.actualTouchdown <= scheduledArrival + onTimeThresholdSec;
    return {
      action: "resolve",
      outcome: onTime ? "ON_TIME" : "LATE",
      touchdown: status.actualTouchdown,
    };
  }
  if (now > scheduledArrival + manualReviewAfterSec) return { action: "review" };
  return { action: "wait" };
}
