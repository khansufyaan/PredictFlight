"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { hhmm, dateShort, shortAddr } from "@/lib/format";
import { DepositForm } from "@/components/DepositForm";
import { OddsBar } from "@/components/OddsBar";

/* The recipient's page. Less is more: the side is already decided by the
 * challenge, so there is nothing to choose except the amount — everything
 * else is two plain sentences. */
export default function ChallengePage() {
  const { code } = useParams<{ code: string }>();
  const { data: ch, error } = useQuery({
    queryKey: ["challenge", code],
    queryFn: () => api.challenge(code),
  });

  if (error != null) return <p className="text-sm text-board-red">Challenge not found.</p>;
  if (!ch) return <p className="text-sm text-board-dim">loading…</p>;

  const m = ch.market;
  const takerSide = ch.oppositeSide === "ON_TIME" ? 0 : (1 as const);
  const deadline = m.scheduledArrival + 900; // scheduled arrival + 15 min grace
  const hasPool = BigInt(m.onTimePool) + BigInt(m.latePool) > 0n;
  const theirs = ch.side === "ON_TIME";

  return (
    <div className="mx-auto max-w-sm space-y-2.5 pt-2">
      <div className="board-card p-6 text-center">
        <div className="flap text-[10px] text-board-dim">Challenge</div>
        <div className="flap mt-3 text-3xl font-bold text-board-amber">{m.flightNumber}</div>
        <div className="mt-1 text-sm text-board-dim">
          {m.origin} → {m.destination} · {dateShort(m.scheduledDeparture)}, {hhmm(m.scheduledDeparture)}
        </div>

        <div className="mx-auto mt-6 max-w-[280px] space-y-2 text-sm leading-relaxed">
          <p className="text-board-dim">
            <span className="text-white">{shortAddr(ch.creator)}</span> says it{" "}
            <b className={theirs ? "text-board-green" : "text-board-red"}>
              {theirs ? "lands on time" : "will be late"}
            </b>
            .
          </p>
          <p className="text-board-dim">
            You&apos;re predicting it{" "}
            <b className={theirs ? "text-board-red" : "text-board-green"}>
              {theirs ? `lands after ${hhmm(deadline)}` : `lands by ${hhmm(deadline)}`}
            </b>
            .
          </p>
        </div>

        {/* live odds only when there's actually money in the pool — an empty
            50/50 bar says nothing */}
        {hasPool && (
          <div className="mt-6">
            <OddsBar onTimeProb={m.impliedOnTimeProb} />
          </div>
        )}
      </div>

      {ch.acceptor ? (
        <div className="board-card p-5 text-center text-sm text-board-dim">
          Already accepted by {shortAddr(ch.acceptor)}.{" "}
          <Link className="text-board-amber underline" href={`/market/${m.id}`}>
            View the market →
          </Link>
        </div>
      ) : m.status !== "OPEN" ? (
        <div className="board-card p-5 text-center text-sm text-board-dim">
          This market is already {m.status.toLowerCase()} — too late to take the other side.
        </div>
      ) : (
        <DepositForm
          marketId={m.id}
          deadline={deadline}
          defaultSide={takerSide}
          lockSide
          minimal
          challengeCode={ch.code}
        />
      )}

      <div className="text-center">
        <Link className="text-xs text-board-dim underline" href={`/market/${m.id}`}>
          full market page
        </Link>
      </div>
    </div>
  );
}
