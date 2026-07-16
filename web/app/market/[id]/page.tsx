"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import { api } from "@/lib/api";
import { dateShort, hhmm, shortAddr, usdc } from "@/lib/format";
import { ClaimPanel } from "@/components/ClaimPanel";
import { Countdown } from "@/components/Countdown";
import { DepositForm } from "@/components/DepositForm";
import { FlightArc } from "@/components/FlightArc";
import { OddsBar } from "@/components/OddsBar";
import { OddsChart } from "@/components/OddsChart";
import { TrackRecord } from "@/components/TrackRecord";
import { WeatherChip } from "@/components/WeatherChip";

export default function MarketPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAccount();
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null);
  const [challengeSide, setChallengeSide] = useState<"ON_TIME" | "LATE">("ON_TIME");

  const { data: m, error } = useQuery({ queryKey: ["market", id], queryFn: () => api.market(id) });
  const { data: pos } = useQuery({
    queryKey: ["position", id, address],
    queryFn: () => api.position(id, address!),
    enabled: !!address,
  });

  if (error != null) return <p className="text-sm text-board-red">Market not found (or API down).</p>;
  if (!m) return <p className="text-sm text-board-dim">loading…</p>;

  const makeChallenge = async () => {
    if (!address) return;
    const { code } = await api.createChallenge(m.id, challengeSide, address);
    setChallengeUrl(`${window.location.origin}/challenge/${code}`);
  };

  return (
    <div className="space-y-4">
      <div className="board-card p-4">
        <div className="flex items-baseline justify-between">
          <span className="flap text-2xl font-bold text-board-amber">{m.flightNumber}</span>
          <span className="flap text-xs text-board-dim">{dateShort(m.scheduledDeparture)}</span>
        </div>
        <div className="mt-3">
          <FlightArc
            origin={m.origin}
            destination={m.destination}
            departure={m.scheduledDeparture}
            arrival={m.scheduledArrival}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <TrackRecord market={m} compact />
          <WeatherChip airport={m.destination} at={m.scheduledArrival} />
        </div>
        <div className="mt-3">
          <OddsBar onTimeProb={m.impliedOnTimeProb} />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-board-dim">
          <span>pool ${usdc(m.onTimePool)} on time</span>
          <span>${usdc(m.latePool)} late</span>
        </div>
        <div className="mt-3 text-center text-xs">
          {m.status === "OPEN" && (
            <span className="text-board-green">
              betting closes in <Countdown to={m.scheduledDeparture} doneLabel="now" />
            </span>
          )}
          {m.status === "LOCKED" && <span className="text-board-amber flap">IN FLIGHT — POOLS LOCKED</span>}
          {m.status === "RESOLVED" && (
            <span className="flap text-board-dim">
              RESOLVED: <b className={m.outcome === "ON_TIME" ? "text-board-green" : m.outcome === "LATE" ? "text-board-red" : ""}>{m.outcome.replace("_", " ")}</b>
              {m.actualTouchdown && m.outcome !== "VOID"
                ? ` · touched down ${Math.round((m.actualTouchdown - m.scheduledArrival) / 60)}min ${m.actualTouchdown > m.scheduledArrival ? "after" : "before"} schedule`
                : ""}
            </span>
          )}
        </div>
      </div>

      <div className="board-card p-4">
        <div className="flap mb-2 text-xs text-board-dim">Implied on-time odds</div>
        {m.oddsHistory.length >= 2 ? (
          <OddsChart points={m.oddsHistory} />
        ) : (
          <div className="py-4 text-center text-xs text-board-dim">
            No bets yet — the pool opens at 50/50.
            {m.histOnTimePct != null && m.histSample ? (
              <span className="mt-1 block">
                History leans{" "}
                <b className={m.histOnTimePct >= 0.5 ? "text-board-green" : "text-board-red"}>
                  {Math.round(m.histOnTimePct * 100)}% on time
                </b>{" "}
                — early birds get the best odds.
              </span>
            ) : (
              <span className="mt-1 block">Early birds get the best odds.</span>
            )}
          </div>
        )}
      </div>

      {address && pos && (BigInt(pos.onTime) > 0n || BigInt(pos.late) > 0n) && (
        <div className="board-card p-4 text-sm">
          <div className="flap mb-1 text-xs text-board-dim">Your position</div>
          {BigInt(pos.onTime) > 0n && <div className="text-board-green">${usdc(pos.onTime, 2)} on ON TIME</div>}
          {BigInt(pos.late) > 0n && <div className="text-board-red">${usdc(pos.late, 2)} on LATE</div>}
        </div>
      )}

      {m.status === "OPEN" && <DepositForm marketId={m.id} deadline={m.scheduledArrival + 900} />}
      <ClaimPanel market={m} />

      {m.status === "OPEN" && address && (
        <div className="board-card p-4">
          <div className="flap mb-2 text-xs text-board-dim">Challenge a friend</div>
          <div className="flex gap-2">
            <button
              className={`btn-green flex-1 ${challengeSide === "ON_TIME" ? "ring-2 ring-board-green" : "opacity-60"}`}
              onClick={() => setChallengeSide("ON_TIME")}
            >
              I say on time
            </button>
            <button
              className={`btn-red flex-1 ${challengeSide === "LATE" ? "ring-2 ring-board-red" : "opacity-60"}`}
              onClick={() => setChallengeSide("LATE")}
            >
              I say late
            </button>
          </div>
          <button className="btn-amber mt-2 w-full" onClick={makeChallenge}>
            Create challenge link
          </button>
          {challengeUrl && (
            <div className="mt-2 break-all rounded bg-board-bg p-2 text-[11px] text-board-amber">
              {challengeUrl}
              <button
                className="ml-2 underline"
                onClick={() => navigator.clipboard.writeText(challengeUrl)}
              >
                copy
              </button>
            </div>
          )}
        </div>
      )}

      {m.matchups.length > 0 && (
        <div className="board-card p-4">
          <div className="flap mb-2 text-xs text-board-dim">Head-to-head matchups</div>
          {m.matchups.map((h) => (
            <div key={h.code} className="flex items-center justify-between border-b border-board-line py-1 text-xs last:border-0">
              <span className={h.side === "ON_TIME" ? "text-board-green" : "text-board-red"}>
                {shortAddr(h.creator)}
              </span>
              <span className="flap text-[9px] text-board-dim">VS</span>
              <span className={h.side === "ON_TIME" ? "text-board-red" : "text-board-green"}>
                {h.acceptor ? shortAddr(h.acceptor) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
