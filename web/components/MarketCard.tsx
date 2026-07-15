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

export function MarketCard({ market }: { market: Market }) {
  const airline = airlineOf(market.flightNumber);
  const pools = `$${usdc(market.onTimePool)} / $${usdc(market.latePool)}`;
  return (
    <Link
      href={`/market/${market.id}`}
      className="board-card block border-l-4 p-4 hover:border-board-amber/60"
      style={{ borderLeftColor: airline.color }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-2">
          <AirlineBadge airline={airline} />
          <span className="flap text-lg font-bold text-board-amber">{market.flightNumber}</span>
        </span>
        <span className="flap text-sm">
          {market.origin} → {market.destination}
        </span>
        <span className={`flap text-[10px] ${statusColor[market.status] ?? ""}`}>
          {market.status === "RESOLVED" ? market.outcome.replace("_", " ") : market.status}
        </span>
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-board-dim">
        <span>
          {dateShort(market.scheduledDeparture)} {hhmm(market.scheduledDeparture)} dep
        </span>
        <span>pools {pools}</span>
      </div>
      <div className="mt-3">
        <OddsBar onTimeProb={market.impliedOnTimeProb} />
      </div>
      {market.status === "OPEN" && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <span className="btn-green pointer-events-none text-center">
              On time · ${usdc(market.onTimePool)}
            </span>
            <span className="btn-red pointer-events-none text-center">
              Late · ${usdc(market.latePool)}
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-board-dim">
            closes in <FlipCountdown to={market.scheduledDeparture} doneLabel="moments" />
          </div>
        </>
      )}
    </Link>
  );
}
