"use client";

import Link from "next/link";
import type { Market } from "@/lib/api";
import { airlineOf } from "@/lib/airlines";
import { dateShort, hhmm, usdc } from "@/lib/format";
import { AirlineBadge } from "./AirlineBadge";
import { FlipCountdown } from "./FlipCountdown";
import { OddsBar } from "./OddsBar";

const statusColor: Record<string, string> = {
  OPEN: "text-board-green",
  LOCKED: "text-board-amber",
  RESOLVED: "text-board-dim",
};

const GRACE = 15 * 60;

export function MarketCard({ market }: { market: Market }) {
  const airline = airlineOf(market.flightNumber);
  const deadline = market.scheduledArrival + GRACE;
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
        <span className={`flap text-[10px] ${statusColor[market.status] ?? ""}`}>
          {market.status === "RESOLVED" ? market.outcome.replace("_", " ") : market.status}
        </span>
      </div>

      <div className="flap mt-3 text-center text-3xl font-extrabold tracking-[0.2em] text-white">
        {market.origin} <span className="text-board-amber">→</span> {market.destination}
      </div>

      <div className="mt-2 text-center text-sm font-bold text-board-amber">
        Will it land by {hhmm(deadline)}?
      </div>
      <div className="mt-0.5 text-center text-[11px] text-board-dim">
        {dateShort(market.scheduledDeparture)} · scheduled to arrive {hhmm(market.scheduledArrival)}{" "}
        + 15 min grace
      </div>

      <div className="mt-3">
        <OddsBar onTimeProb={market.impliedOnTimeProb} />
      </div>
      {market.status === "OPEN" && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <span className="btn-green pointer-events-none flex flex-col items-center !py-1.5 text-center">
              <span>Yes · on time</span>
              <span className="text-[9px] font-normal normal-case tracking-normal opacity-80">
                lands by {hhmm(deadline)} · ${usdc(market.onTimePool)} pool
              </span>
            </span>
            <span className="btn-red pointer-events-none flex flex-col items-center !py-1.5 text-center">
              <span>No · late</span>
              <span className="text-[9px] font-normal normal-case tracking-normal opacity-80">
                after {hhmm(deadline)} · ${usdc(market.latePool)} pool
              </span>
            </span>
          </div>
          <div className="mt-3 flex flex-col items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-board-dim">
              betting closes in
            </span>
            <FlipCountdown to={market.scheduledDeparture} doneLabel="moments" />
          </div>
        </>
      )}
    </Link>
  );
}
