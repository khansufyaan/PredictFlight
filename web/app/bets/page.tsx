"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAccount } from "wagmi";
import { api } from "@/lib/api";
import { airlineOf } from "@/lib/airlines";
import { AirlineBadge } from "@/components/AirlineBadge";
import { ClaimPanel } from "@/components/ClaimPanel";
import { ConnectButton } from "@/components/ConnectButton";
import { dateShort, hhmm, usdc } from "@/lib/format";

export default function MyBetsPage() {
  const { address, isConnected } = useAccount();
  const { data: positions } = useQuery({
    queryKey: ["myPositions", address],
    queryFn: () => api.myPositions(address!),
    enabled: !!address,
  });

  if (!isConnected) {
    return (
      <div className="board-card flex flex-col items-center gap-4 p-8 text-center">
        <p className="text-sm text-board-dim">Connect your wallet to see your predictions.</p>
        <ConnectButton />
      </div>
    );
  }

  const active = (positions ?? []).filter((p) => p.market.status !== "RESOLVED");
  const settled = (positions ?? []).filter((p) => p.market.status === "RESOLVED");

  const row = (p: NonNullable<typeof positions>[number]) => {
    const m = p.market;
    const airline = airlineOf(m.flightNumber);
    return (
      <div key={m.id} className="board-card border-l-4 p-4" style={{ borderLeftColor: airline.color }}>
        <Link href={`/market/${m.id}`} className="block">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <AirlineBadge airline={airline} />
              <span className="flap text-base font-bold text-board-amber">{m.flightNumber}</span>
            </span>
            <span className="flap text-xs text-board-dim">
              {m.origin} → {m.destination}
            </span>
            <span className="flap text-[10px] text-board-dim">
              {m.status === "RESOLVED" ? m.outcome.replace("_", " ") : m.status}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px]">
            <span className="text-board-dim">
              {dateShort(m.scheduledDeparture)} · arrives {hhmm(m.scheduledArrival)}
            </span>
            <span>
              {BigInt(p.onTime) > 0n && (
                <span className="text-board-green">${usdc(p.onTime, 2)} on ON TIME </span>
              )}
              {BigInt(p.late) > 0n && <span className="text-board-red">${usdc(p.late, 2)} on LATE</span>}
            </span>
          </div>
        </Link>
        {m.status === "RESOLVED" && (
          <div className="mt-3">
            <ClaimPanel market={m} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-7">
      <h1 className="flap text-2xl font-extrabold text-board-amber">My predictions</h1>

      <section>
        <h2 className="flap mb-3 border-b border-board-line pb-1 text-xs text-board-amber">
          In play
        </h2>
        <div className="space-y-3">{active.map(row)}</div>
        {active.length === 0 && (
          <p className="text-center text-xs text-board-dim">
            No live predictions.{" "}
            <Link href="/" className="text-board-sky underline">
              Pick a flight →
            </Link>
          </p>
        )}
      </section>

      <section>
        <h2 className="flap mb-3 border-b border-board-line pb-1 text-xs text-board-amber">
          Settled — claim your winnings
        </h2>
        <div className="space-y-3">{settled.map(row)}</div>
        {settled.length === 0 && (
          <p className="text-center text-xs text-board-dim">Nothing settled yet.</p>
        )}
      </section>
    </div>
  );
}
