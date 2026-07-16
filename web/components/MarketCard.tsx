"use client";

import Link from "next/link";
import type { Market } from "@/lib/api";
import { airlineOf } from "@/lib/airlines";
import { hhmm } from "@/lib/format";
import { AirlineBadge } from "./AirlineBadge";
import { FlipCountdown } from "./FlipCountdown";
import { OddsBar } from "./OddsBar";
import { OnTimeHint } from "./OnTimeHint";

const statusColor: Record<string, string> = {
  LOCKED: "text-board-amber",
  RESOLVED: "text-board-dim",
};

const GRACE = 15 * 60;

/** One flight, one question, one number. The on-time chance is the alpha, so
 *  it gets the headline; everything else stays quiet. */
export function MarketCard({ market }: { market: Market }) {
  const airline = airlineOf(market.flightNumber);
  const deadline = market.scheduledArrival + GRACE;
  const hasPool = BigInt(market.onTimePool) + BigInt(market.latePool) > 0n;
  return (
    <Link
      href={`/market/${market.id}`}
      className="board-card block border-l-4 p-4 hover:border-board-amber/60"
      style={{ borderLeftColor: airline.color }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <AirlineBadge airline={airline} />
          <span className="flap text-base font-bold text-board-amber">{market.flightNumber}</span>
        </span>
        {/* OPEN is the default state — only exceptions earn a label */}
        {market.status !== "OPEN" && (
          <span className={`flap text-[10px] ${statusColor[market.status] ?? ""}`}>
            {market.status === "RESOLVED" ? market.outcome.replace("_", " ") : market.status}
          </span>
        )}
      </div>

      <div className="flap mt-3 text-center text-3xl font-extrabold tracking-[0.2em] text-white">
        {market.origin} <span className="text-board-amber">→</span> {market.destination}
      </div>

      <div className="mt-1.5 text-center text-sm text-board-dim">
        Will it land by <b className="text-board-amber">{hhmm(deadline)}</b>?
      </div>

      <div className="mt-4">
        <OnTimeHint market={market} hero />
      </div>

      {/* live market odds only once real money disagrees with the model */}
      {hasPool && (
        <div className="mt-4">
          <OddsBar onTimeProb={market.impliedOnTimeProb} />
        </div>
      )}

      {market.status === "OPEN" && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <span className="btn-green pointer-events-none text-center">Yes</span>
            <span className="btn-red pointer-events-none text-center">No</span>
          </div>
          <div className="mt-3 flex flex-col items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-board-dim">
              predictions close in
            </span>
            <FlipCountdown to={market.scheduledDeparture} doneLabel="moments" />
          </div>
        </>
      )}
    </Link>
  );
}
