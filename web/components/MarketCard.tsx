"use client";

import Link from "next/link";
import type { Market } from "@/lib/api";
import { dateShort, hhmm, usdc } from "@/lib/format";
import { Countdown } from "./Countdown";
import { OddsBar } from "./OddsBar";

const statusColor: Record<string, string> = {
  OPEN: "text-board-green",
  LOCKED: "text-board-amber",
  RESOLVED: "text-board-dim",
};

export function MarketCard({ market }: { market: Market }) {
  const pools = `$${usdc(market.onTimePool)} / $${usdc(market.latePool)}`;
  return (
    <Link href={`/market/${market.id}`} className="board-card block p-4 hover:border-board-amber/60">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flap text-lg font-bold text-board-amber">{market.flightNumber}</span>
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
        {market.status === "OPEN" ? (
          <span>
            locks in <Countdown to={market.scheduledDeparture} doneLabel="locking…" />
          </span>
        ) : (
          <span>pools {pools}</span>
        )}
      </div>
      <div className="mt-3">
        <OddsBar onTimeProb={market.impliedOnTimeProb} />
      </div>
      {market.status === "OPEN" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <span className="btn-green pointer-events-none text-center">On time · ${usdc(market.onTimePool)}</span>
          <span className="btn-red pointer-events-none text-center">Late · ${usdc(market.latePool)}</span>
        </div>
      )}
    </Link>
  );
}
