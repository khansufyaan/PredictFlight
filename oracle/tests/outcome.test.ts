import { describe, expect, it } from "vitest";
import { decideOutcome } from "../src/outcome.js";

const ARR = 1_800_000_000; // scheduled arrival
const GRACE = 15 * 60;
const REVIEW = 6 * 3600;

const decide = (
  phase: "scheduled" | "active" | "landed" | "cancelled" | "diverted" | "unknown",
  touchdown: number | undefined,
  now = ARR,
) => decideOutcome({ phase, actualTouchdown: touchdown } as any, ARR, now, GRACE, REVIEW);

describe("settlement rulebook", () => {
  it("landing exactly at the grace boundary is ON_TIME", () => {
    expect(decide("landed", ARR + GRACE)).toEqual({
      action: "resolve",
      outcome: "ON_TIME",
      touchdown: ARR + GRACE,
    });
  });

  it("one second past grace is LATE", () => {
    expect(decide("landed", ARR + GRACE + 1)).toMatchObject({ outcome: "LATE" });
  });

  it("early landing is ON_TIME", () => {
    expect(decide("landed", ARR - 1200)).toMatchObject({ outcome: "ON_TIME" });
  });

  it("cancellation VOIDs regardless of time", () => {
    expect(decide("cancelled", undefined)).toEqual({
      action: "resolve",
      outcome: "VOID",
      touchdown: 0,
    });
  });

  it("diversion is LATE even if it touched down early somewhere else", () => {
    expect(decide("diverted", ARR - 3600)).toMatchObject({ outcome: "LATE" });
  });

  it("no data yet -> wait, never auto-resolve", () => {
    expect(decide("active", undefined)).toEqual({ action: "wait" });
    expect(decide("unknown", undefined)).toEqual({ action: "wait" });
  });

  it("no data long past arrival -> flag for human review", () => {
    expect(decide("unknown", undefined, ARR + REVIEW + 1)).toEqual({ action: "review" });
  });

  it("landed without touchdown timestamp -> wait (bad feed data must not settle)", () => {
    expect(decide("landed", undefined)).toEqual({ action: "wait" });
  });
});
