"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { airlineOf } from "@/lib/airlines";
import { AirlineBadge } from "@/components/AirlineBadge";
import { dateShort, hhmm, usdc } from "@/lib/format";

const outcomeStyle: Record<string, string> = {
  ON_TIME: "bg-board-green/15 text-board-green border-board-green/50",
  LATE: "bg-board-red/15 text-board-red border-board-red/50",
  VOID: "bg-board-line text-board-dim border-board-line",
};

export default function PastPage() {
  const { data: markets } = useQuery({ queryKey: ["markets"], queryFn: api.markets });
  const resolved = (markets ?? [])
    .filter((m) => m.status === "RESOLVED")
    .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0));

  return (
    <div>
      <h1 className="flap mb-1 text-sm font-bold text-board-amber">Landed — past flights</h1>
      <p className="mb-4 text-xs text-board-dim">
        Every result links to third-party flight tracking and the on-chain settlement transaction,
        so you can verify it yourself.
      </p>
      <div className="space-y-3">
        {resolved.map((m) => {
          const airline = airlineOf(m.flightNumber);
          const delayMin =
            m.actualTouchdown && m.outcome !== "VOID"
              ? Math.round((m.actualTouchdown - m.scheduledArrival) / 60)
              : null;
          return (
            <div key={m.id} className="board-card p-4">
              <div className="flex items-center gap-3">
                <AirlineBadge airline={airline} />
                <span className="flap text-base font-bold text-board-amber">{m.flightNumber}</span>
                <span className="flap flex-1 text-xs">
                  {m.origin} → {m.destination}
                </span>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${outcomeStyle[m.outcome] ?? ""}`}
                >
                  {m.outcome.replace("_", " ")}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-board-dim">
                <span>
                  {dateShort(m.scheduledDeparture)} · sched {hhmm(m.scheduledArrival)} arr
                  {delayMin !== null &&
                    ` · landed ${Math.abs(delayMin)}min ${delayMin > 0 ? "late" : "early"}`}
                  {m.outcome === "VOID" && " · cancelled, all refunded"}
                </span>
                <span>
                  pools ${usdc(m.onTimePool)} / ${usdc(m.latePool)}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <a
                  href={`https://www.flightaware.com/live/flight/${m.flightNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-amber flex-1 text-center !text-[10px] !normal-case"
                >
                  FlightAware proof ↗
                </a>
                {m.resolveTxHash && (
                  <a
                    href={`https://basescan.org/tx/${m.resolveTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn flex-1 border border-board-sky/50 bg-board-sky/10 text-center !text-[10px] !normal-case text-board-sky hover:bg-board-sky/25"
                  >
                    On-chain settlement ↗
                  </a>
                )}
              </div>
            </div>
          );
        })}
        {resolved.length === 0 && (
          <p className="py-8 text-center text-xs text-board-dim">
            No landed flights yet — the first markets resolve after tonight&apos;s arrivals.
          </p>
        )}
      </div>
    </div>
  );
}
