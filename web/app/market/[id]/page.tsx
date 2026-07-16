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
import { OnTimeHint } from "@/components/OnTimeHint";
import { WeatherChip } from "@/components/WeatherChip";

export default function MarketPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAccount();
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null);

  const { data: m, error } = useQuery({ queryKey: ["market", id], queryFn: () => api.market(id) });
  const { data: pos } = useQuery({
    queryKey: ["position", id, address],
    queryFn: () => api.position(id, address!),
    enabled: !!address,
  });

  if (error != null) return <p className="text-sm text-board-red">Market not found (or API down).</p>;
  if (!m) return <p className="text-sm text-board-dim">loading…</p>;

  // Your challenge side is simply the side you're on (or "on time" if you
  // haven't bet yet) — the friend who opens the link takes the other side.
  const mySide: "ON_TIME" | "LATE" =
    pos && BigInt(pos.late) > BigInt(pos.onTime) ? "LATE" : "ON_TIME";

  const makeChallenge = async () => {
    if (!address) return;
    const { code } = await api.createChallenge(m.id, mySide, address);
    setChallengeUrl(`${window.location.origin}/challenge/${code}`);
  };

  const tweetHref = challengeUrl
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        `I say ${m.flightNumber} ${m.origin}→${m.destination} lands ${
          mySide === "ON_TIME" ? "on time" : "late"
        }. Think I'm wrong? Take the other side:`,
      )}&url=${encodeURIComponent(challengeUrl)}`
    : "";

  const hasPosition = pos && (BigInt(pos.onTime) > 0n || BigInt(pos.late) > 0n);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-2.5">
      {/* flight + route + status — everything you need to read the bet */}
      <div className="board-card p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="flap text-xl font-bold text-board-amber">{m.flightNumber}</span>
          <span className="flap text-board-dim">{dateShort(m.scheduledDeparture)}</span>
        </div>
        <div className="mt-1">
          <FlightArc
            origin={m.origin}
            destination={m.destination}
            departure={m.scheduledDeparture}
            arrival={m.scheduledArrival}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <OnTimeHint market={m} compact />
          <WeatherChip airport={m.destination} at={m.scheduledArrival} />
        </div>
        <div className="mt-2.5">
          <OddsBar onTimeProb={m.impliedOnTimeProb} />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-board-dim">
          <span>pool ${usdc(m.onTimePool)} / ${usdc(m.latePool)}</span>
          {m.status === "OPEN" && (
            <span className="text-board-green">
              closes in <Countdown to={m.scheduledDeparture} doneLabel="now" />
            </span>
          )}
          {m.status === "LOCKED" && <span className="flap text-board-amber">IN FLIGHT — LOCKED</span>}
          {m.status === "RESOLVED" && (
            <span className="flap">
              <b
                className={
                  m.outcome === "ON_TIME"
                    ? "text-board-green"
                    : m.outcome === "LATE"
                      ? "text-board-red"
                      : "text-board-dim"
                }
              >
                {m.outcome.replace("_", " ")}
              </b>
            </span>
          )}
        </div>
      </div>

      {hasPosition && (
        <div className="board-card flex items-center justify-between p-2.5 text-xs">
          <span className="flap text-board-dim">Your bet</span>
          <span>
            {BigInt(pos!.onTime) > 0n && (
              <span className="text-board-green">${usdc(pos!.onTime, 2)} yes </span>
            )}
            {BigInt(pos!.late) > 0n && <span className="text-board-red">${usdc(pos!.late, 2)} no</span>}
          </span>
        </div>
      )}

      {m.status === "OPEN" && <DepositForm marketId={m.id} deadline={m.scheduledArrival + 900} />}
      <ClaimPanel market={m} />

      {/* secondary actions tucked into disclosures so the page stays one screen */}
      {m.status === "OPEN" && address && (
        <details className="board-card p-3 text-xs [&_summary]:cursor-pointer">
          <summary className="flap text-board-dim">Challenge a friend</summary>
          <p className="mt-2 text-[11px] text-board-dim">
            You&apos;re saying <b className={mySide === "ON_TIME" ? "text-board-green" : "text-board-red"}>
              {mySide === "ON_TIME" ? "it lands on time" : "it'll be late"}
            </b>{" "}
            — whoever opens your link takes the other side.
          </p>
          {!challengeUrl ? (
            <button className="btn-amber mt-2 w-full" onClick={makeChallenge}>
              Create challenge link
            </button>
          ) : (
            <>
              <div className="mt-2 break-all rounded bg-board-bg p-2 text-[11px] text-board-amber">
                {challengeUrl}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  className="btn-amber !text-[11px]"
                  onClick={() => navigator.clipboard.writeText(challengeUrl)}
                >
                  Copy link
                </button>
                <a
                  href={tweetHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn !text-[11px] border border-board-line bg-white/10 text-center text-white hover:bg-white/20"
                >
                  Post on 𝕏
                </a>
              </div>
            </>
          )}
        </details>
      )}

      {m.matchups.length > 0 && (
        <details className="board-card p-3 text-xs [&_summary]:cursor-pointer">
          <summary className="flap text-board-dim">Head-to-head ({m.matchups.length})</summary>
          <div className="mt-2">
            {m.matchups.map((h) => (
              <div
                key={h.code}
                className="flex items-center justify-between border-b border-board-line py-1 last:border-0"
              >
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
        </details>
      )}
    </div>
  );
}
